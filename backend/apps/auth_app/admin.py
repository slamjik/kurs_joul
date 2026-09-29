"""
Настройка отображения модели User в Django Admin.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Кастомная админка для пользователя с отображением роли."""

    list_display = (
        "username",
        "email",
        "role",
        "is_active",
        "is_staff",
        "created_at",
    )
    list_filter = (
        "role",
        "is_active",
        "is_staff",
    )
    search_fields = (
        "username",
        "email",
        "first_name",
        "last_name",
    )
    ordering = ("username",)

    # Добавляем поле роли в формы редактирования пользователя
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Роль в KafIS", {"fields": ("role",)}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Роль в KafIS", {"fields": ("role",)}),
    )
