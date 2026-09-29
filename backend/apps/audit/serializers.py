"""
Сериализаторы для журнала аудита.
"""

from rest_framework import serializers

from .models import AuditLog


class AuditLogListSerializer(serializers.ModelSerializer):
    """Облегчённый сериализатор для таблицы журнала аудита."""

    user_username = serializers.CharField(
        source="user.username",
        read_only=True,
        default="Система",
    )
    action_display = serializers.CharField(
        source="get_action_display",
        read_only=True,
    )

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "user_username",
            "action",
            "action_display",
            "table_name",
            "object_id",
            "ip_address",
            "created_at",
        ]


class AuditLogDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор записи аудита со снимками изменений."""

    user_username = serializers.CharField(
        source="user.username",
        read_only=True,
        default="Система",
    )
    action_display = serializers.CharField(
        source="get_action_display",
        read_only=True,
    )

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "user_username",
            "action",
            "action_display",
            "table_name",
            "object_id",
            "old_value",
            "new_value",
            "ip_address",
            "created_at",
            "updated_at",
        ]
