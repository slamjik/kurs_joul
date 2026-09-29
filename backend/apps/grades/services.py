"""
Сервисный слой модуля «Мониторинг успеваемости».
Вся бизнес-логика:
- Вычисление среднего балла студента
- Автоматическое выявление студентов в «зоне риска» (средний балл < 3.0)
- Расчёт динамики успеваемости по семестрам для графиков
- Распределение по уровням качества обучения
"""

from typing import Any, Dict, List, Optional
from django.conf import settings
from django.db.models import Avg, Count, Q

from .models import Grade, Student

# Порог зоны риска из настроек (по умолчанию 3.0, никаких магических чисел)
RISK_THRESHOLD = getattr(settings, "RISK_THRESHOLD", 3.0)
PASSING_GRADE = 3.0
EXCELLENT_GRADE = 4.5
GOOD_GRADE = 3.5


def calculate_student_average_grade(student_id: int, semester: Optional[str] = None) -> float:
    """
    Вычисляет средний балл студента за всё время или за конкретный семестр.
    """
    qs = Grade.objects.filter(student_id=student_id)
    if semester:
        qs = qs.filter(semester=semester)

    result = qs.aggregate(avg=Avg("grade"))
    avg_grade = result["avg"]
    return round(float(avg_grade), 2) if avg_grade is not None else 0.0


def get_risk_zone_students(
    group_id: Optional[int] = None,
    discipline_id: Optional[int] = None,
    semester: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Автоматически выявляет студентов в «зоне риска»:
    студенты, чей средний балл строго ниже порогового значения RISK_THRESHOLD (3.0).

    Для каждого студента собираются:
    - ФИО и учебная группа
    - Средний балл (с округлением до сотых)
    - Список дисциплин с неудовлетворительными оценками (< 3.0)
    """
    # Базовая выборка оценок с фильтрами
    qs = Grade.objects.select_related("student__group", "discipline")

    if group_id:
        qs = qs.filter(student__group_id=group_id)
    if discipline_id:
        qs = qs.filter(discipline_id=discipline_id)
    if semester:
        qs = qs.filter(semester=semester)

    # Агрегация среднего балла по каждому студенту
    students_avg = (
        qs.values(
            "student_id",
            "student__full_name",
            "student__email",
            "student__group_id",
            "student__group__name",
        )
        .annotate(
            avg_grade=Avg("grade"),
            grades_count=Count("id"),
        )
        .filter(avg_grade__lt=RISK_THRESHOLD)
        .order_by("avg_grade")
    )

    risk_list = []
    for item in students_avg:
        s_id = item["student_id"]
        # Находим конкретные дисциплины с оценкой 2.0 (неуд)
        failing_grades = (
            Grade.objects.filter(student_id=s_id, grade__lt=PASSING_GRADE)
            .select_related("discipline")
            .values_list("discipline__name", flat=True)
            .distinct()
        )

        risk_list.append({
            "student_id": s_id,
            "student_name": item["student__full_name"],
            "email": item["student__email"] or "",
            "group_id": item["student__group_id"],
            "group_name": item["student__group__name"],
            "avg_grade": round(float(item["avg_grade"]), 2),
            "grades_count": item["grades_count"],
            "failing_disciplines": list(failing_grades),
        })

    return risk_list


def get_grades_dynamics(
    group_id: Optional[int] = None,
    discipline_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Формирует динамику среднего балла и успеваемости по семестрам.
    Используется для построения линейного графика успеваемости.
    """
    qs = Grade.objects.all()

    if group_id:
        qs = qs.filter(student__group_id=group_id)
    if discipline_id:
        qs = qs.filter(discipline_id=discipline_id)
    if teacher_id:
        qs = qs.filter(teacher_id=teacher_id)

    # Группировка по семестрам
    semester_stats = (
        qs.values("semester")
        .annotate(
            avg_grade=Avg("grade"),
            total_grades=Count("id"),
            passing_grades=Count("id", filter=Q(grade__gte=PASSING_GRADE)),
        )
        .order_by("semester")
    )

    result = []
    for stat in semester_stats:
        total = stat["total_grades"] or 0
        passing = stat["passing_grades"] or 0
        pass_rate = round((passing / total * 100), 1) if total > 0 else 0.0

        result.append({
            "semester": stat["semester"],
            "avg_grade": round(float(stat["avg_grade"] or 0.0), 2),
            "total_grades": total,
            "pass_rate": pass_rate,
        })

    return result


def get_quality_levels_distribution(
    group_id: Optional[int] = None,
    semester: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Вычисляет распределение оценок по уровням качества образования
    (для круговой диаграммы):
    - «Отлично» (>= 4.5)
    - «Хорошо» (3.5 - 4.49)
    - «Удовлетворительно» (3.0 - 3.49)
    - «Неудовлетворительно» (< 3.0)
    """
    qs = Grade.objects.all()
    if group_id:
        qs = qs.filter(student__group_id=group_id)
    if semester:
        qs = qs.filter(semester=semester)

    total = qs.count()
    if total == 0:
        return {
            "excellent": 0,
            "good": 0,
            "satisfactory": 0,
            "unsatisfactory": 0,
            "total": 0,
        }

    excellent = qs.filter(grade__gte=EXCELLENT_GRADE).count()
    good = qs.filter(grade__gte=GOOD_GRADE, grade__lt=EXCELLENT_GRADE).count()
    satisfactory = qs.filter(grade__gte=PASSING_GRADE, grade__lt=GOOD_GRADE).count()
    unsatisfactory = qs.filter(grade__lt=PASSING_GRADE).count()

    return {
        "excellent": excellent,
        "good": good,
        "satisfactory": satisfactory,
        "unsatisfactory": unsatisfactory,
        "total": total,
        "quality_rate": round(((excellent + good) / total * 100), 1),
    }
