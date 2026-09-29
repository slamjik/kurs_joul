"""
Маршруты модуля «Журнал аудита».
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AuditLogViewSet

app_name = "audit"

router = DefaultRouter()
router.register(r"", AuditLogViewSet, basename="audit-log")

urlpatterns = [
    path("", include(router.urls)),
]
