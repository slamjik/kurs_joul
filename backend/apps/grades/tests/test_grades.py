"""
Тесты модуля «Мониторинг успеваемости»:
- Модели Student и Grade
- Сервисный слой: средний балл, зона риска (< 3.0), динамика по семестрам, качество
- REST API эндпоинты, фильтры и проверка ролей
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from auth_app.services import generate_jwt_tokens_for_user
from auth_app.tests.factories import UserFactory
from grades.models import Grade
from grades.services import (
    calculate_student_average_grade,
    get_grades_dynamics,
    get_quality_levels_distribution,
    get_risk_zone_students,
)
from workload.tests.factories import DisciplineFactory, StudyGroupFactory, TeacherFactory
from .factories import GradeFactory, StudentFactory


@pytest.mark.django_db
class TestGradeModels:
    """Тестирование моделей Student и Grade."""

    def test_student_str(self):
        group = StudyGroupFactory(name="БПИ-22-1")
        student = StudentFactory(full_name="Сидоров Алексей", group=group)
        assert str(student) == "Сидоров Алексей (БПИ-22-1)"

    def test_grade_str(self):
        grade = GradeFactory(grade=5.0)
        assert grade.student.full_name in str(grade)
        assert grade.discipline.name in str(grade)
        assert "5.0" in str(grade)


@pytest.mark.django_db
class TestGradesServices:
    """Тестирование бизнес-логики оценок и зоны риска."""

    def test_calculate_student_average_grade(self):
        student = StudentFactory()
        GradeFactory(student=student, semester="2024-1", grade=4.0)
        GradeFactory(student=student, semester="2024-1", grade=5.0)
        GradeFactory(student=student, semester="2024-1", grade=3.0)

        avg = calculate_student_average_grade(student.id, semester="2024-1")
        assert avg == 4.0

    def test_risk_zone_detection(self):
        group = StudyGroupFactory(name="ЭК-22-1")
        disc_math = DisciplineFactory(name="Высшая математика")
        disc_hist = DisciplineFactory(name="История")

        # Студент в зоне риска (средний балл 2.5 < 3.0)
        failing_student = StudentFactory(full_name="Отстающий Студент", group=group)
        GradeFactory(student=failing_student, discipline=disc_math, semester="2024-1", grade=2.0)
        GradeFactory(student=failing_student, discipline=disc_hist, semester="2024-1", grade=3.0)

        # Успевающий студент (средний балл 4.5 >= 3.0)
        good_student = StudentFactory(full_name="Успешный Студент", group=group)
        GradeFactory(student=good_student, discipline=disc_math, semester="2024-1", grade=4.0)
        GradeFactory(student=good_student, discipline=disc_hist, semester="2024-1", grade=5.0)

        risk_students = get_risk_zone_students(group_id=group.id, semester="2024-1")

        assert len(risk_students) == 1
        risk_entry = risk_students[0]
        assert risk_entry["student_id"] == failing_student.id
        assert risk_entry["student_name"] == "Отстающий Студент"
        assert risk_entry["avg_grade"] == 2.5
        assert "Высшая математика" in risk_entry["failing_disciplines"]
        assert "История" not in risk_entry["failing_disciplines"]

    def test_grades_dynamics_service(self):
        group = StudyGroupFactory()
        # Семестр 1: средний балл 3.5
        GradeFactory(student__group=group, semester="2023-2", grade=3.0)
        GradeFactory(student__group=group, semester="2023-2", grade=4.0)

        # Семестр 2: средний балл 4.5
        GradeFactory(student__group=group, semester="2024-1", grade=4.0)
        GradeFactory(student__group=group, semester="2024-1", grade=5.0)

        dynamics = get_grades_dynamics(group_id=group.id)
        assert len(dynamics) == 2
        assert dynamics[0]["semester"] == "2023-2"
        assert dynamics[0]["avg_grade"] == 3.5
        assert dynamics[1]["semester"] == "2024-1"
        assert dynamics[1]["avg_grade"] == 4.5

    def test_quality_levels_distribution(self):
        group = StudyGroupFactory()
        GradeFactory(student__group=group, semester="2024-1", grade=5.0)  # Отлично
        GradeFactory(student__group=group, semester="2024-1", grade=4.0)  # Хорошо
        GradeFactory(student__group=group, semester="2024-1", grade=3.0)  # Удовл
        GradeFactory(student__group=group, semester="2024-1", grade=2.0)  # Неуд

        dist = get_quality_levels_distribution(group_id=group.id, semester="2024-1")
        assert dist["total"] == 4
        assert dist["excellent"] == 1
        assert dist["good"] == 1
        assert dist["satisfactory"] == 1
        assert dist["unsatisfactory"] == 1
        assert dist["quality_rate"] == 50.0  # (1 + 1) / 4 * 100


@pytest.mark.django_db
class TestGradesAPI:
    """Тестирование REST API эндпоинтов оценок и студентов."""

    def setup_method(self):
        self.client = APIClient()
        self.head_user = UserFactory(role="head")
        self.head_tokens = generate_jwt_tokens_for_user(self.head_user)

        self.teacher_user = UserFactory(role="teacher")
        self.teacher = TeacherFactory(user=self.teacher_user)
        self.teacher_tokens = generate_jwt_tokens_for_user(self.teacher_user)

    def test_get_grades_list_with_filters(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        g1 = GradeFactory(semester="2024-1", grade=4.0)
        GradeFactory(semester="2023-2", grade=5.0)

        response = self.client.get("/api/grades/?semester=2024-1")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == g1.id

    def test_risk_zone_endpoint(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        failing_student = StudentFactory(full_name="Студент Неуспевающий")
        GradeFactory(student=failing_student, semester="2024-1", grade=2.0)

        response = self.client.get("/api/grades/risk-zone/?semester=2024-1")
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert len(data) >= 1
        assert any(item["student_id"] == failing_student.id for item in data)

    def test_dynamics_endpoint(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        GradeFactory(semester="2024-1", grade=4.0)

        response = self.client.get("/api/grades/dynamics/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert response.data[0]["semester"] == "2024-1"

    def test_teacher_sees_only_own_assigned_grades(self):
        other_teacher = TeacherFactory()
        grade_own = GradeFactory(teacher=self.teacher)
        grade_other = GradeFactory(teacher=other_teacher)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.teacher_tokens['access']}")
        response = self.client.get("/api/grades/")
        assert response.status_code == status.HTTP_200_OK

        ids = [item["id"] for item in response.data["results"]]
        assert grade_own.id in ids
        assert grade_other.id not in ids

    def test_create_grade_validation(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        student = StudentFactory()
        discipline = DisciplineFactory()

        # Попытка выставить некорректную оценку (1.0 вместо допустимых 2.0 - 5.0)
        payload = {
            "student": student.id,
            "discipline": discipline.id,
            "semester": "2024-1",
            "grade": 1.0,
        }
        response = self.client.post("/api/grades/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "grade" in response.data
