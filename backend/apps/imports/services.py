"""
Сервисный слой модуля импорта данных (Excel и LMS).
Вся бизнес-логика:
- Парсинг и валидация таблиц учебной нагрузки (.xlsx)
- Парсинг и валидация ведомостей оценок (.xlsx)
- Синхронизация оценок из LMS (Moodle / Mock)
- Все операции импорта выполняются строго внутри transaction.atomic().
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import openpyxl
from django.db import transaction

from grades.models import Grade, Student
from workload.models import Discipline, StudyGroup, Teacher, Workload
from workload.services import check_schedule_conflict
from .lms.factory import get_lms_client


# Словарь сопоставления колонок для нагрузки (нечувствителен к регистру)
WORKLOAD_COLUMNS = {
    "фио преподавателя": "teacher_name",
    "преподаватель": "teacher_name",
    "дисциплина": "discipline_name",
    "предмет": "discipline_name",
    "группа": "group_name",
    "учебная группа": "group_name",
    "часов (план)": "hours_plan",
    "часы": "hours_plan",
    "план": "hours_plan",
    "семестр": "semester",
    "аудитория": "room",
    "день недели": "day_of_week",
    "пара": "lesson_number",
    "номер пары": "lesson_number",
}

# Словарь сопоставления колонок для ведомостей успеваемости
GRADES_COLUMNS = {
    "фио студента": "student_name",
    "студент": "student_name",
    "фио": "student_name",
    "группа": "group_name",
    "дисциплина": "discipline_name",
    "предмет": "discipline_name",
    "оценка": "grade",
    "балл": "grade",
    "семестр": "semester",
    "дата": "date",
}


def _extract_header_mapping(header_row: tuple, expected_columns: Dict[str, str]) -> Dict[str, int]:
    """Строит карту индексов колонок на основе заголовка таблицы."""
    mapping = {}
    for idx, cell in enumerate(header_row):
        val = str(cell).strip().lower() if cell is not None else ""
        if val in expected_columns:
            canonical_name = expected_columns[val]
            mapping[canonical_name] = idx
    return mapping


def import_workload_from_excel(file_obj) -> Dict[str, Any]:
    """
    Импортирует распределение учебной нагрузки из файла Excel.
    """
    wb = openpyxl.load_workbook(file_obj, data_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return {"success": False, "created": 0, "errors": ["Файл пуст."]}

    col_map = _extract_header_mapping(rows[0], WORKLOAD_COLUMNS)

    required_fields = ["teacher_name", "discipline_name", "group_name", "hours_plan", "semester"]
    missing = [f for f in required_fields if f not in col_map]
    if missing:
        return {
            "success": False,
            "created": 0,
            "errors": [f"В таблице отсутствуют обязательные колонки: {', '.join(missing)}"],
        }

    created_count = 0
    errors = []

    with transaction.atomic():
        for row_idx, row in enumerate(rows[1:], start=2):
            # Пропускаем пустые строки
            if not any(row):
                continue

            try:
                _process_single_workload_row(row, col_map)
                created_count += 1
            except Exception as e:
                errors.append(f"Строка {row_idx}: {str(e)}")

    return {
        "success": len(errors) == 0,
        "created": created_count,
        "errors": errors,
    }


def _process_single_workload_row(row: tuple, col_map: Dict[str, int]) -> None:
    """Обрабатывает одну строку таблицы нагрузки."""
    t_name = str(row[col_map["teacher_name"]] or "").strip()
    d_name = str(row[col_map["discipline_name"]] or "").strip()
    g_name = str(row[col_map["group_name"]] or "").strip()
    semester = str(row[col_map["semester"]] or "").strip()
    hours_plan = int(row[col_map["hours_plan"]] or 0)

    room = str(row[col_map["room"]] or "").strip() if "room" in col_map and row[col_map["room"]] else ""
    day = int(row[col_map["day_of_week"]]) if "day_of_week" in col_map and row[col_map["day_of_week"]] else None
    lesson = int(row[col_map["lesson_number"]]) if "lesson_number" in col_map and row[col_map["lesson_number"]] else None

    # Поиск преподавателя
    teacher = Teacher.objects.filter(full_name__iexact=t_name).first()
    if not teacher:
        raise ValueError(f"Преподаватель '{t_name}' не найден в системе.")

    # Поиск или создание дисциплины
    discipline = Discipline.objects.filter(name__iexact=d_name).first()
    if not discipline:
        code = f"IMP-{abs(hash(d_name)) % 10000:04d}"
        discipline = Discipline.objects.create(name=d_name, code=code, total_hours=hours_plan)

    # Поиск или создание группы
    group = StudyGroup.objects.filter(name__iexact=g_name).first()
    if not group:
        group = StudyGroup.objects.create(
            name=g_name,
            direction_code="09.03.01",
            direction_name="Общий профиль",
            course=1,
            year=datetime.now().year,
        )

    # Проверка коллизий
    conflict_data = {
        "teacher": teacher.id,
        "group": group.id,
        "room": room,
        "semester": semester,
        "day_of_week": day,
        "lesson_number": lesson,
    }
    conflicts = check_schedule_conflict(conflict_data)
    if conflicts:
        raise ValueError(f"Конфликт в расписании (пара {lesson}, день {day}, ауд. {room})")

    Workload.objects.create(
        teacher=teacher,
        discipline=discipline,
        group=group,
        semester=semester,
        hours_plan=hours_plan,
        room=room,
        day_of_week=day,
        lesson_number=lesson,
    )


def import_grades_from_excel(file_obj, default_semester: Optional[str] = None) -> Dict[str, Any]:
    """
    Импортирует оценки студентов из файла Excel.
    """
    wb = openpyxl.load_workbook(file_obj, data_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return {"success": False, "created": 0, "errors": ["Файл пуст."]}

    col_map = _extract_header_mapping(rows[0], GRADES_COLUMNS)

    required_fields = ["student_name", "discipline_name", "grade"]
    missing = [f for f in required_fields if f not in col_map]
    if missing:
        return {
            "success": False,
            "created": 0,
            "errors": [f"Отсутствуют обязательные колонки: {', '.join(missing)}"],
        }

    created_count = 0
    errors = []

    with transaction.atomic():
        for row_idx, row in enumerate(rows[1:], start=2):
            if not any(row):
                continue

            try:
                _process_single_grade_row(row, col_map, default_semester)
                created_count += 1
            except Exception as e:
                errors.append(f"Строка {row_idx}: {str(e)}")

    return {
        "success": len(errors) == 0,
        "created": created_count,
        "errors": errors,
    }


def _process_single_grade_row(row: tuple, col_map: Dict[str, int], default_semester: Optional[str]) -> None:
    """Обрабатывает одну строку ведомости оценок."""
    s_name = str(row[col_map["student_name"]] or "").strip()
    d_name = str(row[col_map["discipline_name"]] or "").strip()
    grade_val = float(row[col_map["grade"]] or 0.0)

    if not (2.0 <= grade_val <= 5.0):
        raise ValueError(f"Недопустимая оценка: {grade_val}. Должна быть от 2.0 до 5.0")

    sem = (
        str(row[col_map["semester"]]).strip()
        if "semester" in col_map and row[col_map["semester"]]
        else default_semester or "2024-1"
    )

    # Ищем студента
    student = Student.objects.filter(full_name__iexact=s_name).first()
    if not student:
        # Если указана группа — создаем студента
        g_name = str(row[col_map["group_name"]]).strip() if "group_name" in col_map and row[col_map["group_name"]] else "БПИ-22-1"
        group, _ = StudyGroup.objects.get_or_create(
            name=g_name,
            defaults={"direction_code": "09.03.01", "direction_name": "Информатика", "course": 1, "year": 2022},
        )
        student = Student.objects.create(full_name=s_name, group=group)

    discipline, _ = Discipline.objects.get_or_create(
        name=d_name,
        defaults={"code": f"DISC-{abs(hash(d_name)) % 10000:04d}", "total_hours": 72},
    )

    Grade.objects.update_or_create(
        student=student,
        discipline=discipline,
        semester=sem,
        defaults={
            "grade": grade_val,
            "source": Grade.EXCEL,
        },
    )


def import_grades_from_lms(course_id: Optional[str] = None, semester: str = "2024-1") -> Dict[str, Any]:
    """
    Импортирует оценки из настроенной LMS (Mock или реальный Moodle).
    """
    client = get_lms_client()

    if not client.is_available():
        return {"success": False, "synced": 0, "errors": ["LMS недоступна."]}

    target_course_id = course_id or "c001"
    lms_grades = client.get_grades(target_course_id)

    synced_count = 0
    errors = []

    with transaction.atomic():
        for item in lms_grades:
            try:
                # Поиск или создание студента
                student = Student.objects.filter(full_name__iexact=item.student_name).first()
                if not student:
                    default_group, _ = StudyGroup.objects.get_or_create(
                        name="БПИ-22-1",
                        defaults={"direction_code": "09.03.01", "direction_name": "Информатика", "course": 2, "year": 2022},
                    )
                    student = Student.objects.create(full_name=item.student_name, group=default_group)

                discipline, _ = Discipline.objects.get_or_create(
                    name=item.discipline_name,
                    defaults={"code": f"LMS-{abs(hash(item.discipline_name)) % 1000:03d}", "total_hours": 72},
                )

                Grade.objects.update_or_create(
                    student=student,
                    discipline=discipline,
                    semester=semester,
                    defaults={
                        "grade": item.grade,
                        "source": item.source,
                    },
                )
                synced_count += 1
            except Exception as e:
                errors.append(f"Ошибка студента {item.student_name}: {str(e)}")

    return {
        "success": True,
        "synced": synced_count,
        "errors": errors,
        "source": client.__class__.__name__,
    }
