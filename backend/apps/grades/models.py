"""
Модели модуля «Мониторинг успеваемости»:
- Student (Студент учебной группы)
- Grade (Оценка / академическая успеваемость)
"""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from core.models import TimestampedModel


class Student(TimestampedModel):
    """Студент, привязанный к академической учебной группе."""

    full_name = models.CharField(
        max_length=200,
        verbose_name="ФИО студента",
    )
    email = models.EmailField(
        blank=True,
        default="",
        verbose_name="Email студента",
    )
    group = models.ForeignKey(
        "workload.StudyGroup",
        on_delete=models.PROTECT,
        related_name="students",
        verbose_name="Учебная группа",
    )

    class Meta:
        verbose_name = "Студент"
        verbose_name_plural = "Студенты"
        ordering = ["full_name"]
        indexes = [
            models.Index(fields=["group"], name="student_group_idx"),
            models.Index(fields=["full_name"], name="student_name_idx"),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.group.name})"


class Grade(TimestampedModel):
    """
    Оценка студента по дисциплине за семестр.
    Поддерживает различные источники импорта: ручной ввод, Excel, LMS Moodle или Mock.
    """

    MANUAL = "manual"
    EXCEL = "excel"
    MOODLE = "moodle"
    MOCK = "mock"

    SOURCE_CHOICES = [
        (MANUAL, "Вручную"),
        (EXCEL, "Импорт из Excel"),
        (MOODLE, "LMS Moodle"),
        (MOCK, "Тестовые данные (LMS Mock)"),
    ]

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="grades",
        verbose_name="Студент",
    )
    discipline = models.ForeignKey(
        "workload.Discipline",
        on_delete=models.PROTECT,
        related_name="grades",
        verbose_name="Дисциплина",
    )
    teacher = models.ForeignKey(
        "workload.Teacher",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="given_grades",
        verbose_name="Преподаватель",
    )
    semester = models.CharField(
        max_length=20,
        verbose_name="Семестр",
        help_text="Например: 2024-1, 2024-2",
    )
    grade = models.FloatField(
        validators=[MinValueValidator(2.0), MaxValueValidator(5.0)],
        verbose_name="Оценка",
        help_text="Числовая оценка от 2.0 (неуд) до 5.0 (отл)",
    )
    date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Дата выставления",
    )
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default=MANUAL,
        verbose_name="Источник данных",
    )

    class Meta:
        verbose_name = "Оценка"
        verbose_name_plural = "Оценки"
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["student", "semester"], name="grade_student_sem_idx"),
            models.Index(fields=["discipline", "semester"], name="grade_disc_sem_idx"),
            models.Index(fields=["grade"], name="grade_val_idx"),
            models.Index(fields=["semester"], name="grade_semester_idx"),
        ]

    def __str__(self):
        return f"{self.student.full_name} | {self.discipline.name} = {self.grade} ({self.semester})"
