"""
Сериализаторы модуля «Планирование нагрузки».
Соблюдают принцип: один сериализатор — одна задача (List / Detail).
"""

from rest_framework import serializers

from .models import Department, Discipline, StudyGroup, Teacher, Workload
from .services import check_schedule_conflict, describe_conflict_reason


class DepartmentSerializer(serializers.ModelSerializer):
    """Сериализатор кафедры."""

    class Meta:
        model = Department
        fields = [
            "id",
            "name",
            "code",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class TeacherListSerializer(serializers.ModelSerializer):
    """Облегчённый сериализатор для списков преподавателей."""

    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )
    user_username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    class Meta:
        model = Teacher
        fields = [
            "id",
            "user",
            "user_username",
            "department",
            "department_name",
            "full_name",
            "position",
            "hours_limit",
        ]


class TeacherDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор профиля преподавателя."""

    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )

    class Meta:
        model = Teacher
        fields = [
            "id",
            "user",
            "department",
            "department_name",
            "full_name",
            "position",
            "hours_limit",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class StudyGroupSerializer(serializers.ModelSerializer):
    """Сериализатор академической учебной группы."""

    class Meta:
        model = StudyGroup
        fields = [
            "id",
            "name",
            "direction_code",
            "direction_name",
            "course",
            "year",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class DisciplineSerializer(serializers.ModelSerializer):
    """Сериализатор учебной дисциплины."""

    lesson_type_display = serializers.CharField(
        source="get_lesson_type_display",
        read_only=True,
    )

    class Meta:
        model = Discipline
        fields = [
            "id",
            "name",
            "code",
            "total_hours",
            "lesson_type",
            "lesson_type_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class WorkloadListSerializer(serializers.ModelSerializer):
    """Облегчённый сериализатор для вывода таблицы нагрузки."""

    teacher_name = serializers.CharField(
        source="teacher.full_name",
        read_only=True,
    )
    discipline_name = serializers.CharField(
        source="discipline.name",
        read_only=True,
    )
    group_name = serializers.CharField(
        source="group.name",
        read_only=True,
    )
    day_name = serializers.CharField(
        source="get_day_of_week_display",
        read_only=True,
    )
    lesson_name = serializers.CharField(
        source="get_lesson_number_display",
        read_only=True,
    )

    class Meta:
        model = Workload
        fields = [
            "id",
            "teacher",
            "teacher_name",
            "discipline",
            "discipline_name",
            "group",
            "group_name",
            "hours_plan",
            "hours_fact",
            "semester",
            "room",
            "day_of_week",
            "day_name",
            "lesson_number",
            "lesson_name",
        ]


class WorkloadDetailSerializer(serializers.ModelSerializer):
    """
    Полный сериализатор нагрузки: используется для создания и редактирования.
    Автоматически валидирует отсутствие коллизий в расписании.
    """

    teacher_name = serializers.CharField(
        source="teacher.full_name",
        read_only=True,
    )
    discipline_name = serializers.CharField(
        source="discipline.name",
        read_only=True,
    )
    group_name = serializers.CharField(
        source="group.name",
        read_only=True,
    )

    class Meta:
        model = Workload
        fields = [
            "id",
            "teacher",
            "teacher_name",
            "discipline",
            "discipline_name",
            "group",
            "group_name",
            "hours_plan",
            "hours_fact",
            "semester",
            "room",
            "day_of_week",
            "lesson_number",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        # Собираем полные данные с учётом уже существующих полей при PATCH/PUT
        data = dict(attrs)
        if self.instance:
            for field in ["teacher", "group", "room", "semester", "day_of_week", "lesson_number"]:
                if field not in data:
                    data[field] = getattr(self.instance, field)

        # Проверка пересечений через сервис
        exclude_id = self.instance.pk if self.instance else None
        conflicts = check_schedule_conflict(data, exclude_id=exclude_id)

        if conflicts:
            conflict_msg = describe_conflict_reason(conflicts[0], data)
            raise serializers.ValidationError({
                "schedule": f"Обнаружено пересечение в расписании! {conflict_msg}"
            })

        return attrs


class ConflictCheckRequestSerializer(serializers.Serializer):
    """Схема запроса для эндпоинта предварительной проверки пересечений."""

    teacher = serializers.IntegerField(required=False, help_text="ID преподавателя")
    group = serializers.IntegerField(required=False, help_text="ID учебной группы")
    room = serializers.CharField(required=False, allow_blank=True, help_text="Номер аудитории")
    semester = serializers.CharField(required=True, help_text="Семестр, например '2024-1'")
    day_of_week = serializers.IntegerField(required=False, help_text="День недели (1-6)")
    lesson_number = serializers.IntegerField(required=False, help_text="Номер пары (1-7)")
    exclude_id = serializers.IntegerField(required=False, help_text="ID текущей записи при редактировании")


class ConflictCheckResponseSerializer(serializers.Serializer):
    """Схема ответа эндпоинта проверки пересечений."""

    has_conflicts = serializers.BooleanField(help_text="Флаг наличия пересечений")
    conflicts_count = serializers.IntegerField(help_text="Количество найденных конфликтов")
    conflicts = WorkloadListSerializer(many=True, help_text="Список конфликтующих записей")
