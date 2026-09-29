"""
Фабрики для моделей модуля grades с использованием factory_boy.
"""

import factory
from grades.models import Grade, Student
from workload.tests.factories import DisciplineFactory, StudyGroupFactory, TeacherFactory


class StudentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Student

    full_name = factory.Sequence(lambda n: f"Студент {n} С.С.")
    email = factory.LazyAttribute(lambda o: f"student_{o.full_name.split()[1]}@misis.ru")
    group = factory.SubFactory(StudyGroupFactory)


class GradeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Grade

    student = factory.SubFactory(StudentFactory)
    discipline = factory.SubFactory(DisciplineFactory)
    teacher = factory.SubFactory(TeacherFactory)
    semester = "2024-1"
    grade = 4.0
    source = Grade.MANUAL
