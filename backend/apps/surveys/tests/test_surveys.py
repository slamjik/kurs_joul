"""
Тесты модуля «Анкетирование и мониторинг качества образования»:
- Создание шаблона анкеты и вопросов по 5 компетенциям
- Анонимная отправка ответов студентами
- Расчёт KPI удовлетворенности филиала и кафедр
- Расчёт лепестковой диаграммы (RadarChart) преподавателя
- Авто-генерация рекомендаций и ручное согласование заведующим кафедрой
- REST API эндпоинты
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from auth_app.services import generate_jwt_tokens_for_user
from auth_app.tests.factories import UserFactory
from workload.tests.factories import (
    DepartmentFactory,
    DisciplineFactory,
    StudyGroupFactory,
    TeacherFactory,
)
from surveys.models import (
    SurveyAnswer,
    SurveyAssignment,
    SurveyQuestion,
    SurveyTemplate,
    TeacherRecommendation,
)
from surveys.services import (
    calculate_branch_kpi,
    generate_teacher_recommendations,
    get_department_teachers_quality,
    get_teacher_radar_analytics,
    submit_survey_response,
)


@pytest.mark.django_db
class TestSurveyModelsAndServices:
    """Тестирование моделей и аналитических сервисов модуля анкетирования."""

    def test_create_survey_template_and_questions(self):
        dept = DepartmentFactory(code="ГиСЭН")
        template = SurveyTemplate.objects.create(
            title="Оценка качества преподавания (Осень 2024)",
            semester="2024-1",
            academic_year="2024-2025",
            is_active=True,
        )

        q1 = SurveyQuestion.objects.create(
            template=template,
            category="clarity",
            text="Насколько понятно преподаватель излагает материал?",
            order=1,
        )
        q2 = SurveyQuestion.objects.create(
            template=template,
            category="fairness",
            text="Насколько объективно преподаватель оценивает знания?",
            order=2,
        )
        q_text = SurveyQuestion.objects.create(
            template=template,
            category="clarity",
            question_type="text",
            text="Ваши пожелания и замечания",
            order=3,
        )

        assert template.questions.count() == 3
        assert q1.category == "clarity"
        assert q_text.question_type == "text"

    def test_submit_survey_anonymity(self):
        """Отправка ответа студента должна быть строго анонимной (без student_id)."""
        dept = DepartmentFactory(code="ГиСЭН")
        teacher = TeacherFactory(department=dept)
        disc = DisciplineFactory()
        group = StudyGroupFactory()

        template = SurveyTemplate.objects.create(
            title="Тестовая анкета",
            semester="2024-1",
            academic_year="2024-2025",
        )
        q_score = SurveyQuestion.objects.create(
            template=template,
            category="clarity",
            text="Понятность материала",
            order=1,
        )
        q_comm = SurveyQuestion.objects.create(
            template=template,
            category="clarity",
            question_type="text",
            text="Отзыв",
            order=2,
        )

        assignment = SurveyAssignment.objects.create(
            template=template,
            teacher=teacher,
            discipline=disc,
            group=group,
            department=dept,
        )

        answers_data = [
            {"question_id": q_score.id, "score": 5},
            {"question_id": q_comm.id, "text_response": "Отличный курс!"},
        ]

        result = submit_survey_response(assignment.id, answers_data)

        assert result["saved_count"] == 2
        assert "submission_hash" in result

        answers = SurveyAnswer.objects.filter(assignment=assignment)
        assert answers.count() == 2
        # У ответов одинаковый hash сессии, но нет ссылки на пользователя/студента
        hashes = {a.submission_hash for a in answers}
        assert len(hashes) == 1
        assert not hasattr(SurveyAnswer, "student")
        assert not hasattr(SurveyAnswer, "user")

    def test_calculate_branch_kpi(self):
        dept1 = DepartmentFactory(code="ГиСЭН")
        dept2 = DepartmentFactory(code="ЭКН")
        teacher = TeacherFactory(department=dept1)
        disc = DisciplineFactory()
        group = StudyGroupFactory()
        template = SurveyTemplate.objects.create(
            title="Анкета", semester="2024-1", academic_year="2024-2025"
        )
        q = SurveyQuestion.objects.create(template=template, category="clarity", text="Q", order=1)
        assignment = SurveyAssignment.objects.create(
            template=template, teacher=teacher, discipline=disc, group=group, department=dept1
        )
        SurveyAnswer.objects.create(assignment=assignment, question=q, score=5, submission_hash="abc")

        kpi = calculate_branch_kpi(academic_year="2024-2025", semester="2024-1")

        assert "branch_satisfaction_rate" in kpi
        assert "departments" in kpi
        assert len(kpi["departments"]) >= 2

    def test_teacher_radar_analytics_and_recommendations(self):
        dept = DepartmentFactory(code="ГиСЭН")
        teacher = TeacherFactory(department=dept)
        disc = DisciplineFactory()
        group = StudyGroupFactory()
        template = SurveyTemplate.objects.create(
            title="Анкета", semester="2024-1", academic_year="2024-2025"
        )
        q_clarity = SurveyQuestion.objects.create(template=template, category="clarity", text="Q1", order=1)
        q_facilities = SurveyQuestion.objects.create(template=template, category="facilities", text="Q2", order=2)
        q_text = SurveyQuestion.objects.create(template=template, category="clarity", question_type="text", text="Q3", order=3)

        assignment = SurveyAssignment.objects.create(
            template=template, teacher=teacher, discipline=disc, group=group, department=dept
        )

        # Ставим низкий балл по facilities (2) и высокий по clarity (5)
        SurveyAnswer.objects.create(assignment=assignment, question=q_clarity, score=5, submission_hash="s1")
        SurveyAnswer.objects.create(assignment=assignment, question=q_facilities, score=2, submission_hash="s1")
        SurveyAnswer.objects.create(assignment=assignment, question=q_text, text_response="Холодно в аудитории", submission_hash="s1")

        radar = get_teacher_radar_analytics(teacher.id, semester="2024-1")

        assert radar["teacher_id"] == teacher.id
        assert len(radar["radar"]) == 5
        assert len(radar["comments"]) == 1

        # Проверка алгоритма авто-рекомендаций при низком балле (< 4.0)
        recs = generate_teacher_recommendations(teacher.id, semester="2024-1")
        assert len(recs) >= 1
        facilities_rec = [r for r in recs if r.category == "facilities"]
        assert len(facilities_rec) == 1
        assert facilities_rec[0].status == "published"


@pytest.mark.django_db
class TestSurveyAPIEndpoints:
    """Тестирование REST API эндпоинтов модуля анкетирования."""

    def setup_method(self):
        self.client = APIClient()
        self.head_user = UserFactory(role="head")
        self.head_tokens = generate_jwt_tokens_for_user(self.head_user)

    def test_list_templates(self):
        SurveyTemplate.objects.create(
            title="Шаблон 1", semester="2024-1", academic_year="2024-2025", is_active=True
        )
        response = self.client.get("/api/surveys/templates/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_submit_survey_api(self):
        dept = DepartmentFactory(code="ГиСЭН")
        teacher = TeacherFactory(department=dept)
        disc = DisciplineFactory()
        group = StudyGroupFactory()
        template = SurveyTemplate.objects.create(
            title="Шаблон API", semester="2024-1", academic_year="2024-2025"
        )
        q = SurveyQuestion.objects.create(template=template, category="clarity", text="Q1", order=1)
        assignment = SurveyAssignment.objects.create(
            template=template, teacher=teacher, discipline=disc, group=group, department=dept
        )

        payload = {
            "assignment_id": assignment.id,
            "answers": [
                {"question_id": q.id, "score": 5},
            ],
        }

        # Анонимный студент отправляет анкету
        response = self.client.post("/api/surveys/submit/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["saved_answers"] == 1

    def test_branch_kpi_api(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        response = self.client.get("/api/surveys/analytics/branch-kpi/")
        assert response.status_code == status.HTTP_200_OK
        assert "branch_satisfaction_rate" in response.data

    def test_department_teachers_api(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        response = self.client.get("/api/surveys/analytics/department-teachers/")
        assert response.status_code == status.HTTP_200_OK
        assert "teachers" in response.data

    def test_teacher_radar_api(self):
        dept = DepartmentFactory(code="ГиСЭН")
        teacher = TeacherFactory(department=dept)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.head_tokens['access']}")
        response = self.client.get(f"/api/surveys/analytics/teacher-radar/?teacher_id={teacher.id}")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["teacher_id"] == teacher.id
        assert "radar" in response.data
