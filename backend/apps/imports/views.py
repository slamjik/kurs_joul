"""
Представления (Views) модуля импорта данных.
"""

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from auth_app.permissions import IsHeadOrAdmin
from .lms.factory import get_lms_client
from .serializers import (
    FileUploadSerializer,
    ImportResultSerializer,
    LMSImportRequestSerializer,
    LMSStatusResponseSerializer,
)
from .services import (
    import_grades_from_excel,
    import_grades_from_lms,
    import_workload_from_excel,
)


class WorkloadExcelImportView(APIView):
    """Эндпоинт для загрузки файла Excel с учебной нагрузкой."""

    permission_classes = [IsHeadOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        tags=["Импорт данных"],
        summary="Импорт учебной нагрузки из Excel (.xlsx)",
        description="Принимает файл Excel с колонками преподавателя, предмета, группы, часов и аудитории.",
        request=FileUploadSerializer,
        responses={status.HTTP_200_OK: ImportResultSerializer},
    )
    def post(self, request):
        serializer = FileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file_obj = serializer.validated_data["file"]
        result = import_workload_from_excel(file_obj)

        http_status = status.HTTP_200_OK if result["created"] > 0 or not result["errors"] else status.HTTP_400_BAD_REQUEST
        return Response(result, status=http_status)


class GradesExcelImportView(APIView):
    """Эндпоинт для загрузки файла Excel с оценками студентов."""

    permission_classes = [IsHeadOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        tags=["Импорт данных"],
        summary="Импорт оценок студентов из Excel (.xlsx)",
        description="Принимает ведомость оценок в формате Excel и сохраняет оценки в базу данных.",
        request=FileUploadSerializer,
        responses={status.HTTP_200_OK: ImportResultSerializer},
    )
    def post(self, request):
        serializer = FileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file_obj = serializer.validated_data["file"]
        semester = serializer.validated_data.get("semester")

        result = import_grades_from_excel(file_obj, default_semester=semester)

        http_status = status.HTTP_200_OK if result["created"] > 0 or not result["errors"] else status.HTTP_400_BAD_REQUEST
        return Response(result, status=http_status)


class LMSGradesImportView(APIView):
    """Эндпоинт запуска импорта оценок из LMS (Moodle или Mock)."""

    permission_classes = [IsHeadOrAdmin]

    @extend_schema(
        tags=["Импорт данных"],
        summary="Импорт оценок из LMS (Moodle / Mock)",
        description="Запускает процедуру синхронизации оценок по выбранному курсу из LMS.",
        request=LMSImportRequestSerializer,
        responses={status.HTTP_200_OK: ImportResultSerializer},
    )
    def post(self, request):
        serializer = LMSImportRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course_id = serializer.validated_data.get("course_id")
        semester = serializer.validated_data.get("semester", "2024-1")

        result = import_grades_from_lms(course_id=course_id, semester=semester)
        return Response(result, status=status.HTTP_200_OK)


class LMSStatusView(APIView):
    """Эндпоинт проверки статуса подключения и доступных курсов в LMS."""

    permission_classes = [IsHeadOrAdmin]

    @extend_schema(
        tags=["Импорт данных"],
        summary="Статус подключения к LMS",
        description="Возвращает тип активного клиента LMS, статус доступности и список курсов.",
        responses={status.HTTP_200_OK: LMSStatusResponseSerializer},
    )
    def get(self, request):
        client = get_lms_client()
        available = client.is_available()
        courses = client.get_courses() if available else []

        return Response(
            {
                "backend": client.__class__.__name__,
                "is_available": available,
                "courses": courses,
            },
            status=status.HTTP_200_OK,
        )
