"""
Тесты модуля «Планирование нагрузки»:
- Модели и связи
- Сервис проверки пересечений в расписании (коллизии преподавателя, аудитории, группы)
- Сервис расчёта статистики нагрузки
- API эндпоинты, проверка прав ролей и сериализация
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from auth_app.services import generate_jwt_tokens_for_user
from auth_app.tests.factories import UserFactory
from workload.models import Workload
from workload.services import (
    calculate_teacher_workload_stats,
    check_schedule_conflict,
    describe_conflict_reason,
)
from .factories import (
    DepartmentFactory,
    DisciplineFactory,
    StudyGroupFactory,
    TeacherFactory,
    WorkloadFactory,
)


@pytest.mark.django_db
class TestWorkloadModels:
    """Тестирование моделей Department, Teacher, StudyGroup, Discipline, Workload."""

    def test_department_str(self):
        dept = DepartmentFactory(name="Кафедра ГиСЭН", code="ГиСЭН")
        assert str(dept) == "Кафедра ГиСЭН (ГиСЭН)"

    def test_teacher_str(self):
        teacher = TeacherFactory(full_name="Иванов Иван Иванович", position="Доцент")
        assert str(teacher) == "Иванов Иван Иванович (Доцент)"

    def test_discipline_str(self):
        disc = DisciplineFactory(name="История", lesson_type="lecture")
        assert str(disc) == "История (Лекция)"

    def test_workload_str(self):
        wl = WorkloadFactory()
        assert wl.teacher.full_name in str(wl)
        assert wl.discipline.name in str(wl)
        assert wl.group.name in str(wl)


@pytest.mark.django_db
class TestScheduleConflictService:
    """Тестирование алгоритма проверки коллизий в расписании."""

    def test_no_conflict_when_times_differ(self):
        t1 = TeacherFactory()
        g1 = StudyGroupFactory()
        d1 = DisciplineFactory()

        # Существующая пара: понедельник (1), 1 пара
        WorkloadFactory(
            teacher=t1, group=g1, discipline=d1,
            semester="2024-1", day_of_week=1, lesson_number=1, room="101"
        )

        # Новая пара: понедельник (1), 2 пара — коллизий быть не должно
        data = {
            "teacher": t1.id,
            "group": g1.id,
            "discipline": d1.id,
            "semester": "2024-1",
            "day_of_week": 1,
            "lesson_number": 2,
            "room": "101",
        }
        conflicts = check_schedule_conflict(data)
        assert len(conflicts) == 0

    def test_teacher_conflict_detected(self):
        t1 = TeacherFactory(full_name="Петров П.П.")
        g1 = StudyGroupFactory(name="БПИ-22-1")
        g2 = StudyGroupFactory(name="ЭК-22-1")
        d1 = DisciplineFactory()

        # Преподаватель t1 уже ведет пару у группы g1 в понедельник на 1 паре
        existing = WorkloadFactory(
            teacher=t1, group=g1, discipline=d1,
            semester="2024-1", day_of_week=1, lesson_number=1, room="101"
        )

        # Пытаемся назначить того же преподавателя на то же время другой группе g2
        data = {
            "teacher": t1.id,
            "group": g2.id,
            "discipline": d1.id,
            "semester": "2024-1",
            "day_of_week": 1,
            "lesson_number": 1,
            "room": "102",
        }
        conflicts = check_schedule_conflict(data)
        assert len(conflicts) == 1
        assert conflicts[0].id == existing.id

        reason = describe_conflict_reason(conflicts[0], data)
        assert "Преподаватель Петров П.П. уже занят" in reason

    def test_room_conflict_detected(self):
        t1 = TeacherFactory()
        t2 = TeacherFactory()
        g1 = StudyGroupFactory()
        g2 = StudyGroupFactory()
        d1 = DisciplineFactory()

        # Аудитория 204 занята в понедельник на 1 паре
        existing = WorkloadFactory(
            teacher=t1, group=g1, discipline=d1,
            semester="2024-1", day_of_week=1, lesson_number=1, room="204"
        )

        # Другой преподаватель и другая группа претендуют на ту же аудиторию 204
        data = {
            "teacher": t2.id,
            "group": g2.id,
            "discipline": d1.id,
            "semester": "2024-1",
            "day_of_week": 1,
            "lesson_number": 1,
            "room": "204",
        }
        conflicts = check_schedule_conflict(data)
        assert len(conflicts) == 1
        assert conflicts[0].id == existing.id

        reason = describe_conflict_reason(conflicts[0], data)
        assert "Аудитория 204 уже занята" in reason

    def test_group_conflict_detected(self):
        t1 = TeacherFactory()
        t2 = TeacherFactory()
        g1 = StudyGroupFactory(name="БПИ-22-1")
        d1 = DisciplineFactory()
        d2 = DisciplineFactory()

        # Группа g1 уже имеет пару по дисциплине d1
        existing = WorkloadFactory(
            teacher=t1, group=g1, discipline=d1,
            semester="2024-1", day_of_week=2, lesson_number=3, room="101"
        )

        # Попытка назначить группе g1 вторую пару одновременно
        data = {
            "teacher": t2.id,
            "group": g1.id,
            "discipline": d2.id,
            "semester": "2024-1",
            "day_of_week": 2,
            "lesson_number": 3,
            "room": "105",
        }
        conflicts = check_schedule_conflict(data)
        assert len(conflicts) == 1
        assert conflicts[0].id == existing.id

        reason = describe_conflict_reason(conflicts[0], data)
        assert "Группа БПИ-22-1 уже имеет пару" in reason

    def test_conflict_excluded_on_self_update(self):
        wl = WorkloadFactory(semester="2024-1", day_of_week=1, lesson_number=1, room="101")

        # При редактировании самой этой записи (exclude_id = wl.id) коллизии с собой быть не должно
        data = {
            "teacher": wl.teacher_id,
            "group": wl.group_id,
            "discipline": wl.discipline_id,
            "semester": "2024-1",
            "day_of_week": 1,
            "lesson_number": 1,
            "room": "101",
        }
        conflicts = check_schedule_conflict(data, exclude_id=wl.id)
        assert len(conflicts) == 0

    def test_no_conflict_when_time_slot_is_none(self):
        # Нагрузка без привязки к сетке расписания (день и пара не заданы)
        data = {
            "teacher": 1,
            "group": 1,
            "semester": "2024-1",
            "day_of_week": None,
            "lesson_number": None,
            "room": "101",
        }
        assert check_schedule_conflict(data) == []


@pytest.mark.django_db
class TestWorkloadStatsService:
    """Тестирование расчёта статистики нагрузки."""

    def test_teacher_workload_stats(self):
        teacher = TeacherFactory(hours_limit=900.0)
        WorkloadFactory(teacher=teacher, semester="2024-1", hours_plan=50, hours_fact=25)
        WorkloadFactory(teacher=teacher, semester="2024-1", hours_plan=50, hours_fact=15)

        stats = calculate_teacher_workload_stats(teacher.id, semester="2024-1")
        assert stats["hours_plan"] == 100
        assert stats["hours_fact"] == 40
        assert stats["completion_pct"] == 40.0
        assert stats["remaining_hours"] == 860


@pytest.mark.django_db
class TestWorkloadAPI:
    """Тестирование эндпоинтов REST API нагрузки."""

    def setup_method(self):
        self.client = APIClient()
        self.head_user = UserFactory(role="head")
        self.head_tokens = generate_jwt_tokens_for_user(self.head_user)

        self.teacher_user = UserFactory(role="teacher")
        self.teacher = TeacherFactory(user=self.teacher_user)
        self.teacher_tokens = generate_jwt_tokens_for_user(self.teacher_user)

    def test_head_can_create_workload(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        group = StudyGroupFactory()
        discipline = DisciplineFactory()

        payload = {
            "teacher": self.teacher.id,
            "group": group.id,
            "discipline": discipline.id,
            "hours_plan": 72,
            "semester": "2024-1",
            "room": "301",
            "day_of_week": 1,
            "lesson_number": 2,
        }
        response = self.client.post("/api/workload/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Workload.objects.filter(room="301").exists()

    def test_cannot_create_conflicting_workload_via_api(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        group = StudyGroupFactory()
        discipline = DisciplineFactory()

        # Существующая пара
        WorkloadFactory(
            teacher=self.teacher, group=group, discipline=discipline,
            semester="2024-1", day_of_week=1, lesson_number=2, room="301"
        )

        # Попытка создать конфликт (тот же препод, то же время)
        payload = {
            "teacher": self.teacher.id,
            "group": StudyGroupFactory().id,
            "discipline": discipline.id,
            "hours_plan": 36,
            "semester": "2024-1",
            "room": "401",
            "day_of_week": 1,
            "lesson_number": 2,
        }
        response = self.client.post("/api/workload/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "schedule" in response.data

    def test_teacher_cannot_create_workload(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.teacher_tokens['access']}")
        payload = {
            "teacher": self.teacher.id,
            "group": StudyGroupFactory().id,
            "discipline": DisciplineFactory().id,
            "hours_plan": 36,
            "semester": "2024-1",
        }
        response = self.client.post("/api/workload/", payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_teacher_sees_only_own_workload(self):
        other_teacher = TeacherFactory()
        wl_own = WorkloadFactory(teacher=self.teacher)
        wl_other = WorkloadFactory(teacher=other_teacher)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.teacher_tokens['access']}")
        response = self.client.get("/api/workload/")
        assert response.status_code == status.HTTP_200_OK

        ids = [item["id"] for item in response.data["results"]]
        assert wl_own.id in ids
        assert wl_other.id not in ids

    def test_check_conflicts_endpoint(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        existing = WorkloadFactory(
            teacher=self.teacher, semester="2024-1", day_of_week=3, lesson_number=1, room="101"
        )

        check_payload = {
            "teacher": self.teacher.id,
            "semester": "2024-1",
            "day_of_week": 3,
            "lesson_number": 1,
            "room": "102",
        }
        response = self.client.post("/api/workload/check-conflicts/", check_payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["has_conflicts"] is True
        assert response.data["conflicts_count"] == 1
        assert response.data["conflicts"][0]["id"] == existing.id
