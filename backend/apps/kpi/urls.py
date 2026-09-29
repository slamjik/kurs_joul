"""
Маршруты модуля «KPI-дашборд и аналитика».
"""

from django.urls import path

from .views import (
    KpiDirectionsSummaryView,
    KpiGradesDynamicsView,
    KpiInvalidateCacheView,
    KpiQualityLevelsView,
    KpiSummaryView,
    KpiWorkloadChartView,
)

app_name = "kpi"

urlpatterns = [
    # GET /api/kpi/summary/
    path("summary/", KpiSummaryView.as_view(), name="kpi-summary"),
    # GET /api/kpi/quality-levels/
    path("quality-levels/", KpiQualityLevelsView.as_view(), name="kpi-quality-levels"),
    # GET /api/kpi/workload-chart/
    path("workload-chart/", KpiWorkloadChartView.as_view(), name="kpi-workload-chart"),
    # GET /api/kpi/grades-dynamics/
    path("grades-dynamics/", KpiGradesDynamicsView.as_view(), name="kpi-grades-dynamics"),
    # GET /api/kpi/directions-summary/
    path("directions-summary/", KpiDirectionsSummaryView.as_view(), name="kpi-directions-summary"),
    # POST /api/kpi/invalidate-cache/
    path("invalidate-cache/", KpiInvalidateCacheView.as_view(), name="kpi-invalidate-cache"),
]
