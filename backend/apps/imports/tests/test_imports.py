"""
Тесты модуля импорта данных:
- Импорт учебной нагрузки из Excel (.xlsx)
- Импорт оценок из Excel (.xlsx)
- Интеграция с LMS (MockLMSClient, MoodleClient, фабрика)
- API эндпоинты импорта с проверкой ролей
"""

import io
import openpyxl
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from auth_app.services import generate_jwt_tokens_for_user
from auth_app.tests.factories import UserFactory
from grades.models import Grade, Student
from imports.lms.factory import get_lms_client
from imports.lms.mock_client import MockLMSClient
from imports.services import (
    import_grades_from_excel,
    import_grades_from_lms,
    import_workload_from_excel,
)
from workload.models import Workload
from workload.tests.factories import TeacherFactory


def create_in_memory_excel(headers: list, rows: list) -> io.BytesIO:
    """Вспомогательная функция для генерации Excel файлов в памяти."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(headers)
    for row in rows:
        ws.append(row)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


@pytest.mark.django_db
class TestExcelImportServices:
    """Тестирование сервисов импорта данных из Excel."""

    def test_import_workload_from_excel_success(self):
        teacher = TeacherFactory(full_name="Смирнов Сергей Николаевич")

        headers = [
            "ФИО преподавателя",
            "Дисциплина",
            "Группа",
            "Часов (план)",
            "Семестр",
            "Аудитория",
        ]
        rows = [
            ["Смирнов Сергей Николаевич", "Экономическая теория", "БПИ-22-1", 72, "2024-1", "201"],
            ["Смирнов Сергей Николаевич", "Менеджмент", "БПИ-22-1", 36, "2024-1", "202"],
        ]

        excel_file = create_in_memory_excel(headers, rows)
        result = import_workload_from_excel(excel_file)

        assert result["success"] is True
        assert result["created"] == 2
        assert len(result["errors"]) == 0
        assert Workload.objects.filter(teacher=teacher).count() == 2

    def test_import_workload_missing_teacher_error(self):
        headers = ["ФИО преподавателя", "Дисциплина", "Группа", "Часов (план)", "Семестр"]
        rows = [["Несуществующий Преподаватель", "Философия", "БПИ-22-1", 36, "2024-1"]]

        excel_file = create_in_memory_excel(headers, rows)
        result = import_workload_from_excel(excel_file)

        assert result["created"] == 0
        assert len(result["errors"]) == 1
        assert "не найден" in result["errors"][0]

    def test_import_grades_from_excel_success(self):
        headers = ["ФИО студента", "Группа", "Дисциплина", "Оценка", "Семестр"]
        rows = [
            ["Иванов Петр", "БПИ-22-1", "Социология", 4.0, "2024-1"],
            ["Петров Иван", "БПИ-22-1", "Социология", 2.0, "2024-1"],
        ]

        excel_file = create_in_memory_excel(headers, rows)
        result = import_grades_from_excel(excel_file)

        assert result["success"] is True
        assert result["created"] == 2
        assert Grade.objects.filter(semester="2024-1", source=Grade.EXCEL).count() == 2


@pytest.mark.django_db
class TestLMSIntegration:
    """Тестирование LMS адаптера и фабрики."""

    def test_lms_factory_returns_mock_client(self):
        client = get_lms_client()
        assert isinstance(client, MockLMSClient)
        assert client.is_available() is True

    def test_mock_lms_client_methods(self):
        client = MockLMSClient()
        courses = client.get_courses()
        assert len(courses) >= 3

        grades = client.get_grades("c001")
        assert len(grades) > 0
        assert all(2.0 <= g.grade <= 5.0 for g in grades)

    def test_import_grades_from_lms_service(self):
        result = import_grades_from_lms(course_id="c001", semester="2024-1")

        assert result["success"] is True
        assert result["synced"] > 0
        assert result["source"] == "MockLMSClient"
        assert Grade.objects.filter(source="mock").exists()


@pytest.mark.django_db
class TestImportAPIEndpoints:
    """Тестирование API эндпоинтов загрузки Excel и запуска LMS синхронизации."""

    def setup_method(self):
        self.client = APIClient()
        self.head_user = UserFactory(role="head")
        self.head_tokens = generate_jwt_tokens_for_user(self.head_user)

        self.teacher_user = UserFactory(role="teacher")
        self.teacher_tokens = generate_jwt_tokens_for_user(self.teacher_user)

    def test_workload_excel_import_api(self):
        TeacherFactory(full_name="Иванов И.И.")
        excel_bytes = create_in_memory_excel(
            ["ФИО преподавателя", "Дисциплина", "Группа", "Часов (план)", "Семестр"],
            [["Иванов И.И.", "Право", "БПИ-22-1", 54, "2024-1"]],
        )

        uploaded = SimpleUploadedFile(
            "workload.xlsx", excel_bytes.read(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        response = self.client.post("/api/workload/import/", {"file": uploaded}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] == 1

    def test_grades_excel_import_api(self):
        excel_bytes = create_in_memory_excel(
            ["ФИО студента", "Группа", "Дисциплина", "Оценка", "Семестр"],
            [["Смирнов Олег", "БПИ-22-1", "История", 5.0, "2024-1"]],
        )

        uploaded = SimpleUploadedFile(
            "grades.xlsx", excel_bytes.read(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        response = self.client.post("/api/grades/import/", {"file": uploaded}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] == 1

    def test_teacher_forbidden_from_import(self):
        excel_bytes = create_in_memory_excel(["A"], [["B"]])
        uploaded = SimpleUploadedFile("test.xlsx", excel_bytes.read())

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.teacher_tokens['access']}")
        response = self.client.post("/api/workload/import/", {"file": uploaded}, format="multipart")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_lms_status_and_import_api(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")

        # Проверка статуса LMS
        status_resp = self.client.get("/api/grades/lms-status/")
        assert status_resp.status_code == status.HTTP_200_OK
        assert status_resp.data["is_available"] is True

        # Запуск импорта из LMS
        import_resp = self.client.post("/api/grades/import-lms/", {"course_id": "c001", "semester": "2024-1"})
        assert import_resp.status_code == status.HTTP_200_OK
        assert import_resp.data["synced"] > 0
