"""
Маршруты модуля аутентификации и пользователей.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CurrentUserView,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    UserViewSet,
)

app_name = "auth_app"

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")

urlpatterns = [
    # Аутентификация через JWT
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("me/", CurrentUserView.as_view(), name="current_user"),

    # Управление пользователями (администратор)
    path("", include(router.urls)),
]
