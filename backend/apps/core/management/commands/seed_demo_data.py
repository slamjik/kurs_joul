"""
Management command to seed realistic demo data for KafIS project.
Usage: python manage.py seed_demo_data
"""

from datetime import date
from django.core.management.base import BaseCommand
from django.db import transaction

from auth_app.models import User
from workload.models import Department, Teacher, StudyGroup, Discipline, Workload
from grades.models import Student, Grade


class Command(BaseCommand):
    help = "Seed database with initial demo data for KafIS (ГиСЭН)"

    @transaction.atomic
    def handle(self, *args, **options):
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
                "first_name": "Инна",
                "last_name": "Ковалева",
                "email": "kovaleva@misis.ru",
                "is_staff": True,
            },
        )
        head_user.set_password("head12345")
        head_user.save()

        t1_user, _ = User.objects.get_or_create(
            username="teacher1",
            defaults={
                "role": "teacher",
                "first_name": "Андрей",
                "last_name": "Иванов",
                "email": "ivanov@misis.ru",
            },
        )
        t1_user.set_password("teacher12345")
        t1_user.save()

        t2_user, _ = User.objects.get_or_create(
            username="teacher2",
            defaults={
                "role": "teacher",
                "first_name": "Елена",
                "last_name": "Петрова",
                "email": "petrova@misis.ru",
            },
        )
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
                "full_name": "Ковалева Инна Александровна",
                "department": dept,
                "position": "Заведующий кафедрой, профессор",
                "hours_limit": 900.0,
            },
        )

        teacher1, _ = Teacher.objects.get_or_create(
            user=t1_user,
            defaults={
                "full_name": "Иванов Андрей Алексеевич",
                "department": dept,
                "position": "Доцент кафедры",
                "hours_limit": 850.0,
            },
        )

        teacher2, _ = Teacher.objects.get_or_create(
            user=t2_user,
            defaults={
                "full_name": "Петрова Елена Викторовна",
                "department": dept,
                "position": "Старший преподаватель",
                "hours_limit": 800.0,
            },
        )

        # 4. Disciplines
        disc_phil, _ = Discipline.objects.get_or_create(
            code="ФИЛ-01",
            defaults={"name": "Философия", "total_hours": 72, "lesson_type": "lecture"},
        )
        disc_econ, _ = Discipline.objects.get_or_create(
            code="ЭКН-02",
            defaults={"name": "Экономическая теория", "total_hours": 72, "lesson_type": "lecture"},
        )
        disc_soc, _ = Discipline.objects.get_or_create(
            code="СОЦ-03",
            defaults={"name": "Социология", "total_hours": 36, "lesson_type": "practice"},
        )
        disc_law, _ = Discipline.objects.get_or_create(
            code="ПРАВ-04",
            defaults={"name": "Правоведение", "total_hours": 36, "lesson_type": "lecture"},
        )

        # 5. Study Groups
        grp_bpi22, _ = StudyGroup.objects.get_or_create(
            name="БПИ-22",
            defaults={
                "course": 3,
                "year": 2022,
                "direction_code": "09.03.01",
                "direction_name": "Информатика и вычислительная техника",
            },
        )
        grp_bpi23, _ = StudyGroup.objects.get_or_create(
            name="БПИ-23",
            defaults={
                "course": 2,
                "year": 2023,
                "direction_code": "09.03.01",
                "direction_name": "Информатика и вычислительная техника",
            },
        )
        grp_ekm22, _ = StudyGroup.objects.get_or_create(
            name="ЭКМ-22",
            defaults={
                "course": 3,
                "year": 2022,
                "direction_code": "38.03.01",
                "direction_name": "Экономика",
            },
        )

        # 6. Students
        students_data = [
            ("Смирнов Максим Игоревич", "smirnov@misis.ru", grp_bpi22),
            ("Кузнецова Анна Сергеевна", "kuznetsova@misis.ru", grp_bpi22),
            ("Васильев Денис Павлович", "vasiliev@misis.ru", grp_bpi22),
            ("Сидоров Артем Викторович", "sidorov@misis.ru", grp_bpi23),
            ("Попова Мария Владимировна", "popova@misis.ru", grp_bpi23),
            ("Новиков Илья Андреевич", "novikov@misis.ru", grp_bpi23),  # Risk student
            ("Морозова Дарья Олеговна", "morozova@misis.ru", grp_ekm22),
            ("Федоров Кирилл Романович", "fedorov@misis.ru", grp_ekm22),
        ]

        students_list = []
        for name, email, grp in students_data:
            s, _ = Student.objects.get_or_create(
                full_name=name,
                defaults={"email": email, "group": grp},
            )
            students_list.append(s)

        # 7. Workload entries
        Workload.objects.get_or_create(
            teacher=teacher1,
            discipline=disc_phil,
            group=grp_bpi23,
            semester="2024-1",
            defaults={
                "hours_plan": 36,
                "hours_fact": 36,
                "day_of_week": 1,
                "lesson_number": 2,
                "room": "204",
            },
        )

        Workload.objects.get_or_create(
            teacher=teacher1,
            discipline=disc_soc,
            group=grp_bpi23,
            semester="2024-1",
            defaults={
                "hours_plan": 36,
                "hours_fact": 24,
                "day_of_week": 3,
                "lesson_number": 3,
                "room": "208",
            },
        )

        Workload.objects.get_or_create(
            teacher=teacher2,
            discipline=disc_econ,
            group=grp_ekm22,
            semester="2024-1",
            defaults={
                "hours_plan": 72,
                "hours_fact": 54,
                "day_of_week": 2,
                "lesson_number": 1,
                "room": "112",
            },
        )

        Workload.objects.get_or_create(
            teacher=teacher_head,
            discipline=disc_law,
            group=grp_bpi22,
            semester="2024-1",
            defaults={
                "hours_plan": 36,
                "hours_fact": 36,
                "day_of_week": 4,
                "lesson_number": 2,
                "room": "301",
            },
        )

        # 8. Grades (diverse grades, including Novikov in risk zone)
        grades_data = [
            (students_list[0], disc_law, teacher_head, 5.0, date(2025, 1, 15), "manual"),
            (students_list[1], disc_law, teacher_head, 4.0, date(2025, 1, 15), "manual"),
            (students_list[2], disc_law, teacher_head, 4.0, date(2025, 1, 15), "manual"),
            (students_list[3], disc_phil, teacher1, 5.0, date(2025, 1, 18), "moodle"),
            (students_list[4], disc_phil, teacher1, 4.0, date(2025, 1, 18), "moodle"),
            (students_list[5], disc_phil, teacher1, 2.0, date(2025, 1, 18), "moodle"), # Risk student: grade 2.0
            (students_list[6], disc_econ, teacher2, 4.0, date(2024, 12, 24), "excel"),
            (students_list[7], disc_econ, teacher2, 3.0, date(2024, 12, 24), "excel"),
        ]

        for st, disc, tch, val, dt, src in grades_data:
            Grade.objects.get_or_create(
                student=st,
                discipline=disc,
                semester="2024-1",
                defaults={
                    "teacher": tch,
                    "grade": val,
                    "date": dt,
                    "source": src,
                },
            )

        # 9. Survey templates & questions
        from surveys.models import (
            SurveyTemplate,
            SurveyQuestion,
            SurveyAssignment,
            SurveyAnswer,
            TeacherRecommendation,
        )

        template, _ = SurveyTemplate.objects.get_or_create(
            title="Оценка качества преподавания (осенний семестр 2024/2025)",
            semester="2024-1",
            academic_year="2024-2025",
            defaults={
                "description": "Анонимный опрос студентов филиала по оценке качества учебных дисциплин и работы преподавателей кафедры.",
                "is_active": True,
            },
        )

        questions_def = [
            ("clarity", "Преподаватель понятно, логично и доступно излагает учебный материал", "scale_5", 1),
            ("fairness", "Критерии оценивания прозрачны, баллы выставляются объективно и вовремя", "scale_5", 2),
            ("relevance", "Содержание занятий практически ценно и полезно для будущей профессии", "scale_5", 3),
            ("ethics", "Преподаватель доброжелателен, пунктуален и готов ответить на вопросы", "scale_5", 4),
            ("facilities", "Учебный процесс хорошо организован, условия в аудиториях комфортны", "scale_5", 5),
            ("general", "Ваши пожелания и рекомендации преподавателю по улучшению занятий", "text", 6),
        ]

        q_objs = []
        for cat, txt, qtype, ord_idx in questions_def:
            q, _ = SurveyQuestion.objects.get_or_create(
                template=template,
                text=txt,
                defaults={
                    "category": cat,
                    "question_type": qtype,
                    "order": ord_idx,
                },
            )
            q_objs.append(q)

        # 10. Survey assignments
        assignments_data = [
            (template, teacher1, disc_phil, grp_bpi23, dept_gisen),
            (template, teacher2, disc_econ, grp_ekm22, dept_econ),
            (template, teacher_head, disc_law, grp_bpi22, dept_gisen),
        ]

        assigned_objs = []
        for tpl, tch, disc, grp, dpt in assignments_data:
            assign, _ = SurveyAssignment.objects.get_or_create(
                template=tpl,
                teacher=tch,
                discipline=disc,
                group=grp,
                defaults={
                    "department": dpt,
                    "is_open": True,
                },
            )
            assigned_objs.append(assign)

        # 11. Seeded answers for Teacher 1 (Иванов А. А.)
        t1_assign = assigned_objs[0]
        if not SurveyAnswer.objects.filter(assignment=t1_assign).exists():
            import uuid
            # Несколько сессий ответов студентов с реалистичными оценками
            t1_sessions = [
                ([5, 4, 5, 5, 4], "Отличный преподаватель, сложные темы философии объясняет простым языком."),
                ([4, 4, 4, 5, 3], "Всё нравится, но в аудитории 204 иногда сбоит проектор."),
                ([5, 5, 4, 5, 4], "Интересные дискуссии на семинарах, объективное оценивание."),
                ([4, 3, 4, 4, 3], "Хотелось бы чуть больше времени на выполнение тестов."),
            ]
            for scores, comment in t1_sessions:
                s_hash = uuid.uuid4().hex
                for idx, score_val in enumerate(scores):
                    SurveyAnswer.objects.create(
                        assignment=t1_assign,
                        question=q_objs[idx],
                        score=score_val,
                        submission_hash=s_hash,
                    )
                if comment:
                    SurveyAnswer.objects.create(
                        assignment=t1_assign,
                        question=q_objs[5], # text question
                        text_response=comment,
                        submission_hash=s_hash,
                    )

            # Recommendations
            TeacherRecommendation.objects.get_or_create(
                teacher=teacher1,
                discipline=disc_phil,
                semester="2024-1",
                category="facilities",
                defaults={
                    "source": "auto",
                    "recommendation_text": "Заведующему кафедрой рекомендуется направить служебную записку в диспетчерскую службу о проверке проекционного оборудования в аудитории 204.",
                    "status": "published",
                },
            )

        self.stdout.write(self.style.SUCCESS("[OK] Demo data successfully created!"))
        self.stdout.write("  Пользователи:")
        self.stdout.write("    head / head12345 (Зав. кафедрой)")
        self.stdout.write("    teacher1 / teacher12345 (Преподаватель)")
        self.stdout.write("    teacher2 / teacher22345 (Преподаватель)")
        self.stdout.write("    admin / admin12345 (Администратор)")
