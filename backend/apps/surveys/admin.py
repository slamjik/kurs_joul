from django.contrib import admin
from .models import (
    SurveyTemplate,
    SurveyQuestion,
    SurveyAssignment,
    SurveyAnswer,
    TeacherRecommendation,
)


@admin.register(SurveyTemplate)
class SurveyTemplateAdmin(admin.ModelAdmin):
    list_display = ["title", "academic_year", "semester", "is_active", "created_at"]
    list_filter = ["academic_year", "semester", "is_active"]
    search_fields = ["title", "description"]


@admin.register(SurveyQuestion)
class SurveyQuestionAdmin(admin.ModelAdmin):
    list_display = ["order", "category", "question_type", "text", "template"]
    list_filter = ["category", "question_type", "template"]
    search_fields = ["text"]


@admin.register(SurveyAssignment)
class SurveyAssignmentAdmin(admin.ModelAdmin):
    list_display = ["teacher", "discipline", "group", "department", "is_open"]
    list_filter = ["department", "is_open", "template"]
    search_fields = ["teacher__full_name", "discipline__name"]


@admin.register(SurveyAnswer)
class SurveyAnswerAdmin(admin.ModelAdmin):
    list_display = ["assignment", "question", "score", "created_at"]
    list_filter = ["score", "created_at"]
    search_fields = ["text_response"]


@admin.register(TeacherRecommendation)
class TeacherRecommendationAdmin(admin.ModelAdmin):
    list_display = ["teacher", "discipline", "category", "source", "status", "created_at"]
    list_filter = ["source", "status", "category"]
    search_fields = ["teacher__full_name", "recommendation_text"]
