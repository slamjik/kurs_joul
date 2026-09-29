"""
Сервисный слой модуля аутентификации и пользователей.
Вся бизнес-логика авторизации, генерации токенов и проверки прав находится здесь.
"""

from typing import Any, Dict, Optional
from django.contrib.auth import authenticate
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


def authenticate_user_credentials(username: str, password: str) -> User:
    """
    Проверяет учетные данные пользователя.
    Возвращает экземпляр User или выбрасывает исключение AuthenticationFailed.
    """
    user = authenticate(username=username, password=password)
    if user is None:
        # Проверяем, существует ли пользователь и не деактивирован ли он
        existing_user = User.objects.filter(username=username).first()
        if existing_user and not existing_user.is_active and existing_user.check_password(password):
            raise AuthenticationFailed("Учетная запись пользователя деактивирована.")
        raise AuthenticationFailed("Неверное имя пользователя или пароль.")

    return user


def generate_jwt_tokens_for_user(user: User) -> Dict[str, str]:
    """
    Генерирует пару JWT токенов (access, refresh) для пользователя
    с добавлением кастомных claims (role, username, email).
    """
    refresh = RefreshToken.for_user(user)

    # Добавляем полезную нагрузку в токен для быстрой проверки на фронтенде
    refresh["role"] = user.role
    refresh["username"] = user.username
    refresh["email"] = user.email

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


def get_user_profile_payload(user: User) -> Dict[str, Any]:
    """
    Формирует словарь данных профиля текущего пользователя
    для ответа эндпоинта /api/auth/me/ и ответа при входе.
    """
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "is_active": user.is_active,
        "is_head": user.is_head,
        "is_teacher": user.is_teacher,
        "created_at": user.created_at,
    }
