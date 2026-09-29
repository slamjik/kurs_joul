"""
Маршруты модуля «Планирование нагрузки».
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from imports.views import WorkloadExcelImportView
from reports.views import WorkloadExcelExportView
from .views import (
    DepartmentViewSet,
    DisciplineViewSet,
    StudyGroupViewSet,
    TeacherViewSet,
    WorkloadViewSet,
)

app_name = "workload"

router = DefaultRouter()
router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"teachers", TeacherViewSet, basename="teacher")
router.register(r"groups", StudyGroupViewSet, basename="group")
router.register(r"disciplines", DisciplineViewSet, basename="discipline")
router.register(r"", WorkloadViewSet, basename="workload")

urlpatterns = [
    # Импорт и экспорт нагрузки:
    path("import/", WorkloadExcelImportView.as_view(), name="workload-import"),
    path("export/", WorkloadExcelExportView.as_view(), name="workload-export"),
    path("", include(router.urls)),
]
