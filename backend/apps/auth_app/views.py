"""
Представления (Views) модуля аутентификации и пользователей.
"""

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .models import User
from .permissions import IsAdminRole
from .serializers import (
    CustomTokenObtainPairSerializer,
    LoginRequestSerializer,
    LoginResponseSerializer,
    UserDetailSerializer,
    UserListSerializer,
)


@extend_schema(
    tags=["Аутентификация"],
    summary="Авторизация пользователя (получение JWT токенов)",
    description="Принимает логин и пароль. Возвращает пару токенов (access, refresh) и профиль пользователя с его ролью.",
    request=LoginRequestSerializer,
    responses={
        status.HTTP_200_OK: OpenApiResponse(
            response=LoginResponseSerializer,
            description="Успешный вход в систему",
        ),
        status.HTTP_401_UNAUTHORIZED: OpenApiResponse(
            description="Неверный логин или пароль",
        ),
    },
)
class CustomTokenObtainPairView(TokenObtainPairView):
    """Эндпоинт входа в систему."""

    serializer_class = CustomTokenObtainPairSerializer


@extend_schema(
    tags=["Аутентификация"],
    summary="Обновление JWT access-токена",
    description="Принимает refresh-токен и возвращает новый access-токен.",
)
class CustomTokenRefreshView(TokenRefreshView):
    """Эндпоинт обновления access-токена по refresh-токену."""

    pass


class CurrentUserView(APIView):
    """
    Эндпоинт получения информации о текущем авторизованном пользователе.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Аутентификация"],
        summary="Получение профиля текущего пользователя",
        description="Возвращает ID, имя, email, роль и полномочия авторизованного пользователя.",
        responses={status.HTTP_200_OK: UserDetailSerializer},
    )
    def get(self, request):
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(tags=["Управление пользователями"])
class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD для управления пользователями системы KafIS.
    Доступно только администратору (admin).
    """

    queryset = User.objects.all().order_by("username")
    permission_classes = [IsAdminRole]

    def get_serializer_class(self):
        if self.action == "list":
            return UserListSerializer
        return UserDetailSerializer
