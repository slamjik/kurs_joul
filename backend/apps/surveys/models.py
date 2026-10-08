"""
Модели данных модуля «Анкетирование и мониторинг качества образования» (СМКО).
Реализуют сбор анонимных отзывов студентов, расчет индекса удовлетворенности
и формирование рекомендаций преподавателям.
"""

from django.db import models
from core.models import TimestampedModel


class SurveyTemplate(TimestampedModel):
    """Шаблон анкеты опроса качества на семестр."""

    title = models.CharField(
        max_length=255,
        verbose_name="Название анкеты",
        help_text="Например: Опрос по качеству преподавания за осенний семестр 2024/2025",
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name="Описание и инструкция",
        help_text="Пояснение для студентов о целях опроса и гарантиях анонимности",
    )
    academic_year = models.CharField(
        max_length=20,
        default="2024-2025",
        verbose_name="Учебный год",
    )
    semester = models.CharField(
        max_length=20,
        default="2024-1",
        verbose_name="Семестр",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Активна для прохождения",
    )

    class Meta:
        verbose_name = "Шаблон анкеты"
        verbose_name_plural = "Шаблоны анкет"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.semester})"


class SurveyQuestion(models.Model):
    """Вопрос / критерий оценки качества в анкете."""

    CATEGORY_CHOICES = [
        ("clarity", "Понятность и структурированность подачи материала"),
        ("fairness", "Объективность и прозрачность системы оценивания"),
        ("relevance", "Практическая ценность и актуальность содержания"),
        ("ethics", "Педагогический такт, этика и контакт со студентами"),
        ("facilities", "Организация учебного процесса и условия обучения"),
        ("general", "Общие впечатления и пожелания"),
    ]

    TYPE_CHOICES = [
        ("scale_5", "Оценка по шкале (1–5 баллов)"),
        ("single_choice", "Один вариант ответа"),
        ("multiple_choice", "Несколько вариантов ответа"),
        ("text", "Текстовый отзыв в свободной форме"),
    ]

    template = models.ForeignKey(
        SurveyTemplate,
        on_delete=models.CASCADE,
        related_name="questions",
        verbose_name="Шаблон анкеты",
    )
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default="clarity",
        verbose_name="Категория критерия",
    )
    text = models.TextField(
        verbose_name="Текст вопроса",
    )
    question_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default="scale_5",
        verbose_name="Тип вопроса",
    )
    options = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Варианты ответов",
        help_text="Список вариантов для single_choice и multiple_choice",
    )
    order = models.PositiveIntegerField(
        default=1,
        verbose_name="Порядок отображения",
    )

    class Meta:
        verbose_name = "Критерий / Вопрос анкеты"
        verbose_name_plural = "Критерии / Вопросы анкеты"
        ordering = ["order", "id"]

    def __str__(self):
        return f"[{self.get_category_display()}] {self.text[:50]}"


class SurveyAssignment(TimestampedModel):
    """
    Связка шаблона опроса с конкретным преподавателем, дисциплиной и группой.
    Позволяет студентам оценивать каждого преподавателя персонифицированно.
    """

    template = models.ForeignKey(
        SurveyTemplate,
        on_delete=models.CASCADE,
        related_name="assignments",
        verbose_name="Шаблон анкеты",
    )
    teacher = models.ForeignKey(
        "workload.Teacher",
        on_delete=models.CASCADE,
        related_name="survey_assignments",
        verbose_name="Преподаватель",
    )
    discipline = models.ForeignKey(
        "workload.Discipline",
        on_delete=models.CASCADE,
        related_name="survey_assignments",
        verbose_name="Дисциплина",
    )
    group = models.ForeignKey(
        "workload.StudyGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="survey_assignments",
        verbose_name="Учебная группа",
    )
    department = models.ForeignKey(
        "workload.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="survey_assignments",
        verbose_name="Кафедра",
    )
    is_open = models.BooleanField(
        default=True,
        verbose_name="Прием ответов открыт",
    )

    class Meta:
        verbose_name = "Назначение анкеты"
        verbose_name_plural = "Назначения анкет"
        ordering = ["-created_at"]

    def __str__(self):
        dept_code = self.department.code if self.department else "Филиал"
        grp = f", гр. {self.group.name}" if self.group else ""
        return f"{self.teacher.full_name} — {self.discipline.name}{grp} [{dept_code}]"


class SurveyAnswer(models.Model):
    """
    Анонимный ответ студента на вопрос анкеты.
    ВАЖНО: Поле student_id отсутствует намеренно для гарантии криптографической
    анонимности и исключения риска деанонимизации.
    """

    assignment = models.ForeignKey(
        SurveyAssignment,
        on_delete=models.CASCADE,
        related_name="answers",
        verbose_name="Назначение анкеты",
    )
    question = models.ForeignKey(
        SurveyQuestion,
        on_delete=models.CASCADE,
        related_name="answers",
        verbose_name="Вопрос",
    )
    score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name="Балл (1–5)",
        help_text="Оценка по 5-балльной шкале Лайкерта",
    )
    text_response = models.TextField(
        null=True,
        blank=True,
        verbose_name="Текстовый комментарий",
    )
    submission_hash = models.CharField(
        max_length=64,
        db_index=True,
        verbose_name="Хэш сессии отправки",
        help_text="Случайный токен сессии для группировки ответов без привязки к личности",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Время отправки",
    )

    class Meta:
        verbose_name = "Ответ студента"
        verbose_name_plural = "Ответы студентов"
        ordering = ["-created_at"]

    def __str__(self):
        val = f"{self.score}★" if self.score else (self.text_response[:30] if self.text_response else "—")
        return f"Ответ на вопрос #{self.question_id}: {val}"


class TeacherRecommendation(TimestampedModel):
    """
    Методические рекомендации преподавателю по улучшению качества преподавания.
    Могут быть сгенерированы автоматически алгоритмом на основе просадок
    или вынесены лично заведующим кафедрой.
    """

    SOURCE_CHOICES = [
        ("auto", "Автоматически сформирована системой (Rule-Based)"),
        ("head", "Вынесена заведующим кафедрой"),
    ]

    STATUS_CHOICES = [
        ("draft", "Черновик"),
        ("published", "Опубликована"),
        ("reviewed", "Принята к сведению"),
    ]

    teacher = models.ForeignKey(
        "workload.Teacher",
        on_delete=models.CASCADE,
        related_name="recommendations",
        verbose_name="Преподаватель",
    )
    discipline = models.ForeignKey(
        "workload.Discipline",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recommendations",
        verbose_name="Дисциплина",
    )
    semester = models.CharField(
        max_length=20,
        default="2024-1",
        verbose_name="Семестр",
    )
    category = models.CharField(
        max_length=50,
        blank=True,
        default="",
        verbose_name="Категория проблемы",
    )
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default="auto",
        verbose_name="Источник рекомендации",
    )
    recommendation_text = models.TextField(
        verbose_name="Текст рекомендации",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="published",
        verbose_name="Статус",
    )

    class Meta:
        verbose_name = "Рекомендация преподавателю"
        verbose_name_plural = "Рекомендации преподавателям"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Рекомендация для {self.teacher.full_name} [{self.get_source_display()}]"
