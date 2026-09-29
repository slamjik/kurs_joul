"""
Фабрики для моделей модуля workload с использованием factory_boy.
"""

import factory
from auth_app.tests.factories import UserFactory
from workload.models import Department, Discipline, StudyGroup, Teacher, Workload


class DepartmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Department

    name = "Гуманитарные и социально-экономические науки"
    code = factory.Sequence(lambda n: f"GIS-{n:02d}")


class TeacherFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Teacher

    user = factory.SubFactory(UserFactory, role="teacher")
    department = factory.SubFactory(DepartmentFactory)
    full_name = factory.Sequence(lambda n: f"Преподаватель {n} И.И.")
    position = "Доцент"
    hours_limit = 900.0


class StudyGroupFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = StudyGroup

    name = factory.Sequence(lambda n: f"БПИ-22-{n}")
    direction_code = "09.03.01"
    direction_name = "Информатика и вычислительная техника"
    course = 2
    year = 2022


class DisciplineFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Discipline

    name = factory.Sequence(lambda n: f"Дисциплина {n}")
    code = factory.Sequence(lambda n: f"DISC-{n:03d}")
    total_hours = 72
    lesson_type = "lecture"


class WorkloadFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Workload

    teacher = factory.SubFactory(TeacherFactory)
    discipline = factory.SubFactory(DisciplineFactory)
    group = factory.SubFactory(StudyGroupFactory)
    hours_plan = 36
    hours_fact = 0
    semester = "2024-1"
    room = "101"
    day_of_week = 1
    lesson_number = 1
