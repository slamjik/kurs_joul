"""
Настройка отображения моделей модуля «Мониторинг успеваемости» в Django Admin.
"""

from django.contrib import admin

from .models import Grade, Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("full_name", "group", "email", "created_at")
    list_filter = ("group", "group__course")
    search_fields = ("full_name", "email", "group__name")


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = (
        "student",
        "discipline",
        "grade",
        "semester",
        "teacher",
        "source",
        "date",
    )
    list_filter = ("semester", "grade", "source", "discipline")
    search_fields = (
        "student__full_name",
        "discipline__name",
        "teacher__full_name",
    )
