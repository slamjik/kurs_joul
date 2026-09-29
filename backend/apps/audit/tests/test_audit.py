"""
Тесты модуля «Журнал аудита»:
- Модель AuditLog
- Сервис логирования record_audit_log
- Автоматический аудит через AuditMiddleware
- API эндпоинты журнала аудита и разграничение прав
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from audit.models import AuditLog
from audit.services import record_audit_log
from auth_app.services import generate_jwt_tokens_for_user
from auth_app.tests.factories import UserFactory
from workload.tests.factories import DisciplineFactory, StudyGroupFactory, TeacherFactory


@pytest.mark.django_db
class TestAuditModelAndServices:
    """Тестирование модели AuditLog и сервисного слоя."""

    def test_audit_log_creation_and_str(self):
        user = UserFactory(username="admin_user", role="admin")
        entry = record_audit_log(
            user=user,
            action="CREATE",
            table_name="Workload",
            object_id="42",
            new_value={"hours": 72},
            ip_address="127.0.0.1",
        )

        assert entry is not None
        assert entry.action == "CREATE"
        assert entry.table_name == "Workload"
        assert entry.object_id == "42"
        assert "admin_user" in str(entry)
        assert "Создание" in str(entry)

    def test_record_audit_handles_exceptions_gracefully(self, monkeypatch):
        from unittest.mock import MagicMock

        monkeypatch.setattr(AuditLog.objects, "create", MagicMock(side_effect=Exception("Database error")))
        result = record_audit_log(
            user=None,
            action="CREATE",
            table_name="Test",
        )
        assert result is None


@pytest.mark.django_db
class TestAuditMiddlewareAndAPI:
    """Тестирование автоматического аудита через Middleware и эндпоинтов API."""

    def setup_method(self):
        self.client = APIClient()
        self.head_user = UserFactory(role="head")
        self.head_tokens = generate_jwt_tokens_for_user(self.head_user)

        self.teacher_user = UserFactory(role="teacher")
        self.teacher_tokens = generate_jwt_tokens_for_user(self.teacher_user)

    def test_audit_middleware_records_mutating_requests(self):
        teacher = TeacherFactory()
        group = StudyGroupFactory()
        disc = DisciplineFactory()

        initial_count = AuditLog.objects.count()

        # Завкафедрой выполняет POST запрос на создание нагрузки
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        response = self.client.post(
            "/api/workload/",
            {
                "teacher": teacher.id,
                "group": group.id,
                "discipline": disc.id,
                "hours_plan": 36,
                "semester": "2024-1",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        # Middleware должен был зафиксировать операцию в AuditLog
        assert AuditLog.objects.count() == initial_count + 1
        latest = AuditLog.objects.latest("created_at")
        assert latest.user == self.head_user
        assert latest.action == "CREATE"

    def test_get_audit_logs_api_permissions(self):
        # Преподаватель не имеет доступа к просмотру журнала аудита
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.teacher_tokens['access']}")
        resp_teacher = self.client.get("/api/audit/")
        assert resp_teacher.status_code == status.HTTP_403_FORBIDDEN

        # Завкафедрой имеет полный доступ
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        resp_head = self.client.get("/api/audit/")
        assert resp_head.status_code == status.HTTP_200_OK
        assert "results" in resp_head.data
