"""
Представления (Views) модуля «Экспорт отчётов».
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.views import APIView

from auth_app.permissions import IsTeacherOrAbove
from .services import (
    export_grades_excel,
    export_grades_pdf,
    export_workload_excel,
    export_workload_pdf,
)


class WorkloadExcelExportView(APIView):
    """Выгрузка распределения нагрузки в Excel."""

    permission_classes = [IsTeacherOrAbove]

    @extend_schema(
        tags=["Экспорт отчётов"],
        summary="Экспорт учебной нагрузки в Excel (.xlsx)",
        description="Генерирует форматированный файл Excel с таблицей учебных часов кафедры.",
        parameters=[
            OpenApiParameter(name="semester", type=str, required=False, description="Семестр (например: 2024-1)"),
            OpenApiParameter(name="teacher", type=int, required=False, description="ID преподавателя"),
        ],
        responses={
            (200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"): OpenApiResponse(
                description="Файл Excel с таблицей учебной нагрузки",
                response=OpenApiTypes.BINARY,
            ),
        },
    )
    def get(self, request):
        return export_workload_excel(request.query_params)


class GradesExcelExportView(APIView):
    """Выгрузка ведомости успеваемости в Excel."""

    permission_classes = [IsTeacherOrAbove]

    @extend_schema(
        tags=["Экспорт отчётов"],
        summary="Экспорт ведомости успеваемости в Excel (.xlsx)",
        description="Генерирует форматированный файл Excel со списком оценок студентов.",
        parameters=[
            OpenApiParameter(name="semester", type=str, required=False, description="Семестр (например: 2024-1)"),
            OpenApiParameter(name="group", type=int, required=False, description="ID группы"),
            OpenApiParameter(name="discipline", type=int, required=False, description="ID дисциплины"),
        ],
        responses={
            (200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"): OpenApiResponse(
                description="Файл Excel с ведомостью оценок",
                response=OpenApiTypes.BINARY,
            ),
        },
    )
    def get(self, request):
        return export_grades_excel(request.query_params)


class WorkloadPdfExportView(APIView):
    """Генерация официальной PDF-ведомости учебной нагрузки."""

    permission_classes = [IsTeacherOrAbove]

    @extend_schema(
        tags=["Экспорт отчётов"],
        summary="Экспорт учебной нагрузки в PDF",
        description="Формирует официальный печатный PDF-документ кафедры с подписями.",
        parameters=[
            OpenApiParameter(name="semester", type=str, required=False, description="Семестр (например: 2024-1)"),
        ],
        responses={
            (200, "application/pdf"): OpenApiResponse(
                description="Печатная ведомость учебной нагрузки (PDF)",
                response=OpenApiTypes.BINARY,
            ),
        },
    )
    def get(self, request):
        return export_workload_pdf(request.query_params)


class GradesPdfExportView(APIView):
    """Генерация официальной PDF-ведомости успеваемости студентов."""

    permission_classes = [IsTeacherOrAbove]

    @extend_schema(
        tags=["Экспорт отчётов"],
        summary="Экспорт ведомости успеваемости в PDF",
        description="Формирует официальный экзаменационный/зачетный лист с оценками и подписями.",
        parameters=[
            OpenApiParameter(name="semester", type=str, required=False, description="Семестр (например: 2024-1)"),
            OpenApiParameter(name="group", type=int, required=False, description="ID группы"),
            OpenApiParameter(name="discipline", type=int, required=False, description="ID дисциплины"),
        ],
        responses={
            (200, "application/pdf"): OpenApiResponse(
                description="Печатная ведомость успеваемости студентов (PDF)",
                response=OpenApiTypes.BINARY,
            ),
        },
    )
    def get(self, request):
        return export_grades_pdf(request.query_params)

