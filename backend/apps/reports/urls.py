"""
Маршруты модуля «Экспорт отчётов».
"""

from django.urls import path

from .views import (
    GradesExcelExportView,
    GradesPdfExportView,
    WorkloadExcelExportView,
    WorkloadPdfExportView,
)

app_name = "reports"

urlpatterns = [
    # Экспорт в Excel:
    path("workload-excel/", WorkloadExcelExportView.as_view(), name="workload-excel"),
    path("grades-excel/", GradesExcelExportView.as_view(), name="grades-excel"),

    # Экспорт в PDF:
    path("workload-pdf/", WorkloadPdfExportView.as_view(), name="workload-pdf"),
    path("grades-pdf/", GradesPdfExportView.as_view(), name="grades-pdf"),
]
