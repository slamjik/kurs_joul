"""
URL routes для модуля «Анкетирование и мониторинг качества образования».
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    QualityAnalyticsViewSet,
    SurveyAssignmentViewSet,
    SurveySubmitView,
    SurveyTemplateViewSet,
    TeacherRecommendationViewSet,
)

router = DefaultRouter()
router.register(r"templates", SurveyTemplateViewSet, basename="survey-template")
router.register(r"assignments", SurveyAssignmentViewSet, basename="survey-assignment")
router.register(r"analytics", QualityAnalyticsViewSet, basename="survey-analytics")
router.register(r"recommendations", TeacherRecommendationViewSet, basename="teacher-recommendation")

urlpatterns = [
    path("submit/", SurveySubmitView.as_view(), name="survey-submit"),
    path("", include(router.urls)),
]
