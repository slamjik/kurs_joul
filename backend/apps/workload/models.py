"""
Модели модуля «Планирование нагрузки»:
- Department (Кафедра)
- Teacher (Преподаватель кафедры)
- StudyGroup (Учебная группа)
- Discipline (Учебная дисциплина)
- Workload (Назначенная учебная нагрузка)
"""

from django.db import models
from core.models import TimestampedModel


class Department(TimestampedModel):
    """Кафедра вуза (например, «Гуманитарные и социально-экономические науки»)."""

    name = models.CharField(
        max_length=200,
        verbose_name="Название кафедры",
    )
    code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="Код / аббревиатура кафедры",
    )

    class Meta:
        verbose_name = "Кафедра"
        verbose_name_plural = "Кафедры"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Teacher(TimestampedModel):
    """Профиль преподавателя кафедры, привязанный к пользователю системы."""

    user = models.OneToOneField(
        "auth_app.User",
        on_delete=models.CASCADE,
        related_name="teacher_profile",
        verbose_name="Пользователь",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="teachers",
        verbose_name="Кафедра",
    )
    full_name = models.CharField(
        max_length=200,
        verbose_name="ФИО преподавателя",
    )
    position = models.CharField(
        max_length=100,
        verbose_name="Должность",
        help_text="Например: Профессор, Доцент, Старший преподаватель, Ассистент",
    )
    hours_limit = models.FloatField(
        default=900.0,
        verbose_name="Лимит часов в год",
        help_text="Норма годовой учебной нагрузки (по умолчанию 900 часов)",
    )

    class Meta:
        verbose_name = "Преподаватель"
        verbose_name_plural = "Преподаватели"
        ordering = ["full_name"]
        indexes = [
            models.Index(fields=["department"], name="teacher_dept_idx"),
            models.Index(fields=["full_name"], name="teacher_name_idx"),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.position})"


class StudyGroup(TimestampedModel):
    """Академическая учебная группа студентов."""

    name = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Название группы",
        help_text="Например: БПИ-22-1, ЭК-21",
    )
    direction_code = models.CharField(
        max_length=20,
        verbose_name="Код направления подготовки",
        help_text="Например: 09.03.01, 38.03.01",
    )
    direction_name = models.CharField(
        max_length=200,
        verbose_name="Наименование направления подготовки",
        help_text="Например: Информатика и вычислительная техника, Экономика",
    )
    course = models.PositiveSmallIntegerField(
        verbose_name="Номер курса",
        help_text="Курс обучения (1-6)",
    )
    year = models.PositiveSmallIntegerField(
        verbose_name="Год поступления",
        help_text="Например: 2022",
    )

    class Meta:
        verbose_name = "Учебная группа"
        verbose_name_plural = "Учебные группы"
        ordering = ["course", "name"]
        indexes = [
            models.Index(fields=["course"], name="group_course_idx"),
            models.Index(fields=["direction_code"], name="group_direction_idx"),
        ]

    def __str__(self):
        return self.name


class Discipline(TimestampedModel):
    """Учебная дисциплина (предмет)."""

    LESSON_TYPES = [
        ("lecture", "Лекция"),
        ("practice", "Практика"),
        ("lab", "Лабораторная работа"),
    ]

    name = models.CharField(
        max_length=300,
        verbose_name="Название дисциплины",
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Код дисциплины",
        help_text="Например: GIS-01, INF-02",
    )
    total_hours = models.PositiveIntegerField(
        verbose_name="Всего часов по учебному плану",
    )
    lesson_type = models.CharField(
        max_length=20,
        choices=LESSON_TYPES,
        default="lecture",
        verbose_name="Тип занятия",
    )

    class Meta:
        verbose_name = "Дисциплина"
        verbose_name_plural = "Дисциплины"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["code"], name="disc_code_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_lesson_type_display()})"


class Workload(TimestampedModel):
    """
    Распределенная учебная нагрузка:
    привязка преподавателя к дисциплине, группе, аудитории и времени занятий.
    """

    DAY_CHOICES = [
        (1, "Понедельник"),
        (2, "Вторник"),
        (3, "Среда"),
        (4, "Четверг"),
        (5, "Пятница"),
        (6, "Суббота"),
    ]

    LESSON_NUMBER_CHOICES = [
        (1, "1 пара (08:30 - 10:00)"),
        (2, "2 пара (10:10 - 11:40)"),
        (3, "3 пара (12:00 - 13:30)"),
        (4, "4 пара (13:40 - 15:10)"),
        (5, "5 пара (15:20 - 16:50)"),
        (6, "6 пара (17:00 - 18:30)"),
        (7, "7 пара (18:40 - 20:10)"),
    ]

    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE,
        related_name="workloads",
        verbose_name="Преподаватель",
    )
    discipline = models.ForeignKey(
        Discipline,
        on_delete=models.PROTECT,
        related_name="workloads",
        verbose_name="Дисциплина",
    )
    group = models.ForeignKey(
        StudyGroup,
        on_delete=models.PROTECT,
        related_name="workloads",
        verbose_name="Учебная группа",
    )
    hours_plan = models.PositiveIntegerField(
        verbose_name="Плановые часы",
    )
    hours_fact = models.PositiveIntegerField(
        default=0,
        verbose_name="Фактически проведенные часы",
    )
    semester = models.CharField(
        max_length=20,
        verbose_name="Учебный семестр",
        help_text="Формат: ГГГГ-N, например: 2024-1 (осенний) или 2024-2 (весенний)",
    )
    room = models.CharField(
        max_length=50,
        blank=True,
        default="",
        verbose_name="Номер аудитории",
        help_text="Например: 101, Акт. зал",
    )
    day_of_week = models.PositiveSmallIntegerField(
        choices=DAY_CHOICES,
        null=True,
        blank=True,
        verbose_name="День недели",
    )
    lesson_number = models.PositiveSmallIntegerField(
        choices=LESSON_NUMBER_CHOICES,
        null=True,
        blank=True,
        verbose_name="Номер пары",
    )

    class Meta:
        verbose_name = "Учебная нагрузка"
        verbose_name_plural = "Учебная нагрузка"
        ordering = ["semester", "day_of_week", "lesson_number"]
        indexes = [
            models.Index(fields=["teacher", "semester"], name="wl_teacher_sem_idx"),
            models.Index(fields=["discipline", "semester"], name="wl_disc_sem_idx"),
            models.Index(fields=["group", "semester"], name="wl_group_sem_idx"),
            models.Index(
                fields=["semester", "day_of_week", "lesson_number"],
                name="wl_schedule_idx",
            ),
        ]

    def __str__(self):
        return f"{self.teacher.full_name} | {self.discipline.name} | {self.group.name} ({self.semester})"
