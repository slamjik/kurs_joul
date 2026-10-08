"""
Сериализаторы модуля «Мониторинг успеваемости».
Соблюдают принцип: один сериализатор — одна задача (List / Detail / Аналитика).
"""

from rest_framework import serializers

from .models import Grade, Student


class StudentListSerializer(serializers.ModelSerializer):
    """Сериализатор для списков студентов и каталога контингента."""

    group_name = serializers.CharField(
        source="group.name",
        read_only=True,
    )
    course = serializers.IntegerField(
        source="group.course",
        read_only=True,
    )
    direction_code = serializers.CharField(
        source="group.direction_code",
        read_only=True,
    )
    direction_name = serializers.CharField(
        source="group.direction_name",
        read_only=True,
    )
    average_grade = serializers.SerializerMethodField()
    grades_count = serializers.SerializerMethodField()
    is_risk = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            "id",
            "full_name",
            "email",
            "group",
            "group_name",
            "course",
            "direction_code",
            "direction_name",
            "average_grade",
            "grades_count",
            "is_risk",
        ]

    def get_average_grade(self, obj):
        from django.db.models import Avg
        avg_val = obj.grades.aggregate(avg=Avg("grade"))["avg"]
        return round(float(avg_val), 2) if avg_val is not None else 0.0

    def get_grades_count(self, obj):
        return obj.grades.count()

    def get_is_risk(self, obj):
        avg = self.get_average_grade(obj)
        has_failing = obj.grades.filter(grade__lt=3.0).exists()
        return (avg > 0 and avg < 3.0) or has_failing


class StudentDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор студента."""

    group_name = serializers.CharField(
        source="group.name",
        read_only=True,
    )
    direction_name = serializers.CharField(
        source="group.direction_name",
        read_only=True,
    )
    course = serializers.IntegerField(
        source="group.course",
        read_only=True,
    )

    class Meta:
        model = Student
        fields = [
            "id",
            "full_name",
            "email",
            "group",
            "group_name",
            "direction_name",
            "course",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class GradeListSerializer(serializers.ModelSerializer):
    """Облегчённый сериализатор для вывода журнала оценок."""

    student_name = serializers.CharField(
        source="student.full_name",
        read_only=True,
    )
    group_name = serializers.CharField(
        source="student.group.name",
        read_only=True,
    )
    discipline_name = serializers.CharField(
        source="discipline.name",
        read_only=True,
    )
    teacher_name = serializers.CharField(
        source="teacher.full_name",
        read_only=True,
        default="",
    )
    source_display = serializers.CharField(
        source="get_source_display",
        read_only=True,
    )

    class Meta:
        model = Grade
        fields = [
            "id",
            "student",
            "student_name",
            "group_name",
            "discipline",
            "discipline_name",
            "teacher",
            "teacher_name",
            "semester",
            "grade",
            "date",
            "source",
            "source_display",
        ]


class GradeDetailSerializer(serializers.ModelSerializer):
    """Полный сериализатор оценки для создания и редактирования."""

    student_name = serializers.CharField(
        source="student.full_name",
        read_only=True,
    )
    discipline_name = serializers.CharField(
        source="discipline.name",
        read_only=True,
    )
    teacher_name = serializers.CharField(
        source="teacher.full_name",
        read_only=True,
        default="",
    )

    class Meta:
        model = Grade
        fields = [
            "id",
            "student",
            "student_name",
            "discipline",
            "discipline_name",
            "teacher",
            "teacher_name",
            "semester",
            "grade",
            "date",
            "source",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_grade(self, value):
        if not (2.0 <= value <= 5.0):
            raise serializers.ValidationError("Оценка должна быть в диапазоне от 2.0 до 5.0.")
        return value


class RiskZoneStudentSerializer(serializers.Serializer):
    """Схема данных студента в зоне риска."""

    student_id = serializers.IntegerField(help_text="ID студента")
    student_name = serializers.CharField(help_text="ФИО студента")
    email = serializers.EmailField(help_text="Email студента", allow_blank=True)
    group_id = serializers.IntegerField(help_text="ID группы")
    group_name = serializers.CharField(help_text="Название учебной группы")
    avg_grade = serializers.FloatField(help_text="Средний академический балл")
    grades_count = serializers.IntegerField(help_text="Всего полученных оценок")
    failing_disciplines = serializers.ListField(
        child=serializers.CharField(),
        help_text="Список предметов с задолженностями/неудами (< 3.0)",
    )


class GradesDynamicsSerializer(serializers.Serializer):
    """Схема данных динамики успеваемости по семестрам или контрольным срезам."""

    period = serializers.CharField(required=False, default="", help_text="Метка периода (семестр или месяц)")
    semester = serializers.CharField(required=False, default="", allow_blank=True, help_text="Семестр, например '2024-1'")
    avg_grade = serializers.FloatField(help_text="Средний балл по семестру/периоду")
    total_grades = serializers.IntegerField(help_text="Количество выставленных оценок")
    pass_rate = serializers.FloatField(help_text="Процент положительных оценок (>= 3.0)")

