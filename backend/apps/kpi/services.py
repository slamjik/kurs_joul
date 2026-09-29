"""
Сервисный слой модуля «KPI-дашборд и аналитика».
Вся бизнес-логика расчёта показателей кафедры и кэширование в Redis:
- Сводные карточки (студенты, зона риска, выполнение часов, средний балл)
- Круговая диаграмма качества образования
- Гистограмма распределения нагрузки преподавателей
- Динамика успеваемости по семестрам
- Таблица-сводка по направлениям подготовки
- Инвалидация кэша
"""

from typing import Any, Dict, List, Optional
from django.core.cache import cache
from django.db.models import Avg, Count, Q, Sum

from grades.models import Grade, Student
from grades.services import (
    EXCELLENT_GRADE,
    GOOD_GRADE,
    PASSING_GRADE,
    RISK_THRESHOLD,
    get_risk_zone_students,
)
from workload.models import StudyGroup, Teacher, Workload

# Время жизни кэша KPI (15 минут = 900 секунд)
KPI_CACHE_TTL = 900


def get_kpi_summary(semester: Optional[str] = None) -> Dict[str, Any]:
    """
    Рассчитывает ключевые показатели (KPI) кафедры для сводных карточек:
    - total_students: всего студентов
    - risk_students_count: студентов в зоне риска (< 3.0)
    - risk_students_pct: процент студентов в зоне риска
    - hours_plan_total: плановые часы кафедры
    - hours_fact_total: фактически закрытые часы кафедры
    - hours_completion_pct: процент закрытия часов
    - avg_grade: средний академический балл
    - quality_rate: процент качественной успеваемости (оценки 4 и 5)
    """
    cache_key = f"kpi_summary_{semester or 'all'}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    # 1. Студенты и зона риска
    total_students = Student.objects.count()
    risk_list = get_risk_zone_students(semester=semester)
    risk_count = len(risk_list)
    risk_pct = round((risk_count / total_students * 100), 1) if total_students > 0 else 0.0

    # 2. Учебные часы кафедры (план / факт)
    wl_qs = Workload.objects.all()
    if semester:
        wl_qs = wl_qs.filter(semester=semester)

    wl_aggregates = wl_qs.aggregate(
        total_plan=Sum("hours_plan"),
        total_fact=Sum("hours_fact"),
    )
    hours_plan = wl_aggregates["total_plan"] or 0
    hours_fact = wl_aggregates["total_fact"] or 0
    hours_completion = (
        round((hours_fact / hours_plan * 100), 1) if hours_plan > 0 else 0.0
    )

    # 3. Средний балл и качество
    gr_qs = Grade.objects.all()
    if semester:
        gr_qs = gr_qs.filter(semester=semester)

    gr_aggregates = gr_qs.aggregate(
        avg_val=Avg("grade"),
        total_count=Count("id"),
        quality_count=Count("id", filter=Q(grade__gte=GOOD_GRADE)),
    )
    avg_grade = round(float(gr_aggregates["avg_val"] or 0.0), 2)
    total_grades = gr_aggregates["total_count"] or 0
    quality_count = gr_aggregates["quality_count"] or 0
    quality_rate = (
        round((quality_count / total_grades * 100), 1) if total_grades > 0 else 0.0
    )

    result = {
        "total_students": total_students,
        "risk_students_count": risk_count,
        "risk_students_pct": risk_pct,
        "hours_plan_total": hours_plan,
        "hours_fact_total": hours_fact,
        "hours_completion_pct": hours_completion,
        "avg_grade": avg_grade,
        "quality_rate": quality_rate,
    }

    cache.set(cache_key, result, KPI_CACHE_TTL)
    return result


def get_kpi_quality_levels(semester: Optional[str] = None) -> Dict[str, Any]:
    """
    Распределение оценок по уровням качества (для круговой диаграммы):
    Отлично (>= 4.5), Хорошо (3.5 - 4.49), Удовл (3.0 - 3.49), Неуд (< 3.0).
    """
    cache_key = f"kpi_quality_{semester or 'all'}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    qs = Grade.objects.all()
    if semester:
        qs = qs.filter(semester=semester)

    total = qs.count()
    if total == 0:
        empty_res = {
            "excellent": 0,
            "good": 0,
            "satisfactory": 0,
            "unsatisfactory": 0,
            "total": 0,
            "quality_rate": 0.0,
        }
        cache.set(cache_key, empty_res, KPI_CACHE_TTL)
        return empty_res

    excellent = qs.filter(grade__gte=EXCELLENT_GRADE).count()
    good = qs.filter(grade__gte=GOOD_GRADE, grade__lt=EXCELLENT_GRADE).count()
    satisfactory = qs.filter(grade__gte=PASSING_GRADE, grade__lt=GOOD_GRADE).count()
    unsatisfactory = qs.filter(grade__lt=PASSING_GRADE).count()

    result = {
        "excellent": excellent,
        "good": good,
        "satisfactory": satisfactory,
        "unsatisfactory": unsatisfactory,
        "total": total,
        "quality_rate": round(((excellent + good) / total * 100), 1),
    }

    cache.set(cache_key, result, KPI_CACHE_TTL)
    return result


def get_kpi_workload_chart(semester: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Гистограмма распределения учебной нагрузки по преподавателям (план/факт/лимит).
    """
    cache_key = f"kpi_workload_{semester or 'all'}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    teachers = Teacher.objects.all().order_by("full_name")
    chart_data = []

    for teacher in teachers:
        wl_qs = Workload.objects.filter(teacher=teacher)
        if semester:
            wl_qs = wl_qs.filter(semester=semester)

        aggs = wl_qs.aggregate(
            plan=Sum("hours_plan"),
            fact=Sum("hours_fact"),
        )
        plan = aggs["plan"] or 0
        fact = aggs["fact"] or 0
        completion_pct = round((fact / plan * 100), 1) if plan > 0 else 0.0

        chart_data.append({
            "teacher_id": teacher.id,
            "teacher_name": teacher.full_name,
            "hours_limit": teacher.hours_limit,
            "hours_plan": plan,
            "hours_fact": fact,
            "completion_pct": completion_pct,
        })

    cache.set(cache_key, chart_data, KPI_CACHE_TTL)
    return chart_data


def get_kpi_directions_summary(semester: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Таблица-сводка успеваемости и нагрузки в разрезе направлений подготовки.
    """
    cache_key = f"kpi_directions_{semester or 'all'}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    # Получаем уникальные направления подготовки
    directions = (
        StudyGroup.objects.values("direction_code", "direction_name")
        .distinct()
        .order_by("direction_code")
    )

    summary = []
    for d in directions:
        code = d["direction_code"]
        name = d["direction_name"]

        # Студенты этого направления
        direction_students = Student.objects.filter(group__direction_code=code)
        students_count = direction_students.count()

        # Средний балл
        grades_qs = Grade.objects.filter(student__group__direction_code=code)
        if semester:
            grades_qs = grades_qs.filter(semester=semester)

        avg_val = grades_qs.aggregate(avg=Avg("grade"))["avg"]
        avg_grade = round(float(avg_val), 2) if avg_val is not None else 0.0

        # Количество студентов направления в зоне риска
        risk_in_dir = 0
        for student in direction_students:
            s_grades = Grade.objects.filter(student=student)
            if semester:
                s_grades = s_grades.filter(semester=semester)
            s_avg = s_grades.aggregate(avg=Avg("grade"))["avg"]
            if s_avg is not None and s_avg < RISK_THRESHOLD:
                risk_in_dir += 1

        summary.append({
            "direction_code": code,
            "direction_name": name,
            "students_count": students_count,
            "avg_grade": avg_grade,
            "risk_count": risk_in_dir,
        })

    cache.set(cache_key, summary, KPI_CACHE_TTL)
    return summary


def invalidate_kpi_cache(semester: Optional[str] = None) -> None:
    """
    Инвалидация кэшированных показателей в Redis.
    Сбрасывает ключи при изменении оценок или нагрузки.
    """
    semesters = [semester] if semester else []
    semesters.extend(["all", "2024-1", "2024-2", "2023-1", "2023-2"])

    for sem in set(semesters):
        cache.delete(f"kpi_summary_{sem}")
        cache.delete(f"kpi_quality_{sem}")
        cache.delete(f"kpi_workload_{sem}")
        cache.delete(f"kpi_directions_{sem}")

    cache.delete("kpi_dynamics_all")
