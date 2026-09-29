"""
Тесты модуля аутентификации и пользователей:
- Модель User и ролевая логика
- Сервисный слой аутентификации и токенов
- Эндпоинты /api/auth/login/, /api/auth/refresh/, /api/auth/me/
- Классы прав доступа (Permissions)
"""

import pytest
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIClient

from auth_app.permissions import (
    IsAdminRole,
    IsHead,
    IsHeadOrAdmin,
    IsTeacher,
    IsTeacherOrAbove,
)
from auth_app.services import (
    authenticate_user_credentials,
    generate_jwt_tokens_for_user,
    get_user_profile_payload,
)
from .factories import UserFactory


@pytest.mark.django_db
class TestUserModel:
    """Тестирование модели User."""

    def test_user_creation_and_string_representation(self):
        user = UserFactory(username="petrov", role="head")
        assert str(user) == "petrov (Заведующий кафедрой)"
        assert user.is_head is True
        assert user.is_teacher is False
        assert user.is_admin_role is False

    def test_role_properties(self):
        teacher = UserFactory(role="teacher")
        admin_user = UserFactory(role="admin")

        assert teacher.is_teacher is True
        assert teacher.is_head is False

        assert admin_user.is_admin_role is True
        assert admin_user.is_teacher is False


@pytest.mark.django_db
class TestAuthServices:
    """Тестирование сервисного слоя auth_app."""

    def test_authenticate_user_success(self):
        user = UserFactory(username="ivanov", password="SecretPassword123")
        authenticated = authenticate_user_credentials("ivanov", "SecretPassword123")
        assert authenticated.id == user.id

    def test_authenticate_user_wrong_password(self):
        UserFactory(username="ivanov", password="SecretPassword123")
        with pytest.raises(AuthenticationFailed) as exc_info:
            authenticate_user_credentials("ivanov", "WrongPassword")
        assert "Неверное имя пользователя" in str(exc_info.value.detail)

    def test_authenticate_inactive_user(self):
        UserFactory(username="inactive_user", password="Password123", is_active=False)
        with pytest.raises(AuthenticationFailed) as exc_info:
            authenticate_user_credentials("inactive_user", "Password123")
        assert "деактивирована" in str(exc_info.value.detail)

    def test_generate_jwt_tokens_for_user(self):
        user = UserFactory(username="sidorov", role="head", email="sidorov@misis.ru")
        tokens = generate_jwt_tokens_for_user(user)

        assert "access" in tokens
        assert "refresh" in tokens
        assert isinstance(tokens["access"], str)
        assert isinstance(tokens["refresh"], str)

    def test_get_user_profile_payload(self):
        user = UserFactory(username="kozlov", role="teacher", email="kozlov@misis.ru")
        payload = get_user_profile_payload(user)

        assert payload["id"] == user.id
        assert payload["username"] == "kozlov"
        assert payload["role"] == "teacher"
        assert payload["is_teacher"] is True
        assert payload["is_head"] is False


@pytest.mark.django_db
class TestAuthAPIEndpoints:
    """Тестирование REST API эндпоинтов авторизации."""

    def setup_method(self):
        self.client = APIClient()

    def test_login_success(self):
        user = UserFactory(username="teacher1", password="SecurePassword123", role="teacher")

        response = self.client.post(
            "/api/auth/login/",
            {"username": "teacher1", "password": "SecurePassword123"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert "access" in data
        assert "refresh" in data
        assert data["user"]["username"] == "teacher1"
        assert data["user"]["role"] == "teacher"

    def test_login_invalid_credentials(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "non_existent", "password": "wrong_password"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_refresh(self):
        user = UserFactory(username="user_refresh", password="Password123")
        tokens = generate_jwt_tokens_for_user(user)

        response = self.client.post(
            "/api/auth/refresh/",
            {"refresh": tokens["refresh"]},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_current_user_me_unauthorized(self):
        response = self.client.get("/api/auth/me/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_current_user_me_authorized(self):
        user = UserFactory(username="head_user", role="head", email="head@misis.ru")
        tokens = generate_jwt_tokens_for_user(user)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        response = self.client.get("/api/auth/me/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "head_user"
        assert response.data["role"] == "head"
        assert response.data["is_head"] is True


@pytest.mark.django_db
class TestPermissions:
    """Тестирование классов прав доступа."""

    class MockRequest:
        def __init__(self, user):
            self.user = user

    def test_is_head_permission(self):
        perm = IsHead()
        head = UserFactory(role="head")
        teacher = UserFactory(role="teacher")

        assert perm.has_permission(self.MockRequest(head), None) is True
        assert perm.has_permission(self.MockRequest(teacher), None) is False

    def test_is_teacher_permission(self):
        perm = IsTeacher()
        head = UserFactory(role="head")
        teacher = UserFactory(role="teacher")

        assert perm.has_permission(self.MockRequest(teacher), None) is True
        assert perm.has_permission(self.MockRequest(head), None) is False

    def test_is_head_or_admin_permission(self):
        perm = IsHeadOrAdmin()
        head = UserFactory(role="head")
        admin_user = UserFactory(role="admin")
        teacher = UserFactory(role="teacher")

        assert perm.has_permission(self.MockRequest(head), None) is True
        assert perm.has_permission(self.MockRequest(admin_user), None) is True
        assert perm.has_permission(self.MockRequest(teacher), None) is False
