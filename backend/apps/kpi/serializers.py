"""
Сериализаторы для модуля «KPI-дашборд и аналитика».
"""

from rest_framework import serializers


class KpiSummarySerializer(serializers.Serializer):
    """Схема ключевых сводных показателей кафедры для информационных карточек."""

    total_students = serializers.IntegerField(help_text="Всего студентов кафедры")
    risk_students_count = serializers.IntegerField(help_text="Количество студентов в зоне риска (< 3.0)")
    risk_students_pct = serializers.FloatField(help_text="Процент студентов в зоне риска")
    hours_plan_total = serializers.IntegerField(help_text="Всего плановых часов по учебной нагрузке")
    hours_fact_total = serializers.IntegerField(help_text="Всего фактически выполненных часов")
    hours_completion_pct = serializers.FloatField(help_text="Процент закрытия часов (план/факт)")
    avg_grade = serializers.FloatField(help_text="Средний академический балл")
    quality_rate = serializers.FloatField(help_text="Процент качественной успеваемости (оценки 4 и 5)")


class KpiQualityLevelsSerializer(serializers.Serializer):
    """Схема распределения оценок по уровням качества (для круговой диаграммы)."""

    excellent = serializers.IntegerField(help_text="Оценки 'Отлично' (>= 4.5)")
    good = serializers.IntegerField(help_text="Оценки 'Хорошо' (3.5 - 4.49)")
    satisfactory = serializers.IntegerField(help_text="Оценки 'Удовлетворительно' (3.0 - 3.49)")
    unsatisfactory = serializers.IntegerField(help_text="Оценки 'Неудовлетворительно' (< 3.0)")
    total = serializers.IntegerField(help_text="Всего выставленных оценок")
    quality_rate = serializers.FloatField(help_text="Доля качественных оценок (отлично + хорошо) в %")


class TeacherWorkloadBarItemSerializer(serializers.Serializer):
    """Элемент гистограммы распределения нагрузки преподавателей."""

    teacher_id = serializers.IntegerField(help_text="ID преподавателя")
    teacher_name = serializers.CharField(help_text="ФИО преподавателя")
    hours_limit = serializers.FloatField(help_text="Годовой лимит часов")
    hours_plan = serializers.IntegerField(help_text="Плановые часы")
    hours_fact = serializers.IntegerField(help_text="Фактические часы")
    completion_pct = serializers.FloatField(help_text="Процент выполнения плана")


class DirectionSummaryItemSerializer(serializers.Serializer):
    """Элемент таблицы-сводки по направлениям подготовки."""

    direction_code = serializers.CharField(help_text="Код направления (например, 09.03.01)")
    direction_name = serializers.CharField(help_text="Наименование направления")
    students_count = serializers.IntegerField(help_text="Количество студентов направления")
    avg_grade = serializers.FloatField(help_text="Средний балл по направлению")
    risk_count = serializers.IntegerField(help_text="Количество студентов направления в зоне риска")


class CacheInvalidateRequestSerializer(serializers.Serializer):
    """Схема запроса принудительного сброса кэша KPI."""

    semester = serializers.CharField(
        required=False,
        allow_blank=True,
        default="all",
        help_text="Семестр для сброса (например, 2024-1) или 'all' для очистки всего кэша",
    )


class CacheInvalidateResponseSerializer(serializers.Serializer):
    """Схема ответа после ручной инвалидации кэша KPI."""

    success = serializers.BooleanField(help_text="Флаг успешности сброса кэша")
    message = serializers.CharField(help_text="Информационное сообщение")
