"""
Представления (Views) модуля «Журнал аудита».
"""

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets

from auth_app.permissions import IsHeadOrAdmin
from .models import AuditLog
from .serializers import AuditLogDetailSerializer, AuditLogListSerializer


@extend_schema(tags=["Журнал аудита"])
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Просмотр журнала аудита изменений системы KafIS.
    Доступно только заведующему кафедрой и администратору.
    """

    queryset = AuditLog.objects.select_related("user").all()
    permission_classes = [IsHeadOrAdmin]

    def get_serializer_class(self):
        if self.action == "list":
            return AuditLogListSerializer
        return AuditLogDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        action_param = self.request.query_params.get("action")
        table_param = self.request.query_params.get("table_name")
        user_param = self.request.query_params.get("user")

        if action_param:
            qs = qs.filter(action=action_param.upper())
        if table_param:
            qs = qs.filter(table_name__icontains=table_param)
        if user_param:
            qs = qs.filter(user_id=user_param)

        return qs
