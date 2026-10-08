"""
Представления (Views) модуля «Мониторинг успеваемости».
Следуют правилу: ViewSet только вызывает сервисный слой и возвращает сериализованный Response.
"""

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from auth_app.permissions import IsHeadOrAdmin, IsTeacherOrAbove
from .models import Grade, Student
from .serializers import (
    GradeDetailSerializer,
    GradeListSerializer,
    GradesDynamicsSerializer,
    RiskZoneStudentSerializer,
    StudentDetailSerializer,
    StudentListSerializer,
)
from .services import (
    get_grades_dynamics,
    get_quality_levels_distribution,
    get_risk_zone_students,
)


@extend_schema(tags=["Студенты"])
class StudentViewSet(viewsets.ModelViewSet):
    """
    Справочник студентов института.
    - Чтение доступно всем авторизованным преподавателям и руководству.
    - Создание/редактирование доступно завкафедрой и администраторам.
    """

    queryset = Student.objects.select_related("group").all()

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsHeadOrAdmin()]
        return [IsTeacherOrAbove()]

    def get_serializer_class(self):
        if self.action == "list":
            return StudentListSerializer
        return StudentDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        group_id = self.request.query_params.get("group")
        search = self.request.query_params.get("search")
        course = self.request.query_params.get("course")
        direction = self.request.query_params.get("direction")

        if group_id:
            qs = qs.filter(group_id=group_id)
        if search:
            qs = qs.filter(full_name__icontains=search)
        if course:
            qs = qs.filter(group__course=course)
        if direction:
            qs = qs.filter(group__direction_code=direction)
        is_risk = self.request.query_params.get("is_risk")
        if is_risk is not None and is_risk != "":
            from grades.services import RISK_THRESHOLD
            from django.db.models import Avg
            if is_risk.lower() in ["true", "1"]:
                risk_student_ids = (
                    Grade.objects.values("student")
                    .annotate(avg=Avg("grade"))
                    .filter(avg__lt=RISK_THRESHOLD)
                    .values_list("student_id", flat=True)
                )
                qs = qs.filter(id__in=risk_student_ids)

        return qs

    @extend_schema(
        tags=["Студенты"],
        summary="Профиль студента со сводкой успеваемости и оценками",
        description="Возвращает детальную информацию о студенте, группе, среднем балле, статусе риска и списке оценок.",
    )
    @action(detail=True, methods=["get"])
    def profile(self, request, pk=None):
        from django.db.models import Avg
        from grades.services import RISK_THRESHOLD, PASSING_GRADE
        student = self.get_object()
        grades_qs = Grade.objects.filter(student=student).select_related("discipline", "teacher").order_by("-date", "-id")

        avg_val = grades_qs.aggregate(avg=Avg("grade"))["avg"]
        avg_grade = round(float(avg_val), 2) if avg_val is not None else 0.0

        grades_list = [
            {
                "id": g.id,
                "discipline_name": g.discipline.name,
                "discipline_code": g.discipline.code,
                "grade": g.grade,
                "semester": g.semester,
                "date": g.date.isoformat() if g.date else None,
                "teacher_name": g.teacher.full_name if g.teacher else "—",
                "source": g.source,
                "source_display": g.get_source_display(),
            }
            for g in grades_qs
        ]

        failing_disciplines = [g["discipline_name"] for g in grades_list if g["grade"] < PASSING_GRADE]
        is_risk = (avg_grade > 0 and avg_grade < RISK_THRESHOLD) or len(failing_disciplines) > 0

        return Response({
            "id": student.id,
            "full_name": student.full_name,
            "email": student.email,
            "group_id": student.group.id if student.group else None,
            "group_name": student.group.name if student.group else "—",
            "course": student.group.course if student.group else None,
            "direction_code": student.group.direction_code if student.group else "",
            "direction_name": student.group.direction_name if student.group else "",
            "avg_grade": avg_grade,
            "grades_count": len(grades_list),
            "is_risk": is_risk,
            "failing_disciplines": list(set(failing_disciplines)),
            "grades": grades_list,
        })


def _safe_int(val):
    if val is None or val == "":
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _safe_float(val):
    if val is None or val == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


@extend_schema(tags=["Успеваемость и оценки"])
class GradeViewSet(viewsets.ModelViewSet):
    """
    Журнал академической успеваемости студентов:
    - Просмотр оценок с фильтрацией (группа, предмет, преподаватель, семестр, источник)
    - Автоматическое выявление студентов в «зоне риска» (< 3.0)
    - Динамика оценок по семестрам для линейного графика
    - Распределение по уровням качества для круговой диаграммы
    """

    queryset = Grade.objects.select_related("student__group", "discipline", "teacher").all()

    def get_permissions(self):
        if self.action in ["destroy"]:
            return [IsHeadOrAdmin()]
        return [IsTeacherOrAbove()]

    def get_serializer_class(self):
        if self.action == "list":
            return GradeListSerializer
        return GradeDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # Преподаватель видит оценки только по своим дисциплинам/занятиям
        if user.is_authenticated and user.role == "teacher":
            qs = qs.filter(teacher__user=user)

        # Фильтры query-параметров
        group_id = _safe_int(self.request.query_params.get("group"))
        discipline_id = _safe_int(self.request.query_params.get("discipline"))
        teacher_id = _safe_int(self.request.query_params.get("teacher"))
        semester = self.request.query_params.get("semester")
        source = self.request.query_params.get("source")
        min_grade = _safe_float(self.request.query_params.get("min_grade"))
        max_grade = _safe_float(self.request.query_params.get("max_grade"))

        if group_id:
            qs = qs.filter(student__group_id=group_id)
        if discipline_id:
            qs = qs.filter(discipline_id=discipline_id)
        if teacher_id and (user.role in ("head", "admin") or user.is_superuser):
            qs = qs.filter(teacher_id=teacher_id)
        if semester:
            qs = qs.filter(semester=semester)
        if source:
            qs = qs.filter(source=source)
        if min_grade is not None:
            qs = qs.filter(grade__gte=min_grade)
        if max_grade is not None:
            qs = qs.filter(grade__lte=max_grade)

        return qs

    @extend_schema(
        summary="Студенты в «зоне риска» (средний балл < 3.0)",
        description=(
            "Автоматически вычисляет средний балл студентов и отбирает тех, "
            "у кого показатель строго ниже порога RISK_THRESHOLD = 3.0. "
            "Возвращает средний балл и список несданных дисциплин."
        ),
        parameters=[
            OpenApiParameter(name="group", type=int, required=False, description="ID учебной группы"),
            OpenApiParameter(name="discipline", type=int, required=False, description="ID дисциплины"),
            OpenApiParameter(name="semester", type=str, required=False, description="Семестр (например, 2024-1)"),
        ],
        responses={status.HTTP_200_OK: RiskZoneStudentSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], url_path="risk-zone")
    def risk_zone(self, request):
        group_id = _safe_int(request.query_params.get("group"))
        discipline_id = _safe_int(request.query_params.get("discipline"))
        semester = request.query_params.get("semester")

        data = get_risk_zone_students(
            group_id=group_id,
            discipline_id=discipline_id,
            semester=semester,
        )
        serializer = RiskZoneStudentSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Динамика успеваемости по семестрам (для линейного графика)",
        description="Возвращает хронологию среднего балла и % положительных оценок по семестрам.",
        parameters=[
            OpenApiParameter(name="group", type=int, required=False, description="ID группы"),
            OpenApiParameter(name="discipline", type=int, required=False, description="ID дисциплины"),
            OpenApiParameter(name="teacher", type=int, required=False, description="ID преподавателя"),
        ],
        responses={status.HTTP_200_OK: GradesDynamicsSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], url_path="dynamics")
    def dynamics(self, request):
        group_id = _safe_int(request.query_params.get("group"))
        discipline_id = _safe_int(request.query_params.get("discipline"))
        teacher_id = _safe_int(request.query_params.get("teacher"))

        if not teacher_id and request.user.role == "teacher":
            teacher_profile = getattr(request.user, "teacher_profile", None)
            if teacher_profile:
                teacher_id = teacher_profile.id

        data = get_grades_dynamics(
            group_id=group_id,
            discipline_id=discipline_id,
            teacher_id=teacher_id,
        )
        serializer = GradesDynamicsSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Распределение уровней качества образования (для круговой диаграммы)",
        description="Количество и процент оценок: отлично, хорошо, удовл., неуд.",
        parameters=[
            OpenApiParameter(name="group", type=int, required=False, description="ID группы"),
            OpenApiParameter(name="semester", type=str, required=False, description="Семестр"),
        ],
    )
    @action(detail=False, methods=["get"], url_path="quality-levels")
    def quality_levels(self, request):
        group_id = _safe_int(request.query_params.get("group"))
        semester = request.query_params.get("semester")

        data = get_quality_levels_distribution(
            group_id=group_id,
            semester=semester,
        )
        return Response(data, status=status.HTTP_200_OK)
