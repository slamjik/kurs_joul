"""
Маршруты модуля «Мониторинг успеваемости».
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from imports.views import GradesExcelImportView, LMSGradesImportView, LMSStatusView
from .views import GradeViewSet, StudentViewSet

app_name = "grades"

router = DefaultRouter()
router.register(r"students", StudentViewSet, basename="student")
router.register(r"", GradeViewSet, basename="grade")

urlpatterns = [
    # Импорт оценок: POST /api/grades/import/
    path("import/", GradesExcelImportView.as_view(), name="grades-import"),
    # Импорт из LMS (Moodle/Mock): POST /api/grades/import-lms/
    path("import-lms/", LMSGradesImportView.as_view(), name="grades-import-lms"),
    # Статус подключения LMS: GET /api/grades/lms-status/
    path("lms-status/", LMSStatusView.as_view(), name="grades-lms-status"),
    path("", include(router.urls)),
]
