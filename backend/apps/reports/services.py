"""
Сервисный слой модуля «Экспорт отчётов».
Вся бизнес-логика:
- Выгрузка учебной нагрузки в Excel (.xlsx) с фирменным стилем
- Выгрузка ведомостей оценок в Excel (.xlsx)
- Генерация PDF-отчётов на базе HTML-шаблонов через WeasyPrint
"""

from datetime import datetime
import io
import logging
from typing import Any, Dict

from django.http import HttpResponse
from django.template.loader import render_to_string
import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from grades.models import Grade
from workload.models import Workload

logger = logging.getLogger(__name__)

# Фирменный синий цвет KafIS (#1a56db)
BRAND_BLUE_HEX = "1A56DB"


def _apply_table_styling(ws, header_fill_color=BRAND_BLUE_HEX) -> None:
    """Применяет единообразные стили, рамки и автоширину колонок к листу Excel."""
    thin_border = Border(
        left=Side(style="thin", color="CBD5E0"),
        right=Side(style="thin", color="CBD5E0"),
        top=Side(style="thin", color="CBD5E0"),
        bottom=Side(style="thin", color="CBD5E0"),
    )
    header_fill = PatternFill(start_color=header_fill_color, end_color=header_fill_color, fill_type="solid")
    header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")

    # Стилизация шапки
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

    # Стилизация строк данных и автоширина
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.border = thin_border
            cell.font = Font(name="Arial", size=10)

    # Автоподбор ширины столбцов
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val_str = str(cell.value or "")
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)


def export_workload_excel(params: Dict[str, Any]) -> HttpResponse:
    """
    Экспортирует распределение учебной нагрузки в формате .xlsx.
    """
    qs = Workload.objects.select_related("teacher", "discipline", "group").all()

    semester = params.get("semester")
    teacher_id = params.get("teacher")
    if semester:
        qs = qs.filter(semester=semester)
    if teacher_id:
        qs = qs.filter(teacher_id=teacher_id)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Учебная нагрузка"

    headers = [
        "Преподаватель",
        "Дисциплина",
        "Группа",
        "Семестр",
        "План (ч)",
        "Факт (ч)",
        "Аудитория",
        "День недели",
        "Пара",
    ]
    ws.append(headers)

    for item in qs:
        ws.append([
            item.teacher.full_name,
            item.discipline.name,
            item.group.name,
            item.semester,
            item.hours_plan,
            item.hours_fact,
            item.room or "—",
            item.get_day_of_week_display() or "—",
            item.get_lesson_number_display() or "—",
        ])

    _apply_table_styling(ws)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"workload_{semester or 'all'}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    response = HttpResponse(
        output.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def export_grades_excel(params: Dict[str, Any]) -> HttpResponse:
    """
    Экспортирует ведомость успеваемости студентов в формате .xlsx.
    """
    qs = Grade.objects.select_related("student__group", "discipline", "teacher").all()

    semester = params.get("semester")
    group_id = params.get("group")
    discipline_id = params.get("discipline")

    if semester:
        qs = qs.filter(semester=semester)
    if group_id:
        qs = qs.filter(student__group_id=group_id)
    if discipline_id:
        qs = qs.filter(discipline_id=discipline_id)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Ведомость успеваемости"

    headers = [
        "ФИО студента",
        "Группа",
        "Дисциплина",
        "Оценка",
        "Семестр",
        "Преподаватель",
        "Дата",
        "Источник",
    ]
    ws.append(headers)

    for g in qs:
        teacher_name = g.teacher.full_name if g.teacher else "—"
        ws.append([
            g.student.full_name,
            g.student.group.name,
            g.discipline.name,
            g.grade,
            g.semester,
            teacher_name,
            g.date.isoformat() if g.date else "—",
            g.get_source_display(),
        ])

    _apply_table_styling(ws)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"grades_{semester or 'all'}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    response = HttpResponse(
        output.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _render_pdf_or_fallback(template_name: str, context: Dict[str, Any], filename: str) -> HttpResponse:
    """
    Генерирует PDF документ через WeasyPrint.
    Если на хосте отсутствуют нативные библиотеки GTK (типично для голой Windows без Docker),
    возвращает HTML с печатным CSS для предпросмотра и печати.
    """
    html_content = render_to_string(template_name, context)

    try:
        from weasyprint import HTML  # type: ignore

        pdf_bytes = HTML(string=html_content).write_pdf()
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}.pdf"'
        return response
    except Exception as e:
        logger.warning(
            f"WeasyPrint недоступен на данном окружении (требуется GTK3/Docker): {e}. "
            "Отдаем подготовленный HTML с печатными стилями."
        )
        response = HttpResponse(html_content, content_type="text/html; charset=utf-8")
        response["X-PDF-Fallback"] = "True"
        return response


def export_workload_pdf(params: Dict[str, Any]) -> HttpResponse:
    """
    Генерирует официальную PDF-ведомость распределения учебной нагрузки.
    """
    qs = Workload.objects.select_related("teacher", "discipline", "group").all()

    semester = params.get("semester")
    if semester:
        qs = qs.filter(semester=semester)

    total_plan = sum(item.hours_plan for item in qs)
    total_fact = sum(item.hours_fact for item in qs)

    context = {
        "items": list(qs),
        "semester": semester,
        "total_plan": total_plan,
        "total_fact": total_fact,
        "generated_date": datetime.now().strftime("%d.%m.%Y %H:%M"),
    }

    filename = f"workload_{semester or 'all'}_{datetime.now().strftime('%Y%m%d')}"
    return _render_pdf_or_fallback("reports/workload_pdf.html", context, filename)


def export_grades_pdf(params: Dict[str, Any]) -> HttpResponse:
    """
    Генерирует официальную PDF-ведомость успеваемости студентов.
    """
    qs = Grade.objects.select_related("student__group", "discipline", "teacher").all()

    semester = params.get("semester")
    group_id = params.get("group")
    discipline_id = params.get("discipline")

    group_name = ""
    discipline_name = ""

    if semester:
        qs = qs.filter(semester=semester)
    if group_id:
        qs = qs.filter(student__group_id=group_id)
        group_obj = qs.first()
        if group_obj:
            group_name = group_obj.student.group.name
    if discipline_id:
        qs = qs.filter(discipline_id=discipline_id)
        disc_obj = qs.first()
        if disc_obj:
            discipline_name = disc_obj.discipline.name

    context = {
        "items": list(qs),
        "semester": semester,
        "group_name": group_name,
        "discipline_name": discipline_name,
        "generated_date": datetime.now().strftime("%d.%m.%Y %H:%M"),
    }

    filename = f"grades_{semester or 'all'}_{datetime.now().strftime('%Y%m%d')}"
    return _render_pdf_or_fallback("reports/grades_pdf.html", context, filename)
