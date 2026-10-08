"""
Сериализаторы для модуля «Анкетирование и мониторинг качества образования».
"""

from rest_framework import serializers
from .models import (
    SurveyAnswer,
    SurveyAssignment,
    SurveyQuestion,
    SurveyTemplate,
    TeacherRecommendation,
)


class SurveyQuestionSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    question_type_display = serializers.CharField(source="get_question_type_display", read_only=True)

    class Meta:
        model = SurveyQuestion
        fields = [
            "id",
            "category",
            "category_display",
            "text",
            "question_type",
            "question_type_display",
            "options",
            "order",
        ]


class SurveyTemplateSerializer(serializers.ModelSerializer):
    questions = SurveyQuestionSerializer(many=True, read_only=True)
    questions_count = serializers.IntegerField(source="questions.count", read_only=True)

    class Meta:
        model = SurveyTemplate
        fields = [
            "id",
            "title",
            "description",
            "academic_year",
            "semester",
            "is_active",
            "questions_count",
            "questions",
            "created_at",
        ]


class SurveyAssignmentListSerializer(serializers.ModelSerializer):
    template_title = serializers.CharField(source="template.title", read_only=True)
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    discipline_name = serializers.CharField(source="discipline.name", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True, default="Все группы")
    department_name = serializers.CharField(source="department.name", read_only=True, default="Филиал")
    questions = SurveyQuestionSerializer(source="template.questions", many=True, read_only=True)

    class Meta:
        model = SurveyAssignment
        fields = [
            "id",
            "template",
            "template_title",
            "teacher",
            "teacher_name",
            "discipline",
            "discipline_name",
            "group",
            "group_name",
            "department",
            "department_name",
            "is_open",
            "questions",
        ]


class SingleAnswerSubmitSerializer(serializers.Serializer):
    question_id = serializers.IntegerField(required=True)
    score = serializers.IntegerField(required=False, min_value=1, max_value=5, allow_null=True)
    text_response = serializers.CharField(required=False, allow_blank=True, default="")


class SurveySubmitRequestSerializer(serializers.Serializer):
    assignment_id = serializers.IntegerField(required=True)
    answers = SingleAnswerSubmitSerializer(many=True, required=True)


class TeacherRecommendationSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    discipline_name = serializers.CharField(source="discipline.name", read_only=True, default="Кафедра")
    source_display = serializers.CharField(source="get_source_display", read_only=True)

    class Meta:
        model = TeacherRecommendation
        fields = [
            "id",
            "teacher",
            "teacher_name",
            "discipline",
            "discipline_name",
            "semester",
            "category",
            "source",
            "source_display",
            "recommendation_text",
            "status",
            "created_at",
        ]
