"""
Представления (Views) модуля «Планирование нагрузки».
Следуют правилу: ViewSet только вызывает сервисный слой и возвращает сериализованный Response.
"""

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from auth_app.permissions import IsHeadOrAdmin, IsTeacherOrAbove
from .models import Department, Discipline, StudyGroup, Teacher, Workload
from .serializers import (
    ConflictCheckRequestSerializer,
    ConflictCheckResponseSerializer,
    DepartmentSerializer,
    DisciplineSerializer,
    StudyGroupSerializer,
    TeacherDetailSerializer,
    TeacherListSerializer,
    WorkloadDetailSerializer,
    WorkloadListSerializer,
)
from .services import calculate_teacher_workload_stats, check_schedule_conflict


@extend_schema(tags=["Кафедры"])
class DepartmentViewSet(viewsets.ModelViewSet):
    """Управление кафедрами института."""

    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsHeadOrAdmin]


@extend_schema(tags=["Преподаватели"])
class TeacherViewSet(viewsets.ModelViewSet):
    """
    Управление и просмотр преподавателей кафедры.
    Преподаватели видят только свой профиль, заведующий и администратор — всех.
    """

    queryset = Teacher.objects.select_related("user", "department").all()
    permission_classes = [IsTeacherOrAbove]

    def get_serializer_class(self):
        if self.action == "list":
            return TeacherListSerializer
        return TeacherDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # Преподаватель видит только себя
        if user.is_authenticated and user.role == "teacher":
            return qs.filter(user=user)

        # Фильтры для завкафедрой / админа
        dept_id = self.request.query_params.get("department")
        if dept_id:
            qs = qs.filter(department_id=dept_id)

        return qs


@extend_schema(tags=["Учебные группы"])
class StudyGroupViewSet(viewsets.ModelViewSet):
    """Справочник академических учебных групп."""

    queryset = StudyGroup.objects.all()
    serializer_class = StudyGroupSerializer
    permission_classes = [IsTeacherOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        course = self.request.query_params.get("course")
        direction = self.request.query_params.get("direction_code")

        if course:
            qs = qs.filter(course=course)
        if direction:
            qs = qs.filter(direction_code=direction)

        return qs


@extend_schema(tags=["Дисциплины"])
class DisciplineViewSet(viewsets.ModelViewSet):
    """Справочник учебных дисциплин кафедры."""

    queryset = Discipline.objects.all()
    serializer_class = DisciplineSerializer
    permission_classes = [IsTeacherOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        lesson_type = self.request.query_params.get("lesson_type")
        if lesson_type:
            qs = qs.filter(lesson_type=lesson_type)
        return qs


@extend_schema(tags=["Учебная нагрузка"])
class WorkloadViewSet(viewsets.ModelViewSet):
    """
    CRUD учебной нагрузки кафедры.
    - Чтение: доступно всем авторизованным преподавателям (преподаватель видит только свои записи).
    - Создание/редактирование: доступно только завкафедрой и администратору.
    - Проверка коллизий: эндпоинт check-conflicts.
    """

    queryset = Workload.objects.select_related("teacher", "discipline", "group").all()

    def get_permissions(self):
        # На изменение данных право имеют только завкафедрой и администратор
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsHeadOrAdmin()]
        return [IsTeacherOrAbove()]

    def get_serializer_class(self):
        if self.action == "list":
            return WorkloadListSerializer
        return WorkloadDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # Преподаватель видит исключительно свои часы
        if user.is_authenticated and user.role == "teacher":
            qs = qs.filter(teacher__user=user)

        # Фильтры по параметрам запроса
        teacher_id = self.request.query_params.get("teacher")
        semester = self.request.query_params.get("semester")
        group_id = self.request.query_params.get("group")
        discipline_id = self.request.query_params.get("discipline")

        if teacher_id and (user.role in ("head", "admin") or user.is_superuser):
            qs = qs.filter(teacher_id=teacher_id)
        if semester:
            qs = qs.filter(semester=semester)
        if group_id:
            qs = qs.filter(group_id=group_id)
        if discipline_id:
            qs = qs.filter(discipline_id=discipline_id)

        return qs

    @extend_schema(
        summary="Проверка пересечений в расписании (коллизий)",
        description=(
            "Проверяет, нет ли накладок по времени (преподаватель в двух местах одновременно, "
            "занятая аудитория или параллельные пары у одной группы)."
        ),
        request=ConflictCheckRequestSerializer,
        responses={status.HTTP_200_OK: ConflictCheckResponseSerializer},
    )
    @action(detail=False, methods=["post"], url_path="check-conflicts")
    def check_conflicts(self, request):
        exclude_id = request.data.get("exclude_id")
        conflicts = check_schedule_conflict(request.data, exclude_id=exclude_id)
        serializer = WorkloadListSerializer(conflicts, many=True)
        return Response(
            {
                "has_conflicts": bool(conflicts),
                "conflicts_count": len(conflicts),
                "conflicts": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Статистика нагрузки преподавателя (план/факт/процент)",
        parameters=[
            OpenApiParameter(name="teacher_id", type=int, required=False, description="ID преподавателя"),
            OpenApiParameter(name="semester", type=str, required=False, description="Семестр (например, 2024-1)"),
        ],
    )
    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        teacher_id = request.query_params.get("teacher_id")
        semester = request.query_params.get("semester")

        # Если запрашивает преподаватель и не указал ID — берем его профиль
        if not teacher_id and request.user.role == "teacher":
            teacher_profile = getattr(request.user, "teacher_profile", None)
            if teacher_profile:
                teacher_id = teacher_profile.id

        if not teacher_id:
            return Response(
                {"error": "Параметр teacher_id обязателен для завкафедрой/администратора"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = calculate_teacher_workload_stats(int(teacher_id), semester=semester)
        return Response(data, status=status.HTTP_200_OK)
