"""
Сериализаторы для модуля аутентификации и пользователей.
Следует правилу: один сериализатор — одна задача (List / Detail / Auth).
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User
from .services import (
    authenticate_user_credentials,
    generate_jwt_tokens_for_user,
    get_user_profile_payload,
)


class UserListSerializer(serializers.ModelSerializer):
    """Облегчённый сериализатор для списков пользователей."""

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "is_active",
        ]


class UserDetailSerializer(serializers.ModelSerializer):
    """Полный сериализатор профиля пользователя."""

    is_head = serializers.BooleanField(read_only=True)
    is_teacher = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "is_head",
            "is_teacher",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class LoginRequestSerializer(serializers.Serializer):
    """Схема запроса авторизации по логину и паролю."""

    username = serializers.CharField(
        required=True,
        help_text="Имя пользователя (логин)"
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
        help_text="Пароль пользователя",
    )


class LoginResponseSerializer(serializers.Serializer):
    """Схема ответа при успешной авторизации с JWT токенами."""

    access = serializers.CharField(help_text="Access токен (JWT, 60 минут)")
    refresh = serializers.CharField(help_text="Refresh токен (JWT, 7 дней)")
    user = UserDetailSerializer(help_text="Данные авторизованного пользователя")


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Кастомный сериализатор SimpleJWT:
    валидирует логин/пароль через сервисный слой и возвращает пару токенов + профиль.
    """

    def validate(self, attrs):
        username = attrs.get(self.username_field)
        password = attrs.get("password")

        # Вся валидация и проверка учетных данных — через services.py
        user = authenticate_user_credentials(username=username, password=password)
        tokens = generate_jwt_tokens_for_user(user)

        return {
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "user": get_user_profile_payload(user),
        }
