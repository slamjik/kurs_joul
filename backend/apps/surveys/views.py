"""
Views для модуля «Анкетирование и мониторинг качества образования».
Предоставляют REST API для студентов (прохождение опроса),
преподавателей (просмотр радара компетенций) и заведующего кафедрой (сводка филиала).
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from auth_app.permissions import IsHeadOrAdmin, IsTeacherOrAbove
from workload.models import Teacher
from .models import (
    SurveyAssignment,
    SurveyTemplate,
    TeacherRecommendation,
)
from .serializers import (
    SurveyAssignmentListSerializer,
    SurveySubmitRequestSerializer,
    SurveyTemplateSerializer,
    TeacherRecommendationSerializer,
)
from .services import (
    calculate_branch_kpi,
    get_department_teachers_quality,
    get_teacher_radar_analytics,
    submit_survey_response,
)


@extend_schema(tags=["Опросы: Шаблоны анкет"])
class SurveyTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """Просмотр активных шаблонов анкет и критериев оценивания."""

    queryset = SurveyTemplate.objects.filter(is_active=True).prefetch_related("questions")
    serializer_class = SurveyTemplateSerializer
    permission_classes = [AllowAny]
    pagination_class = None


@extend_schema(tags=["Опросы: Назначения"])
class SurveyAssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    """Список доступных опросов по преподавателям и дисциплинам."""

    queryset = SurveyAssignment.objects.filter(is_open=True).select_related(
        "template", "teacher", "discipline", "group", "department"
    ).prefetch_related("template__questions")
    serializer_class = SurveyAssignmentListSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        dept_id = self.request.query_params.get("department")
        teacher_id = self.request.query_params.get("teacher")
        group_id = self.request.query_params.get("group")

        if dept_id:
            qs = qs.filter(department_id=dept_id)
        if teacher_id:
            qs = qs.filter(teacher_id=teacher_id)
        if group_id:
            qs = qs.filter(group_id=group_id)

        return qs


@extend_schema(tags=["Опросы: Прохождение"])
class SurveySubmitView(APIView):
    """Прием анонимного пакета ответов студента на анкету."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Отправить анонимные ответы на анкету",
        request=SurveySubmitRequestSerializer,
        responses={201: dict},
    )
    def post(self, request):
        serializer = SurveySubmitRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        try:
            result = submit_survey_response(
                assignment_id=data["assignment_id"],
                answers_data=data["answers"],
            )
            return Response(
                {
                    "message": "Спасибо! Ваш отзыв успешно принят и сохранен анонимно.",
                    "saved_answers": result["saved_count"],
                    "session_token": result["submission_hash"],
                },
                status=status.HTTP_201_CREATED,
            )
        except ValueError as err:
            return Response({"detail": str(err)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Опросы: Аналитика качества"])
class QualityAnalyticsViewSet(viewsets.ViewSet):
    """
    Аналитические срезы качества образования:
    - Сводный индекс по филиалу и кафедрам (73.4%)
    - Рейтинг преподавателей выбранной кафедры
    - Лепестковая диаграмма (RadarChart) и отзывы преподавателя
    """

    serializer_class = None
    permission_classes = [IsTeacherOrAbove]

    @extend_schema(
        summary="Сводный KPI филиала и распределение по кафедрам",
        parameters=[
            OpenApiParameter(name="semester", type=str, required=False, description="Семестр (напр. 2024-1)"),
        ],
        responses={status.HTTP_200_OK: OpenApiTypes.OBJECT},
    )
    @action(detail=False, methods=["get"], url_path="branch-kpi")
    def branch_kpi(self, request):
        semester = request.query_params.get("semester", "2024-1")
        data = calculate_branch_kpi(semester=semester)
        return Response(data)

    @extend_schema(
        summary="Рейтинг преподавателей кафедры",
        parameters=[
            OpenApiParameter(name="department", type=int, required=False, description="ID кафедры"),
            OpenApiParameter(name="semester", type=str, required=False, description="Семестр"),
        ],
        responses={status.HTTP_200_OK: OpenApiTypes.OBJECT},
    )
    @action(detail=False, methods=["get"], url_path="department-teachers")
    def department_teachers(self, request):
        dept_id = request.query_params.get("department")
        semester = request.query_params.get("semester", "2024-1")
        data = get_department_teachers_quality(
            department_id=int(dept_id) if dept_id else None,
            semester=semester,
        )
        return Response(data)

    @extend_schema(
        summary="Лепестковая диаграмма (Radar) и отзывы преподавателя",
        parameters=[
            OpenApiParameter(name="teacher", type=int, required=False, description="ID преподавателя"),
            OpenApiParameter(name="semester", type=str, required=False, description="Семестр"),
        ],
        responses={status.HTTP_200_OK: OpenApiTypes.OBJECT},
    )
    @action(detail=False, methods=["get"], url_path="teacher-radar")
    def teacher_radar(self, request):
        user = request.user
        teacher_id = request.query_params.get("teacher")

        # Если запрос от преподавателя — показываем только его профиль
        if user.role == "teacher":
            teacher = Teacher.objects.filter(user=user).first()
            if not teacher:
                return Response(
                    {"detail": "Профиль преподавателя не найден"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            target_teacher_id = teacher.id
        else:
            if not teacher_id:
                # По умолчанию берем первого преподавателя кафедры
                first_t = Teacher.objects.first()
                target_teacher_id = first_t.id if first_t else 1
            else:
                target_teacher_id = int(teacher_id)

        semester = request.query_params.get("semester", "2024-1")
        try:
            data = get_teacher_radar_analytics(target_teacher_id, semester)
            return Response(data)
        except ValueError as err:
            return Response({"detail": str(err)}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(tags=["Опросы: Рекомендации"])
class TeacherRecommendationViewSet(viewsets.ModelViewSet):
    """Управление и просмотр методических рекомендаций преподавателям."""

    queryset = TeacherRecommendation.objects.select_related("teacher", "discipline").all()
    serializer_class = TeacherRecommendationSerializer
    permission_classes = [IsTeacherOrAbove]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsHeadOrAdmin()]
        return [IsTeacherOrAbove()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user.role == "teacher":
            return qs.filter(teacher__user=user, status="published")

        teacher_id = self.request.query_params.get("teacher")
        if teacher_id:
            qs = qs.filter(teacher_id=teacher_id)

        return qs
