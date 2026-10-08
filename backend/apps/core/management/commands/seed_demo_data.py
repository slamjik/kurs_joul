"""
Management command to seed realistic demo data for KafIS project.
Usage: python manage.py seed_demo_data
"""

import uuid
from datetime import date
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.core.cache import cache

from auth_app.models import User
from workload.models import Department, Teacher, StudyGroup, Discipline, Workload
from grades.models import Student, Grade
from audit.models import AuditLog


class Command(BaseCommand):
    help = "Seed database with initial demo data for KafIS (ГиСЭН)"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Очистка артефактов сканеров безопасности и устаревших данных...")

        # 0. Очистка зависимых сущностей в правильном порядке
        Grade.objects.all().delete()
        Student.objects.all().delete()
        from surveys.models import (
            SurveyTemplate,
            SurveyQuestion,
            SurveyAssignment,
            SurveyAnswer,
            TeacherRecommendation,
        )
        SurveyAnswer.objects.all().delete()
        SurveyAssignment.objects.all().delete()
        TeacherRecommendation.objects.all().delete()
        Workload.objects.all().delete()

        # Теперь можно безопасно удалить старые и мусорные группы
        StudyGroup.objects.all().delete()

        # Удаление мусорных дисциплин ZAP
        Discipline.objects.all().delete()

        # Очистка логов сканера
        AuditLog.objects.all().delete()

        # Очистить кэш
        try:
            cache.clear()
        except Exception:
            pass

        self.stdout.write("Создание демонстрационных данных...")

        # 1. Department
        dept_gisen, _ = Department.objects.get_or_create(
            code="ГиСЭН",
            defaults={
                "name": "Кафедра гуманитарных и социально-экономических наук",
            },
        )
        dept = dept_gisen

        dept_econ, _ = Department.objects.get_or_create(
            code="ЭКН",
            defaults={
                "name": "Кафедра экономики и менеджмента",
            },
        )

        # 2. Users & Roles
        head_user, _ = User.objects.get_or_create(
            username="head",
            defaults={
                "role": "head",
                "first_name": "Марина",
                "last_name": "Измайлова",
                "email": "izmailova@misis.ru",
                "is_staff": True,
            },
        )
        head_user.first_name = "Марина"
        head_user.last_name = "Измайлова"
        head_user.email = "izmailova@misis.ru"
        head_user.set_password("head12345")
        head_user.save()

        t1_user, _ = User.objects.get_or_create(
            username="teacher1",
            defaults={
                "role": "teacher",
                "first_name": "Андрей",
                "last_name": "Нечетов",
                "email": "nechetov@misis.ru",
            },
        )
        t1_user.first_name = "Андрей"
        t1_user.last_name = "Нечетов"
        t1_user.email = "nechetov@misis.ru"
        t1_user.set_password("teacher12345")
        t1_user.save()

        t2_user, _ = User.objects.get_or_create(
            username="teacher2",
            defaults={
                "role": "teacher",
                "first_name": "Елена",
                "last_name": "Торшина",
                "email": "torshina@misis.ru",
            },
        )
        t2_user.first_name = "Елена"
        t2_user.last_name = "Торшина"
        t2_user.email = "torshina@misis.ru"
        t2_user.set_password("teacher22345")
        t2_user.save()

        admin_user, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                "role": "admin",
                "first_name": "Системный",
                "last_name": "Администратор",
                "email": "admin@misis.ru",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin_user.set_password("admin12345")
        admin_user.save()

        # 3. Teachers
        teacher_head, _ = Teacher.objects.get_or_create(
            user=head_user,
            defaults={
                "full_name": "Измайлова Марина Анатольевна",
                "department": dept,
                "position": "Заведующий кафедрой, д.э.н., профессор",
                "hours_limit": 900.0,
            },
        )
        teacher_head.full_name = "Измайлова Марина Анатольевна"
        teacher_head.position = "Заведующий кафедрой, д.э.н., профессор"
        teacher_head.department = dept
        teacher_head.save()

        teacher1, _ = Teacher.objects.get_or_create(
            user=t1_user,
            defaults={
                "full_name": "Нечетов Андрей Владимирович",
                "department": dept,
                "position": "Доцент кафедры, к.э.н.",
                "hours_limit": 850.0,
            },
        )
        teacher1.full_name = "Нечетов Андрей Владимирович"
        teacher1.position = "Доцент кафедры, к.э.н."
        teacher1.department = dept
        teacher1.save()

        teacher2, _ = Teacher.objects.get_or_create(
            user=t2_user,
            defaults={
                "full_name": "Торшина Елена Александровна",
                "department": dept,
                "position": "Старший преподаватель",
                "hours_limit": 800.0,
            },
        )
        teacher2.full_name = "Торшина Елена Александровна"
        teacher2.position = "Старший преподаватель"
        teacher2.department = dept
        teacher2.save()

        # 4. Disciplines
        disc_econ, _ = Discipline.objects.get_or_create(
            code="ЭКН-01",
            defaults={"name": "Экономика", "total_hours": 72, "lesson_type": "lecture"},
        )
        disc_pm, _ = Discipline.objects.get_or_create(
            code="УПР-02",
            defaults={"name": "Управление проектами", "total_hours": 72, "lesson_type": "lecture"},
        )
        disc_prod, _ = Discipline.objects.get_or_create(
            code="МЕН-03",
            defaults={"name": "Производственный менеджмент", "total_hours": 54, "lesson_type": "practice"},
        )
        disc_phil, _ = Discipline.objects.get_or_create(
            code="ФИЛ-04",
            defaults={"name": "Философия", "total_hours": 72, "lesson_type": "lecture"},
        )
        disc_law, _ = Discipline.objects.get_or_create(
            code="ПРАВ-05",
            defaults={"name": "Правоведение", "total_hours": 36, "lesson_type": "lecture"},
        )

        # 5. Study Groups (Калибровка когорт: 4 курс = выпуск 2027 г., поступление 2023 г.: БПИ-23, БХТ-23, ЭКН-23)
        grp_bpi23, _ = StudyGroup.objects.get_or_create(
            name="БПИ-23",
            defaults={
                "course": 4,
                "year": 2023,
                "direction_code": "09.03.01",
                "direction_name": "Информатика и вычислительная техника",
            },
        )
        grp_bpi23.course = 4
        grp_bpi23.year = 2023
        grp_bpi23.direction_code = "09.03.01"
        grp_bpi23.direction_name = "Информатика и вычислительная техника"
        grp_bpi23.save()

        grp_bht23, _ = StudyGroup.objects.get_or_create(
            name="БХТ-23",
            defaults={
                "course": 4,
                "year": 2023,
                "direction_code": "18.03.01",
                "direction_name": "Химическая технология",
            },
        )
        grp_bht23.course = 4
        grp_bht23.year = 2023
        grp_bht23.direction_code = "18.03.01"
        grp_bht23.direction_name = "Химическая технология"
        grp_bht23.save()

        grp_ekn23, _ = StudyGroup.objects.get_or_create(
            name="ЭКН-23",
            defaults={
                "course": 4,
                "year": 2023,
                "direction_code": "38.03.01",
                "direction_name": "Экономика и управление предприятиями",
            },
        )
        grp_ekn23.course = 4
        grp_ekn23.year = 2023
        grp_ekn23.direction_code = "38.03.01"
        grp_ekn23.direction_name = "Экономика и управление предприятиями"
        grp_ekn23.save()

        # Младшие курсы
        grp_bpi24, _ = StudyGroup.objects.get_or_create(
            name="БПИ-24",
            defaults={
                "course": 3,
                "year": 2024,
                "direction_code": "09.03.01",
                "direction_name": "Информатика и вычислительная техника",
            },
        )
        grp_bht24, _ = StudyGroup.objects.get_or_create(
            name="БХТ-24",
            defaults={
                "course": 3,
                "year": 2024,
                "direction_code": "18.03.01",
                "direction_name": "Химическая технология",
            },
        )
        grp_bpi25, _ = StudyGroup.objects.get_or_create(
            name="БПИ-25",
            defaults={
                "course": 2,
                "year": 2025,
                "direction_code": "09.03.01",
                "direction_name": "Информатика и вычислительная техника",
            },
        )
        # 1 курс нового набора 2026 г.
        grp_bpi26, _ = StudyGroup.objects.get_or_create(
            name="БПИ-26",
            defaults={
                "course": 1,
                "year": 2026,
                "direction_code": "09.03.01",
                "direction_name": "Информатика и вычислительная техника",
            },
        )

        # 6. Students
        students_data = [
            # БПИ-23 (4 курс)
            ("Смирнов Максим Игоревич", "smirnov.m@misis.ru", grp_bpi23),
            ("Кузнецова Анна Сергеевна", "kuznetsova.a@misis.ru", grp_bpi23),
            ("Васильев Денис Павлович", "vasiliev.d@misis.ru", grp_bpi23),
            ("Соколов Артём Дмитриевич", "sokolov.a@misis.ru", grp_bpi23),
            ("Ковалева Ольга Николаевна", "kovaleva.o@misis.ru", grp_bpi23),
            # БХТ-23 (4 курс)
            ("Сидоров Артём Викторович", "sidorov.a@misis.ru", grp_bht23),
            ("Попова Мария Владимировна", "popova.m@misis.ru", grp_bht23),
            ("Новиков Илья Андреевич", "novikov.i@misis.ru", grp_bht23),
            ("Волков Дмитрий Сергеевич", "volkov.d@misis.ru", grp_bht23),
            # ЭКН-23 (4 курс)
            ("Морозова Дарья Олеговна", "morozova.d@misis.ru", grp_ekn23),
            ("Федоров Кирилл Романович", "fedorov.k@misis.ru", grp_ekn23),
            ("Лебедева Полина Андреевна", "lebedeva.p@misis.ru", grp_ekn23),
            ("Семенов Егор Алексеевич", "semenov.e@misis.ru", grp_ekn23),
            # БПИ-24 (3 курс)
            ("Михайлов Иван Сергеевич", "mikhailov.i@misis.ru", grp_bpi24),
            ("Павлова Екатерина Игоревна", "pavlova.e@misis.ru", grp_bpi24),
            # БХТ-24 (3 курс)
            ("Козлов Роман Николаевич", "kozlov.r@misis.ru", grp_bht24),
            # БПИ-25 (2 курс)
            ("Дмитриев Роман Олегович", "dmitriev.r@misis.ru", grp_bpi25),
            # БПИ-26 (1 курс)
            ("Новичков Никита Сергеевич", "novichkov.n@misis.ru", grp_bpi26),
            ("Андреева Алина Викторовна", "andreeva.a@misis.ru", grp_bpi26),
        ]

        students_list = []
        for name, email, grp in students_data:
            s, _ = Student.objects.get_or_create(
                full_name=name,
                defaults={"email": email, "group": grp},
            )
            s.email = email
            s.group = grp
            s.save()
            students_list.append(s)

        # 7. Workload entries (Academic year 2024-2025, Semester 2024-1)
        Workload.objects.all().delete()

        Workload.objects.create(
            teacher=teacher_head,
            discipline=disc_econ,
            group=grp_bpi23,
            semester="2024-1",
            hours_plan=36,
            hours_fact=36,
            day_of_week=1,
            lesson_number=2,
            room="301",
        )
        Workload.objects.create(
            teacher=teacher_head,
            discipline=disc_econ,
            group=grp_bht23,
            semester="2024-1",
            hours_plan=36,
            hours_fact=36,
            day_of_week=2,
            lesson_number=3,
            room="301",
        )
        Workload.objects.create(
            teacher=teacher_head,
            discipline=disc_econ,
            group=grp_ekn23,
            semester="2024-1",
            hours_plan=36,
            hours_fact=36,
            day_of_week=3,
            lesson_number=1,
            room="305",
        )
        Workload.objects.create(
            teacher=teacher_head,
            discipline=disc_pm,
            group=grp_bpi23,
            semester="2024-1",
            hours_plan=36,
            hours_fact=36,
            day_of_week=4,
            lesson_number=2,
            room="305",
        )
        Workload.objects.create(
            teacher=teacher1,
            discipline=disc_prod,
            group=grp_bht23,
            semester="2024-1",
            hours_plan=36,
            hours_fact=36,
            day_of_week=2,
            lesson_number=1,
            room="204",
        )
        Workload.objects.create(
            teacher=teacher1,
            discipline=disc_pm,
            group=grp_ekn23,
            semester="2024-1",
            hours_plan=36,
            hours_fact=36,
            day_of_week=5,
            lesson_number=3,
            room="204",
        )
        Workload.objects.create(
            teacher=teacher2,
            discipline=disc_law,
            group=grp_bpi23,
            semester="2024-1",
            hours_plan=36,
            hours_fact=36,
            day_of_week=3,
            lesson_number=4,
            room="112",
        )
        Workload.objects.create(
            teacher=teacher2,
            discipline=disc_phil,
            group=grp_bht23,
            semester="2024-1",
            hours_plan=36,
            hours_fact=36,
            day_of_week=1,
            lesson_number=4,
            room="112",
        )

        # 8. Grades — Чистая история по семестрам (2023-1, 2023-2, 2024-1, 2024-2, 2025-1)
        # Это обеспечивает идеальный линейный график успеваемости без сканерных артефактов
        Grade.objects.all().delete()

        # Студенты 4 курса (БПИ-23, БХТ-23, ЭКН-23)
        bpi_students = [s for s in students_list if s.group == grp_bpi23]
        bht_students = [s for s in students_list if s.group == grp_bht23]
        ekn_students = [s for s in students_list if s.group == grp_ekn23]

        # Семестры динамики:
        # 2023-1
        Grade.objects.create(student=bpi_students[0], discipline=disc_econ, teacher=teacher_head, semester="2023-1", grade=4.0, date=date(2023, 12, 20), source="manual")
        Grade.objects.create(student=bpi_students[1], discipline=disc_econ, teacher=teacher_head, semester="2023-1", grade=4.5, date=date(2023, 12, 20), source="manual")
        Grade.objects.create(student=bht_students[0], discipline=disc_econ, teacher=teacher_head, semester="2023-1", grade=4.0, date=date(2023, 12, 21), source="manual")
        Grade.objects.create(student=ekn_students[0], discipline=disc_econ, teacher=teacher_head, semester="2023-1", grade=4.2, date=date(2023, 12, 22), source="manual")

        # 2023-2
        Grade.objects.create(student=bpi_students[0], discipline=disc_phil, teacher=teacher2, semester="2023-2", grade=4.3, date=date(2024, 5, 20), source="manual")
        Grade.objects.create(student=bpi_students[1], discipline=disc_phil, teacher=teacher2, semester="2023-2", grade=4.8, date=date(2024, 5, 20), source="manual")
        Grade.objects.create(student=bht_students[0], discipline=disc_phil, teacher=teacher2, semester="2023-2", grade=4.1, date=date(2024, 5, 21), source="manual")
        Grade.objects.create(student=ekn_students[0], discipline=disc_phil, teacher=teacher2, semester="2023-2", grade=4.5, date=date(2024, 5, 22), source="manual")

        # 2024-1 (Текущий основной семестр)
        # БПИ-23 по Экономике и Праву
        Grade.objects.create(student=bpi_students[0], discipline=disc_econ, teacher=teacher_head, semester="2024-1", grade=4.0, date=date(2025, 1, 15), source="manual")
        Grade.objects.create(student=bpi_students[1], discipline=disc_econ, teacher=teacher_head, semester="2024-1", grade=5.0, date=date(2025, 1, 15), source="manual")
        Grade.objects.create(student=bpi_students[2], discipline=disc_econ, teacher=teacher_head, semester="2024-1", grade=3.5, date=date(2025, 1, 15), source="manual")
        Grade.objects.create(student=bpi_students[3], discipline=disc_law, teacher=teacher2, semester="2024-1", grade=4.5, date=date(2025, 1, 16), source="manual")
        Grade.objects.create(student=bpi_students[4], discipline=disc_pm, teacher=teacher_head, semester="2024-1", grade=4.0, date=date(2025, 1, 16), source="manual")

        # БХТ-23
        Grade.objects.create(student=bht_students[0], discipline=disc_econ, teacher=teacher_head, semester="2024-1", grade=4.5, date=date(2025, 1, 18), source="moodle")
        Grade.objects.create(student=bht_students[1], discipline=disc_prod, teacher=teacher1, semester="2024-1", grade=4.0, date=date(2025, 1, 18), source="moodle")
        # Новиков Илья имеет 2.0 (неуд по Производственному менеджменту — риск-зона для демонстрации аналитики)
        Grade.objects.create(student=bht_students[2], discipline=disc_prod, teacher=teacher1, semester="2024-1", grade=2.0, date=date(2025, 1, 18), source="moodle")
        Grade.objects.create(student=bht_students[3], discipline=disc_phil, teacher=teacher2, semester="2024-1", grade=4.2, date=date(2025, 1, 18), source="moodle")

        # ЭКН-23
        Grade.objects.create(student=ekn_students[0], discipline=disc_econ, teacher=teacher_head, semester="2024-1", grade=5.0, date=date(2024, 12, 24), source="excel")
        Grade.objects.create(student=ekn_students[1], discipline=disc_pm, teacher=teacher1, semester="2024-1", grade=4.5, date=date(2024, 12, 24), source="excel")
        Grade.objects.create(student=ekn_students[2], discipline=disc_econ, teacher=teacher_head, semester="2024-1", grade=4.8, date=date(2024, 12, 24), source="excel")
        Grade.objects.create(student=ekn_students[3], discipline=disc_pm, teacher=teacher1, semester="2024-1", grade=4.0, date=date(2024, 12, 24), source="excel")

        # 2024-2
        Grade.objects.create(student=bpi_students[0], discipline=disc_pm, teacher=teacher_head, semester="2024-2", grade=4.6, date=date(2025, 6, 10), source="manual")
        Grade.objects.create(student=bpi_students[1], discipline=disc_pm, teacher=teacher_head, semester="2024-2", grade=5.0, date=date(2025, 6, 10), source="manual")
        Grade.objects.create(student=bht_students[0], discipline=disc_pm, teacher=teacher1, semester="2024-2", grade=4.3, date=date(2025, 6, 11), source="manual")
        Grade.objects.create(student=ekn_students[0], discipline=disc_pm, teacher=teacher1, semester="2024-2", grade=4.7, date=date(2025, 6, 12), source="manual")

        # 2025-1
        Grade.objects.create(student=bpi_students[0], discipline=disc_econ, teacher=teacher_head, semester="2025-1", grade=4.5, date=date(2025, 12, 22), source="manual")
        Grade.objects.create(student=bpi_students[1], discipline=disc_econ, teacher=teacher_head, semester="2025-1", grade=4.8, date=date(2025, 12, 22), source="manual")
        Grade.objects.create(student=bht_students[0], discipline=disc_prod, teacher=teacher1, semester="2025-1", grade=4.2, date=date(2025, 12, 23), source="manual")
        Grade.objects.create(student=ekn_students[0], discipline=disc_pm, teacher=teacher1, semester="2025-1", grade=4.6, date=date(2025, 12, 24), source="manual")

        # 9. Survey templates & questions
        from surveys.models import (
            SurveyTemplate,
            SurveyQuestion,
            SurveyAssignment,
            SurveyAnswer,
            TeacherRecommendation,
        )

        SurveyAnswer.objects.all().delete()
        SurveyAssignment.objects.all().delete()
        TeacherRecommendation.objects.all().delete()

        template, _ = SurveyTemplate.objects.get_or_create(
            title="Оценка качества преподавания (осенний семестр 2024/2025)",
            semester="2024-1",
            academic_year="2024-2025",
            defaults={
                "description": "Анонимный опрос студентов филиала по оценке качества учебных дисциплин и работы преподавателей кафедры.",
                "is_active": True,
            },
        )

        SurveyQuestion.objects.all().delete()

        questions_def = [
            # 1. Шкальные критерии (1-5)
            ("clarity", "Преподаватель понятно, логично и доступно излагает учебный материал", "scale_5", [], 1),
            ("fairness", "Критерии оценивания прозрачны, баллы выставляются объективно и вовремя", "scale_5", [], 2),
            ("relevance", "Содержание занятий практически ценно и полезно для будущей профессии", "scale_5", [], 3),
            ("ethics", "Преподаватель доброжелателен, тактичен и готов ответить на вопросы", "scale_5", [], 4),
            ("facilities", "Учебный процесс хорошо организован, условия и техническое оснащение достаточны", "scale_5", [], 5),

            # 2. Вопросы с одним выбором ответа (single_choice)
            ("general", "Регулярность обратной связи преподавателя по выполненным заданиям и проектам", "single_choice", [
                "На каждом занятии или в течение 3 дней после сдачи",
                "Раз в 1-2 недели по установленному графику",
                "Только перед контрольными точками и зачетом",
                "Обратная связь практически отсутствовала"
            ], 6),
            ("general", "Степень использования современных цифровых сервисов и LMS в процессе обучения", "single_choice", [
                "Постоянно (LMS Moodle, электронные тесты, интерактивные презентации)",
                "Периодически по ключевым сложным темам",
                "Редко, преимущественно классический лекционный формат",
                "Не использовались"
            ], 7),
            ("general", "Оцените общий темп освоения учебного материала и баланс учебной нагрузки", "single_choice", [
                "Оптимальный темп, нагрузка распределена равномерно",
                "Интенсивный темп, требовалось много самостоятельной работы",
                "Умеренный темп, материал давался легко",
                "Перегруженный темп, времени на качественное освоение не хватало"
            ], 8),

            # 3. Вопросы с множественным выбором ответа (multiple_choice)
            ("relevance", "Какие формы работы на занятиях оказались для вас наиболее эффективными и полезными?", "multiple_choice", [
                "Разбор реальных отраслевых и производственных кейсов",
                "Интерактивные дискуссии и семинарские обсуждения",
                "Практические расчетные задания и моделирование",
                "Работа в малых командах над проектом",
                "Индивидуальные консультации с разбором ошибок"
            ], 9),
            ("facilities", "Какие учебные и информационные ресурсы помогали вам в подготовке больше всего?", "multiple_choice", [
                "Материалы и тесты в LMS Moodle",
                "Авторские презентации и конспекты преподавателя",
                "Рекомендуемые электронные учебники и научные публикации",
                "Записи лекций и видеоразборы типовых задач",
                "Дополнительные открытые интернет-источники"
            ], 10),

            # 4. Текстовые отзывы со свободной формой (text)
            ("general", "Что вам больше всего понравилось в работе преподавателя и содержании дисциплины?", "text", [], 11),
            ("general", "Ваши конкретные предложения и рекомендации преподавателю по улучшению курса", "text", [], 12),
        ]

        q_objs = []
        for cat, txt, qtype, opts, ord_idx in questions_def:
            q = SurveyQuestion.objects.create(
                template=template,
                text=txt,
                category=cat,
                question_type=qtype,
                options=opts,
                order=ord_idx,
            )
            q_objs.append(q)

        # 10. Survey assignments (Cascading items for groups БПИ-23, БХТ-23, ЭКН-23)
        assignments_data = [
            (template, teacher_head, disc_econ, grp_bpi23, dept_gisen),
            (template, teacher_head, disc_econ, grp_bht23, dept_gisen),
            (template, teacher_head, disc_econ, grp_ekn23, dept_gisen),
            (template, teacher_head, disc_pm, grp_bpi23, dept_gisen),
            (template, teacher1, disc_prod, grp_bht23, dept_gisen),
            (template, teacher1, disc_pm, grp_ekn23, dept_gisen),
            (template, teacher2, disc_law, grp_bpi23, dept_gisen),
            (template, teacher2, disc_phil, grp_bht23, dept_gisen),
        ]

        assigned_objs = []
        for tpl, tch, disc, grp, dpt in assignments_data:
            assign = SurveyAssignment.objects.create(
                template=tpl,
                teacher=tch,
                discipline=disc,
                group=grp,
                department=dpt,
                is_open=True,
            )
            assigned_objs.append(assign)

        # 11. Seeded answers for Izmailova M.A. (Head) matching requirements:
        # БПИ-23 -> ~30% satisfaction (score ~2.2)
        # БХТ-23 -> ~70% satisfaction (score ~3.8)
        # ЭКН-23 -> ~85% satisfaction (score ~4.4)

        # Izmailova - Экономика - БПИ-23
        assign_bpi23 = assigned_objs[0]
        bpi_sessions = [
            (
                [2, 2, 2, 3, 2],
                "Только перед контрольными точками и зачетом",
                "Редко, преимущественно классический лекционный формат",
                "Интенсивный темп, требовалось много самостоятельной работы",
                ["Практические расчетные задания и моделирование", "Индивидуальные консультации с разбором ошибок"],
                ["Авторские презентации и конспекты преподавателя", "Дополнительные открытые интернет-источники"],
                "Четкая структура курса и соблюдение регламентов.",
                "Слишком много теоретических выкладок. Нам, как программистам, нужны кейсы юнит-экономики IT-продуктов."
            ),
            (
                [2, 3, 2, 2, 2],
                "Раз в 1-2 недели по установленному графику",
                "Периодически по ключевым сложным темам",
                "Перегруженный темп, времени на качественное освоение не хватало",
                ["Разбор реальных отраслевых и производственных кейсов"],
                ["Материалы и тесты в LMS Moodle"],
                "Пунктуальность преподавателя и доступность литературы.",
                "Хотелось бы более практических примеров в Excel или Python для расчетов."
            ),
            (
                [3, 2, 2, 3, 2],
                "Только перед контрольными точками и зачетом",
                "Редко, преимущественно классический лекционный формат",
                "Оптимальный темп, нагрузка распределена равномерно",
                ["Интерактивные дискуссии и семинарские обсуждения"],
                ["Записи лекций и видеоразборы типовых задач"],
                "Строгие и понятные требования к зачету.",
                "Тяжело воспринимать формулы макроэкономики без привязки к современным цифровым сервисам."
            ),
        ]
        for scores, sc1, sc2, sc3, mc1, mc2, txt_pos, txt_rec in bpi_sessions:
            s_hash = uuid.uuid4().hex
            # 5 scale criteria
            for idx, score_val in enumerate(scores):
                SurveyAnswer.objects.create(
                    assignment=assign_bpi23,
                    question=q_objs[idx],
                    score=score_val,
                    submission_hash=s_hash,
                )
            # 3 single choice
            SurveyAnswer.objects.create(assignment=assign_bpi23, question=q_objs[5], text_response=sc1, submission_hash=s_hash)
            SurveyAnswer.objects.create(assignment=assign_bpi23, question=q_objs[6], text_response=sc2, submission_hash=s_hash)
            SurveyAnswer.objects.create(assignment=assign_bpi23, question=q_objs[7], text_response=sc3, submission_hash=s_hash)
            # 2 multiple choice
            SurveyAnswer.objects.create(assignment=assign_bpi23, question=q_objs[8], text_response=", ".join(mc1), submission_hash=s_hash)
            SurveyAnswer.objects.create(assignment=assign_bpi23, question=q_objs[9], text_response=", ".join(mc2), submission_hash=s_hash)
            # 2 text responses
            if txt_pos:
                SurveyAnswer.objects.create(assignment=assign_bpi23, question=q_objs[10], text_response=txt_pos, submission_hash=s_hash)
            if txt_rec:
                SurveyAnswer.objects.create(assignment=assign_bpi23, question=q_objs[11], text_response=txt_rec, submission_hash=s_hash)

        # Izmailova - Экономика - БХТ-23
        assign_bht23 = assigned_objs[1]
        bht_sessions = [
            ([4, 4, 3, 4, 4], "Хороший курс! Понятно объясняются основы ценообразования на химических предприятиях."),
            ([4, 3, 4, 4, 4], "Интересные лекции, но на практиках хотелось бы чуть подробнее разбирать расчетную часть."),
            ([4, 4, 4, 4, 3], "Марина Анатольевна профессионально читает лекции, доброжелательное отношение."),
        ]
        for scores, comment in bht_sessions:
            s_hash = uuid.uuid4().hex
            for idx, score_val in enumerate(scores):
                SurveyAnswer.objects.create(
                    assignment=assign_bht23,
                    question=q_objs[idx],
                    score=score_val,
                    submission_hash=s_hash,
                )
            if comment:
                SurveyAnswer.objects.create(
                    assignment=assign_bht23,
                    question=q_objs[5],
                    text_response=comment,
                    submission_hash=s_hash,
                )

        # Izmailova - Экономика - ЭКН-23
        assign_ekn23 = assigned_objs[2]
        ekn_sessions = [
            ([5, 5, 4, 5, 4], "Великолепный предмет и отличный преподаватель! Разбираем реальные отраслевые кейсы."),
            ([4, 5, 5, 5, 4], "Марина Анатольевна вдохновляет глубже изучать экономику, все материалы актуальные."),
            ([5, 4, 5, 5, 4], "Очень ценные рекомендации на консультациях, справедливая система баллов."),
        ]
        for scores, comment in ekn_sessions:
            s_hash = uuid.uuid4().hex
            for idx, score_val in enumerate(scores):
                SurveyAnswer.objects.create(
                    assignment=assign_ekn23,
                    question=q_objs[idx],
                    score=score_val,
                    submission_hash=s_hash,
                )
            if comment:
                SurveyAnswer.objects.create(
                    assignment=assign_ekn23,
                    question=q_objs[5],
                    text_response=comment,
                    submission_hash=s_hash,
                )

        # Торшина Е.А. (teacher2) - ответы
        assign_torshina = assigned_objs[6]
        torshina_sessions = [
            ([4, 4, 4, 4, 4], "Понятные разъяснения законодательства, четкие требования к зачету."),
            ([5, 4, 4, 5, 4], "Елена Александровна всегда отвечает на вопросы студентов, отличные практические семинары."),
        ]
        for scores, comment in torshina_sessions:
            s_hash = uuid.uuid4().hex
            for idx, score_val in enumerate(scores):
                SurveyAnswer.objects.create(
                    assignment=assign_torshina,
                    question=q_objs[idx],
                    score=score_val,
                    submission_hash=s_hash,
                )
            if comment:
                SurveyAnswer.objects.create(
                    assignment=assign_torshina,
                    question=q_objs[5],
                    text_response=comment,
                    submission_hash=s_hash,
                )

        # Нечетов А.В. (teacher1) - ответы
        assign_nechetov = assigned_objs[4]
        nechetov_sessions = [
            ([4, 4, 4, 4, 4], "Интересный курс менеджмента, актуальные производственные задачи."),
            ([4, 4, 3, 4, 4], "Хороший преподаватель, подробные разборы производственных кейсов."),
        ]
        for scores, comment in nechetov_sessions:
            s_hash = uuid.uuid4().hex
            for idx, score_val in enumerate(scores):
                SurveyAnswer.objects.create(
                    assignment=assign_nechetov,
                    question=q_objs[idx],
                    score=score_val,
                    submission_hash=s_hash,
                )
            if comment:
                SurveyAnswer.objects.create(
                    assignment=assign_nechetov,
                    question=q_objs[5],
                    text_response=comment,
                    submission_hash=s_hash,
                )

        # Seeded Recommendation for Izmailova based on BPI-23 feedback
        TeacherRecommendation.objects.create(
            teacher=teacher_head,
            discipline=disc_econ,
            semester="2024-1",
            category="relevance",
            source="auto",
            recommendation_text="По результатам анкет группы БПИ-23 (ИВТ, удовлетворенность 30%): рекомендуется адаптировать блок практических занятий под IT-индустрию (юнит-экономика, финансовое моделирование стартапов).",
            status="published",
        )

        self.stdout.write(self.style.SUCCESS("[OK] Demo data successfully cleansed and populated!"))
        self.stdout.write("  Пользователи:")
        self.stdout.write("    head / head12345 (Зав. кафедрой ГиСЭН Измайлова М.А.)")
        self.stdout.write("    teacher1 / teacher12345 (Доцент Нечетов А.В.)")
        self.stdout.write("    teacher2 / teacher22345 (Старший преп. Торшина Е.А.)")
        self.stdout.write("    admin / admin12345 (Администратор)")
