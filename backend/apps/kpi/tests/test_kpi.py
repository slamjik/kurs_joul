"""
Тесты модуля «KPI-дашборд и аналитика»:
- Расчёт сводных метрик кафедры (карточки дашборда)
- Круговая диаграмма качества образования
- Гистограмма нагрузки преподавателей
- Сводка по направлениям подготовки
- Кэширование в Redis и инвалидация кэша
- REST API эндпоинты
"""

import pytest
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient

from auth_app.services import generate_jwt_tokens_for_user
from auth_app.tests.factories import UserFactory
from grades.tests.factories import GradeFactory, StudentFactory
from kpi.services import (
    get_kpi_directions_summary,
    get_kpi_quality_levels,
    get_kpi_summary,
    get_kpi_workload_chart,
    invalidate_kpi_cache,
)
from workload.tests.factories import StudyGroupFactory, TeacherFactory, WorkloadFactory


@pytest.mark.django_db
class TestKpiServices:
    """Тестирование аналитических сервисов KPI и кэширования."""

    def setup_method(self):
        cache.clear()

    def test_get_kpi_summary_calculation(self):
        # 2 студента: один отличник (5.0), один отстающий (2.0)
        s1 = StudentFactory()
        s2 = StudentFactory()
        GradeFactory(student=s1, semester="2024-1", grade=5.0)
        GradeFactory(student=s2, semester="2024-1", grade=2.0)

        # Нагрузка: 100 часов план, 50 факт
        WorkloadFactory(semester="2024-1", hours_plan=100, hours_fact=50)

        summary = get_kpi_summary(semester="2024-1")

        assert summary["total_students"] == 2
        assert summary["risk_students_count"] == 1
        assert summary["risk_students_pct"] == 50.0
        assert summary["hours_plan_total"] == 100
        assert summary["hours_fact_total"] == 50
        assert summary["hours_completion_pct"] == 50.0
        assert summary["avg_grade"] == 3.5

    def test_get_kpi_quality_levels(self):
        GradeFactory(semester="2024-1", grade=5.0)  # Отлично
        GradeFactory(semester="2024-1", grade=4.0)  # Хорошо
        GradeFactory(semester="2024-1", grade=3.0)  # Удовл
        GradeFactory(semester="2024-1", grade=2.0)  # Неуд

        res = get_kpi_quality_levels(semester="2024-1")
        assert res["total"] == 4
        assert res["excellent"] == 1
        assert res["good"] == 1
        assert res["satisfactory"] == 1
        assert res["unsatisfactory"] == 1
        assert res["quality_rate"] == 50.0

    def test_get_kpi_workload_chart(self):
        t1 = TeacherFactory(full_name="Иванов И.И.", hours_limit=900)
        WorkloadFactory(teacher=t1, semester="2024-1", hours_plan=60, hours_fact=30)

        chart = get_kpi_workload_chart(semester="2024-1")
        assert len(chart) >= 1
        item = next(x for x in chart if x["teacher_id"] == t1.id)
        assert item["hours_plan"] == 60
        assert item["hours_fact"] == 30
        assert item["completion_pct"] == 50.0

    def test_get_kpi_directions_summary(self):
        group_it = StudyGroupFactory(direction_code="09.03.01", direction_name="Информатика")
        student_it = StudentFactory(group=group_it)
        GradeFactory(student=student_it, semester="2024-1", grade=4.5)

        summary = get_kpi_directions_summary(semester="2024-1")
        assert len(summary) >= 1
        it_item = next(x for x in summary if x["direction_code"] == "09.03.01")
        assert it_item["students_count"] == 1
        assert it_item["avg_grade"] == 4.5
        assert it_item["risk_count"] == 0

    def test_redis_cache_and_invalidation(self):
        GradeFactory(semester="2024-1", grade=4.0)

        # Первый вызов кэширует результат
        res1 = get_kpi_summary(semester="2024-1")
        assert cache.get("kpi_summary_2024-1") is not None

        # Инвалидация кэша
        invalidate_kpi_cache(semester="2024-1")
        assert cache.get("kpi_summary_2024-1") is None


@pytest.mark.django_db
class TestKpiAPIEndpoints:
    """Тестирование REST API эндпоинтов дашборда."""

    def setup_method(self):
        self.client = APIClient()
        self.head_user = UserFactory(role="head")
        self.head_tokens = generate_jwt_tokens_for_user(self.head_user)

        self.teacher_user = UserFactory(role="teacher")
        self.teacher_tokens = generate_jwt_tokens_for_user(self.teacher_user)

    def test_get_kpi_summary_api(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        response = self.client.get("/api/kpi/summary/")
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert "total_students" in data
        assert "risk_students_count" in data
        assert "hours_completion_pct" in data

    def test_get_kpi_quality_levels_api(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        response = self.client.get("/api/kpi/quality-levels/")
        assert response.status_code == status.HTTP_200_OK
        assert "excellent" in response.data
        assert "quality_rate" in response.data

    def test_get_kpi_workload_chart_api(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        response = self.client.get("/api/kpi/workload-chart/")
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_get_kpi_grades_dynamics_api(self):
        GradeFactory(semester="2024-1", grade=4.0)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        response = self.client.get("/api/kpi/grades-dynamics/")
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_get_kpi_directions_summary_api(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        response = self.client.get("/api/kpi/directions-summary/")
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_invalidate_cache_permissions(self):
        # Преподаватель не может принудительно сбросить кэш
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.teacher_tokens['access']}")
        resp_teacher = self.client.post("/api/kpi/invalidate-cache/", {"semester": "2024-1"})
        assert resp_teacher.status_code == status.HTTP_403_FORBIDDEN

        # Завкафедрой может сбросить кэш
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        resp_head = self.client.post("/api/kpi/invalidate-cache/", {"semester": "2024-1"})
        assert resp_head.status_code == status.HTTP_200_OK
        assert resp_head.data["success"] is True
