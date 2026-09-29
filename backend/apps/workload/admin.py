"""
Настройка отображения моделей модуля «Планирование нагрузки» в Django Admin.
"""

from django.contrib import admin

from .models import Department, Discipline, StudyGroup, Teacher, Workload


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "created_at")
    search_fields = ("name", "code")


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ("full_name", "position", "department", "hours_limit", "user")
    list_filter = ("department", "position")
    search_fields = ("full_name", "user__username")


@admin.register(StudyGroup)
class StudyGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "course", "direction_code", "direction_name", "year")
    list_filter = ("course", "direction_code", "year")
    search_fields = ("name", "direction_name")


@admin.register(Discipline)
class DisciplineAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "total_hours", "lesson_type")
    list_filter = ("lesson_type",)
    search_fields = ("name", "code")


@admin.register(Workload)
class WorkloadAdmin(admin.ModelAdmin):
    list_display = (
        "teacher",
        "discipline",
        "group",
        "semester",
        "day_of_week",
        "lesson_number",
        "room",
        "hours_plan",
        "hours_fact",
    )
    list_filter = ("semester", "day_of_week", "lesson_number", "teacher", "group")
    search_fields = (
        "teacher__full_name",
        "discipline__name",
        "group__name",
        "room",
    )
