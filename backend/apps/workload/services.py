"""
Сервисный слой модуля «Планирование нагрузки».
Вся бизнес-логика:
- Проверка пересечений по преподавателям, аудиториям и группам
- Расчёт плановой и фактической нагрузки преподавателей
- Агрегация нагрузки по кафедре
"""

from typing import Any, Dict, List, Optional
from django.db.models import Q, Sum

from .models import Teacher, Workload


def check_schedule_conflict(data: Dict[str, Any], exclude_id: Optional[int] = None) -> List[Workload]:
    """
    Проверяет пересечения в расписании учебных занятий.
    Коллизией считается ситуация, когда в один день недели и на одной паре:
    1. Один и тот же преподаватель назначен на разные занятия;
    2. Одна и та же аудитория назначена разным группам/преподавателям;
    3. Одна и та же группа назначена на разные предметы.

    Если день недели или номер пары не заданы, считается, что занятие
    ещё не привязано к сетке расписания (конфликтов нет).
    """
    day_of_week = data.get("day_of_week")
    lesson_number = data.get("lesson_number")
    semester = data.get("semester")

    if not day_of_week or not lesson_number or not semester:
        return []

    # Извлекаем ID преподавателя и группы (поддерживаем как экземпляры моделей, так и целые числа)
    teacher = data.get("teacher")
    teacher_id = getattr(teacher, "id", teacher)

    group = data.get("group")
    group_id = getattr(group, "id", group)

    room = str(data.get("room") or "").strip()

    # Формируем условия коллизий
    conflict_conditions = Q()

    if teacher_id:
        conflict_conditions |= Q(teacher_id=teacher_id)

    if group_id:
        conflict_conditions |= Q(group_id=group_id)

    if room:
        conflict_conditions |= Q(room__iexact=room)

    # Если ни один из параметров для проверки не задан, конфликтов быть не может
    if not conflict_conditions:
        return []

    qs = Workload.objects.filter(
        semester=semester,
        day_of_week=day_of_week,
        lesson_number=lesson_number,
    ).filter(conflict_conditions)

    if exclude_id:
        qs = qs.exclude(pk=exclude_id)

    # Обязательный select_related для избежания проблемы N+1
    return list(qs.select_related("teacher", "discipline", "group"))


def describe_conflict_reason(conflict: Workload, new_data: Dict[str, Any]) -> str:
    """
    Формирует человекочитаемое описание причины конфликта в расписании.
    """
    teacher = new_data.get("teacher")
    teacher_id = getattr(teacher, "id", teacher)

    group = new_data.get("group")
    group_id = getattr(group, "id", group)

    room = str(new_data.get("room") or "").strip()

    reasons = []
    if teacher_id and conflict.teacher_id == teacher_id:
        reasons.append(f"Преподаватель {conflict.teacher.full_name} уже занят")

    if room and conflict.room and conflict.room.strip().lower() == room.lower():
        reasons.append(f"Аудитория {conflict.room} уже занята")

    if group_id and conflict.group_id == group_id:
        reasons.append(f"Группа {conflict.group.name} уже имеет пару")

    reason_str = ", ".join(reasons) if reasons else "Пересечение в расписании"
    return f"{reason_str}: пара {conflict.lesson_number} ({conflict.discipline.name}, гр. {conflict.group.name})"


def calculate_teacher_workload_stats(teacher_id: int, semester: Optional[str] = None) -> Dict[str, Any]:
    """
    Вычисляет статистику плановой и фактической нагрузки конкретного преподавателя.
    Возвращает часы, процент выполнения и оставшиеся часы относительно лимита.
    """
    teacher = Teacher.objects.filter(id=teacher_id).first()
    if not teacher:
        return {
            "hours_plan": 0,
            "hours_fact": 0,
            "hours_limit": 0,
            "completion_pct": 0.0,
            "remaining_hours": 0,
        }

    qs = Workload.objects.filter(teacher_id=teacher_id)
    if semester:
        qs = qs.filter(semester=semester)

    aggregates = qs.aggregate(
        total_plan=Sum("hours_plan"),
        total_fact=Sum("hours_fact"),
    )

    hours_plan = aggregates["total_plan"] or 0
    hours_fact = aggregates["total_fact"] or 0
    completion_pct = round((hours_fact / hours_plan * 100), 1) if hours_plan > 0 else 0.0

    return {
        "teacher_id": teacher.id,
        "teacher_name": teacher.full_name,
        "hours_limit": teacher.hours_limit,
        "hours_plan": hours_plan,
        "hours_fact": hours_fact,
        "completion_pct": completion_pct,
        "remaining_hours": max(0, int(teacher.hours_limit - hours_fact)),
    }
