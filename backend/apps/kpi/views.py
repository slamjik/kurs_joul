"""
Представления (Views) модуля «KPI-дашборд и аналитика».
"""

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from auth_app.permissions import IsHeadOrAdmin, IsTeacherOrAbove
from grades.serializers import GradesDynamicsSerializer
from grades.services import get_grades_dynamics
from .serializers import (
    CacheInvalidateRequestSerializer,
    CacheInvalidateResponseSerializer,
    DirectionSummaryItemSerializer,
    KpiQualityLevelsSerializer,
    KpiSummarySerializer,
    TeacherWorkloadBarItemSerializer,
)
from .services import (
    get_kpi_directions_summary,
    get_kpi_quality_levels,
    get_kpi_summary,
    get_kpi_workload_chart,
    invalidate_kpi_cache,
)


class KpiSummaryView(APIView):
    """Сводные метрики KPI для информационных карточек дашборда."""

    permission_classes = [IsTeacherOrAbove]

    @extend_schema(
        tags=["KPI-дашборд"],
        summary="Сводные метрики KPI (карточки дашборда)",
        description="Возвращает общее количество студентов, число в зоне риска, выполнение часов и средний балл.",
        parameters=[
            OpenApiParameter(name="semester", type=str, required=False, description="Семестр (например, 2024-1)"),
        ],
        responses={status.HTTP_200_OK: KpiSummarySerializer},
    )
    def get(self, request):
        semester = request.query_params.get("semester")
        data = get_kpi_summary(semester=semester)
        serializer = KpiSummarySerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class KpiQualityLevelsView(APIView):
    """Распределение качества образования для круговой диаграммы."""

    permission_classes = [IsTeacherOrAbove]

    @extend_schema(
        tags=["KPI-дашборд"],
        summary="Уровни качества образования (круговая диаграмма)",
        description="Возвращает доли оценок: отлично, хорошо, удовл., неуд.",
        parameters=[
            OpenApiParameter(name="semester", type=str, required=False, description="Семестр (например, 2024-1)"),
        ],
        responses={status.HTTP_200_OK: KpiQualityLevelsSerializer},
    )
    def get(self, request):
        semester = request.query_params.get("semester")
        data = get_kpi_quality_levels(semester=semester)
        serializer = KpiQualityLevelsSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class KpiWorkloadChartView(APIView):
    """Гистограмма учебной нагрузки преподавателей (план/факт)."""

    permission_classes = [IsTeacherOrAbove]

    @extend_schema(
        tags=["KPI-дашборд"],
        summary="Нагрузка по преподавателям (гистограмма)",
        description="Возвращает план, факт и % выполнения нагрузки для каждого преподавателя кафедры.",
        parameters=[
            OpenApiParameter(name="semester", type=str, required=False, description="Семестр (например, 2024-1)"),
        ],
        responses={status.HTTP_200_OK: TeacherWorkloadBarItemSerializer(many=True)},
    )
    def get(self, request):
        semester = request.query_params.get("semester")
        data = get_kpi_workload_chart(semester=semester)
        serializer = TeacherWorkloadBarItemSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class KpiGradesDynamicsView(APIView):
    """Линейный график динамики успеваемости по семестрам."""

    permission_classes = [IsTeacherOrAbove]

    @extend_schema(
        tags=["KPI-дашборд"],
        summary="Динамика успеваемости (линейный график)",
        description="Возвращает динамику среднего балла и % положительных оценок по семестрам.",
        responses={status.HTTP_200_OK: GradesDynamicsSerializer(many=True)},
    )
    def get(self, request):
        data = get_grades_dynamics()
        serializer = GradesDynamicsSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class KpiDirectionsSummaryView(APIView):
    """Таблица-сводка показателей по направлениям подготовки."""

    permission_classes = [IsTeacherOrAbove]

    @extend_schema(
        tags=["KPI-дашборд"],
        summary="Таблица-сводка по направлениям подготовки",
        description="Возвращает количество студентов, средний балл и число неуспевающих по направлениям.",
        parameters=[
            OpenApiParameter(name="semester", type=str, required=False, description="Семестр (например, 2024-1)"),
        ],
        responses={status.HTTP_200_OK: DirectionSummaryItemSerializer(many=True)},
    )
    def get(self, request):
        semester = request.query_params.get("semester")
        data = get_kpi_directions_summary(semester=semester)
        serializer = DirectionSummaryItemSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class KpiInvalidateCacheView(APIView):
    """Эндпоинт принудительного сброса кэша KPI (только руководство)."""

    permission_classes = [IsHeadOrAdmin]

    @extend_schema(
        tags=["KPI-дашборд"],
        summary="Сброс кэша KPI в Redis",
        description="Принудительно очищает кэшированные показатели аналитики.",
        request=CacheInvalidateRequestSerializer,
        responses={status.HTTP_200_OK: CacheInvalidateResponseSerializer},
    )
    def post(self, request):
        semester = request.data.get("semester")
        invalidate_kpi_cache(semester=semester)
        return Response(
            {"success": True, "message": "Кэш KPI успешно сброшен."},
            status=status.HTTP_200_OK,
        )
