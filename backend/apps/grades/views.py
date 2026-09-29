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

        if group_id:
            qs = qs.filter(group_id=group_id)
        if search:
            qs = qs.filter(full_name__icontains=search)

        return qs


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
        group_id = self.request.query_params.get("group")
        discipline_id = self.request.query_params.get("discipline")
        teacher_id = self.request.query_params.get("teacher")
        semester = self.request.query_params.get("semester")
        source = self.request.query_params.get("source")
        min_grade = self.request.query_params.get("min_grade")
        max_grade = self.request.query_params.get("max_grade")

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
        if min_grade:
            qs = qs.filter(grade__gte=float(min_grade))
        if max_grade:
            qs = qs.filter(grade__lte=float(max_grade))

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
        group_id = request.query_params.get("group")
        discipline_id = request.query_params.get("discipline")
        semester = request.query_params.get("semester")

        data = get_risk_zone_students(
            group_id=int(group_id) if group_id else None,
            discipline_id=int(discipline_id) if discipline_id else None,
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
        group_id = request.query_params.get("group")
        discipline_id = request.query_params.get("discipline")
        teacher_id = request.query_params.get("teacher")

        if not teacher_id and request.user.role == "teacher":
            teacher_profile = getattr(request.user, "teacher_profile", None)
            if teacher_profile:
                teacher_id = teacher_profile.id

        data = get_grades_dynamics(
            group_id=int(group_id) if group_id else None,
            discipline_id=int(discipline_id) if discipline_id else None,
            teacher_id=int(teacher_id) if teacher_id else None,
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
        group_id = request.query_params.get("group")
        semester = request.query_params.get("semester")

        data = get_quality_levels_distribution(
            group_id=int(group_id) if group_id else None,
            semester=semester,
        )
        return Response(data, status=status.HTTP_200_OK)
