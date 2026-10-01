"""
URL configuration for KafIS project.
"""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.routers import DefaultRouter

from grades.views import StudentViewSet
from workload.views import (
    DisciplineViewSet,
    StudyGroupViewSet,
    TeacherViewSet,
)

# Прямые роуты для справочников верхнего уровня:
# /api/teachers/, /api/students/, /api/groups/, /api/disciplines/
top_level_router = DefaultRouter()
top_level_router.register(r"teachers", TeacherViewSet, basename="direct-teacher")
top_level_router.register(r"students", StudentViewSet, basename="direct-student")
top_level_router.register(r"groups", StudyGroupViewSet, basename="direct-group")
top_level_router.register(r"disciplines", DisciplineViewSet, basename="direct-discipline")

urlpatterns = [
    # Django Admin
    path("admin/", admin.site.urls),

    # OpenAPI 3 Schema & Swagger / Redoc
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/schema/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),

    # Модули API
    path("api/auth/", include("auth_app.urls")),
    path("api/workload/", include("workload.urls")),
    path("api/grades/", include("grades.urls")),
    path("api/kpi/", include("kpi.urls")),
    path("api/reports/", include("reports.urls")),
    path("api/audit/", include("audit.urls")),
    path("api/surveys/", include("surveys.urls")),

    # Прямые эндпоинты справочников
    path("api/", include(top_level_router.urls)),
]
