"""
Management command to seed realistic university data from real semester workload Excel files.
Usage: python manage.py seed_demo_data
"""

import os
import re
import uuid
from datetime import date
from pathlib import Path
import openpyxl

from django.core.management.base import BaseCommand
from django.db import transaction
from django.core.cache import cache

from auth_app.models import User
from workload.models import Department, Teacher, StudyGroup, Discipline, Workload
from grades.models import Student, Grade
from audit.models import AuditLog
from surveys.models import (
    SurveyTemplate,
    SurveyQuestion,
    SurveyAssignment,
    SurveyAnswer,
    TeacherRecommendation,
)


def clean_teacher_name(name):
    if not name:
        return ""
    name = str(name).strip().lstrip("\\/").strip()
    name = re.sub(r"\s+", " ", name)
    # Fix Latin letters in Cyrillic initials
    name = name.replace("C.", "С.").replace("a.", "А.").replace("c.", "с.")
    if name.endswith("А.Н"):
        name = name + "."
    if name.endswith("И.М"):
        name = name + "."
    return name


def parse_hours(val):
    if val is None:
        return 0
    s = str(val).strip()
    if not s:
        return 0
    # Handle formats like "34*2" or "17+17" or "34"
    if "*" in s:
        parts = s.split("*")
        try:
            return int(float(parts[0].strip())) * int(float(parts[1].strip()))
        except Exception:
            pass
    if "+" in s:
        parts = s.split("+")
        try:
            return sum(int(float(p.strip())) for p in parts if p.strip().isdigit())
        except Exception:
            pass
    # Extract leading digits
    m = re.match(r"^(\d+)", s)
    if m:
        try:
            return int(m.group(1))
        except Exception:
            pass
    return 0


class Command(BaseCommand):
    help = "Seed database with real semester workload from Excel and survey templates (Autumn / Spring)"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Очистка устаревших данных...")

        # 0. Очистка зависимых сущностей в правильном порядке
        Grade.objects.all().delete()
        Student.objects.all().delete()
        SurveyAnswer.objects.all().delete()
        SurveyAssignment.objects.all().delete()
        TeacherRecommendation.objects.all().delete()
        SurveyQuestion.objects.all().delete()
        SurveyTemplate.objects.all().delete()
        Workload.objects.all().delete()
        StudyGroup.objects.all().delete()
        Discipline.objects.all().delete()
        AuditLog.objects.all().delete()

        try:
            cache.clear()
        except Exception:
            pass

        self.stdout.write("1. Создание кафедр...")
        dept_gisen, _ = Department.objects.get_or_create(
            code="ГиСЭН",
            defaults={"name": "Кафедра гуманитарных и социально-экономических наук"},
        )
        dept_ekn, _ = Department.objects.get_or_create(
            code="ЭКН",
            defaults={"name": "Кафедра экономики и менеджмента"},
        )
        dept_met, _ = Department.objects.get_or_create(
            code="МЕТ",
            defaults={"name": "Кафедра металлургических технологий"},
        )
        dept_tmo, _ = Department.objects.get_or_create(
            code="ТМО",
            defaults={"name": "Кафедра технологического оборудования и машиностроения"},
        )
        dept_ee, _ = Department.objects.get_or_create(
            code="ЭЭ",
            defaults={"name": "Кафедра электроэнергетики"},
        )
        departments = [dept_gisen, dept_ekn, dept_met, dept_tmo, dept_ee]

        self.stdout.write("2. Создание ключевых пользователей...")
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
                "last_name": "Нефедова",
                "email": "nefedova@misis.ru",
            },
        )
        t2_user.first_name = "Елена"
        t2_user.last_name = "Нефедова"
        t2_user.email = "nefedova@misis.ru"
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

        self.stdout.write("3. Создание 20 академических учебных групп...")
        # 4 курса, по 5 групп на курс
        # БПИ: 09.03.01, БХТ: 18.03.01, БМТ: 22.03.02, БЭЭ: 13.03.02, БТМО: 15.03.02
        group_specs = [
            ("БПИ", "09.03.01", "Прикладная информатика"),
            ("БХТ", "18.03.01", "Химическая технология"),
            ("БМТ", "22.03.02", "Металлургия"),
            ("БЭЭ", "13.03.02", "Электроэнергетика и электротехника"),
            ("БТМО", "15.03.02", "Технологические машины и оборудование"),
        ]

        study_groups = {}
        for course in [1, 2, 3, 4]:
            year = 2027 - course  # 1к -> 2026, 2к -> 2025, 3к -> 2024, 4к -> 2023
            suffix = str(year)[-2:]
            for prefix, d_code, d_name in group_specs:
                grp_name = f"{prefix}-{suffix}"
                grp, _ = StudyGroup.objects.get_or_create(
                    name=grp_name,
                    defaults={
                        "course": course,
                        "year": year,
                        "direction_code": d_code,
                        "direction_name": d_name,
                    },
                )
                grp.course = course
                grp.year = year
                grp.direction_code = d_code
                grp.direction_name = d_name
                grp.save()
                study_groups[grp_name] = grp

        self.stdout.write(f"Создано {len(study_groups)} учебных групп.")

        self.stdout.write("4. Создание студентов...")
        first_names = ["Максим", "Анна", "Денис", "Артём", "Ольга", "Илья", "Дмитрий", "Дарья", "Полина", "Никита"]
        last_names = ["Смирнов", "Кузнецова", "Васильев", "Соколов", "Ковалева", "Новиков", "Волков", "Морозова", "Лебедева", "Попов"]
        students_all = []
        for grp_name, grp in study_groups.items():
            for i in range(5):
                fn = first_names[(hash(grp_name) + i) % len(first_names)]
                ln = last_names[(hash(grp_name) + i * 2) % len(last_names)]
                st = Student.objects.create(
                    full_name=f"{ln} {fn}",
                    email=f"{grp_name.lower()}_{i+1}@misis.ru",
                    group=grp,
                )
                students_all.append(st)

        self.stdout.write(f"Создано {len(students_all)} студентов.")

        self.stdout.write("5. Создание шаблонов опроса для Осеннего и Весеннего семестров...")
        template_autumn, _ = SurveyTemplate.objects.get_or_create(
            semester="2026-1",
            academic_year="2026-2027",
            defaults={
                "title": "Оценка качества преподавания (Осенний семестр 2026/2027)",
                "description": "Анонимный опрос студентов филиала по итогам осеннего семестра",
                "is_active": True,
            },
        )
        template_autumn.title = "Оценка качества преподавания (Осенний семестр 2026/2027)"
        template_autumn.is_active = True
        template_autumn.save()

        template_spring, _ = SurveyTemplate.objects.get_or_create(
            semester="2026-2",
            academic_year="2026-2027",
            defaults={
                "title": "Оценка качества преподавания (Весенний семестр 2026/2027)",
                "description": "Анонимный опрос студентов филиала по итогам весеннего семестра",
                "is_active": True,
            },
        )
        template_spring.title = "Оценка качества преподавания (Весенний семестр 2026/2027)"
        template_spring.is_active = True
        template_spring.save()

        # 12 академических критериев оценивания (привязаны к обоим шаблонам)
        questions_def = [
            ("clarity", "Преподаватель понятно, логично и доступно излагает учебный материал", "scale_5", [], 1),
            ("fairness", "Критерии оценивания прозрачны, баллы выставляются объективно и вовремя", "scale_5", [], 2),
            ("relevance", "Содержание занятий практически ценно и полезно для будущей профессии", "scale_5", [], 3),
            ("ethics", "Преподаватель доброжелателен, тактичен и готов ответить на вопросы", "scale_5", [], 4),
            ("facilities", "Учебный процесс хорошо организован, условия и техническое оснащение достаточны", "scale_5", [], 5),
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
            ("general", "Что вам больше всего понравилось в работе преподавателя и содержании дисциплины?", "text", [], 11),
            ("general", "Ваши конкретные предложения и рекомендации преподавателю по улучшению курса", "text", [], 12),
        ]

        questions_autumn = []
        for cat, txt, qtype, opts, ord_idx in questions_def:
            q = SurveyQuestion.objects.create(
                template=template_autumn,
                text=txt,
                category=cat,
                question_type=qtype,
                options=opts,
                order=ord_idx,
            )
            questions_autumn.append(q)

        questions_spring = []
        for cat, txt, qtype, opts, ord_idx in questions_def:
            q = SurveyQuestion.objects.create(
                template=template_spring,
                text=txt,
                category=cat,
                question_type=qtype,
                options=opts,
                order=ord_idx,
            )
            questions_spring.append(q)

        # Поиск файлов нагрузки
        repo_root = Path(__file__).resolve().parent.parent.parent.parent.parent
        base_candidates = [
            repo_root / "data" / "workload_input",
            repo_root / "backend" / "data" / "workload_input",
            Path("/app/data/workload_input"),
            Path("/app/backend/data/workload_input"),
            Path.cwd() / "data" / "workload_input",
            Path.cwd() / "backend" / "data" / "workload_input",
            Path("backend/data/workload_input"),
            Path("data/workload_input"),
            Path("."),
        ]

        excel_files = []
        for course_num in [1, 2, 3, 4]:
            fname = f"SEMESTROVAYa_NAGRUZKA_{course_num}k.xlsx"
            found_path = None
            for cand in base_candidates:
                p = cand / fname
                if p.exists():
                    found_path = p
                    break
            if found_path:
                excel_files.append((found_path, course_num))
            else:
                self.stdout.write(self.style.WARNING(f"Файл {fname} не найден в кандидатах"))

        self.stdout.write(f"Найдено файлов для импорта: {len(excel_files)}")

        # Словарь преподавателей в БД: full_name -> Teacher
        teachers_cache = {}

        # Базовые преподаватели
        teacher_head, _ = Teacher.objects.get_or_create(
            user=head_user,
            defaults={
                "full_name": "Измайлова Марина Анатольевна",
                "department": dept_gisen,
                "position": "Заведующий кафедрой, д.э.н., профессор",
                "hours_limit": 900.0,
            },
        )
        teachers_cache["Измайлова М.А."] = teacher_head
        teachers_cache["Измайлова Марина Анатольевна"] = teacher_head

        teacher1, _ = Teacher.objects.get_or_create(
            user=t1_user,
            defaults={
                "full_name": "Нечетов Андрей Владимирович",
                "department": dept_gisen,
                "position": "Доцент кафедры, к.э.н.",
                "hours_limit": 850.0,
            },
        )
        teachers_cache["Нечетов В.Г."] = teacher1
        teachers_cache["Нечетов А.В."] = teacher1
        teachers_cache["Нечетов Андрей Владимирович"] = teacher1

        teacher2, _ = Teacher.objects.get_or_create(
            user=t2_user,
            defaults={
                "full_name": "Нефедова Елена Васильевна",
                "department": dept_gisen,
                "position": "Старший преподаватель",
                "hours_limit": 800.0,
            },
        )
        teachers_cache["Нефедова Е.В."] = teacher2
        teachers_cache["Торшина А.В."] = teacher2

        def get_or_create_teacher(name_str):
            cleaned = clean_teacher_name(name_str)
            if not cleaned or cleaned.lower() == "вакансия":
                return teacher_head
            if cleaned in teachers_cache:
                return teachers_cache[cleaned]

            # Создаем нового преподавателя
            username_clean = f"t_{abs(hash(cleaned)) % 100000}"
            u, _ = User.objects.get_or_create(
                username=username_clean,
                defaults={
                    "role": "teacher",
                    "first_name": cleaned.split()[0],
                    "last_name": cleaned.split()[-1] if len(cleaned.split()) > 1 else "",
                    "email": f"{username_clean}@misis.ru",
                },
            )
            u.set_password("teacher12345")
            u.save()

            # Кафедра по умолчанию распределяется правдоподобно
            dept_for_teacher = departments[abs(hash(cleaned)) % len(departments)]
            tch, _ = Teacher.objects.get_or_create(
                user=u,
                defaults={
                    "full_name": cleaned,
                    "department": dept_for_teacher,
                    "position": "Доцент кафедры",
                    "hours_limit": 800.0,
                },
            )
            teachers_cache[cleaned] = tch
            return tch

        disciplines_cache = {}
        disc_counter = 1

        def get_or_create_discipline(name_str, lec_h, pz_h, lab_h):
            nonlocal disc_counter
            name_clean = str(name_str).strip()
            if name_clean in disciplines_cache:
                return disciplines_cache[name_clean]

            lesson_t = "lecture"
            if lab_h > 0:
                lesson_t = "lab"
            elif pz_h > 0:
                lesson_t = "practice"

            tot_h = (lec_h + pz_h + lab_h) or 72
            disc_code = f"DISC-{disc_counter:03d}"
            disc_counter += 1

            disc, _ = Discipline.objects.get_or_create(
                code=disc_code,
                defaults={
                    "name": name_clean,
                    "total_hours": tot_h,
                    "lesson_type": lesson_t,
                },
            )
            disciplines_cache[name_clean] = disc
            return disc

        workloads_created = 0
        assignments_autumn = []
        assignments_spring = []

        day_rotator = 1
        lesson_rotator = 1
        rooms_list = ["101", "203", "204", "312", "315", "401", "408", "Акт. зал", "Комп. класс 1", "Комп. класс 2"]

        for fpath, course_num in excel_files:
            wb = openpyxl.load_workbook(fpath, data_only=True)
            for sname in wb.sheetnames:
                sheet = wb[sname]
                grp_obj = study_groups.get(sname)
                if not grp_obj:
                    # Попробуем сопоставить по нормализованному имени
                    sname_clean = sname.strip()
                    grp_obj = study_groups.get(sname_clean)
                if not grp_obj:
                    continue

                current_semester = None
                for r in range(1, sheet.max_row + 1):
                    row_str = " ".join([str(sheet.cell(r, c).value or "") for c in range(1, 12)])
                    sem_match = re.search(r"СЕМЕСТР\s*(\d+)", row_str, re.IGNORECASE)
                    if sem_match:
                        current_semester = int(sem_match.group(1))
                        continue

                    if current_semester is None:
                        continue

                    cell_b = sheet.cell(r, 2).value
                    cell_c = sheet.cell(r, 3).value
                    if not cell_b:
                        continue
                    disc_name = str(cell_b).strip()
                    if disc_name.lower() in ["дисциплина", "итог", "всего"]:
                        continue
                    if any(k in disc_name.lower() for k in ["учебный год", "группа", "зав. кафедрой", "декан", "руководитель", "подпись"]):
                        continue

                    lec_h = parse_hours(sheet.cell(r, 8).value)
                    pz_h = parse_hours(sheet.cell(r, 9).value)
                    lab_h = parse_hours(sheet.cell(r, 10).value)

                    disc_obj = get_or_create_discipline(disc_name, lec_h, pz_h, lab_h)

                    # Преподаватели
                    teacher_raw = str(cell_c).strip() if cell_c else ""
                    row_teachers = []
                    if teacher_raw and teacher_raw != "None":
                        for t_str in re.split(r"[\n\r/]+", teacher_raw):
                            c_name = clean_teacher_name(t_str)
                            if c_name and not c_name.isdigit() and len(c_name) > 2 and "преподаватель" not in c_name.lower():
                                row_teachers.append(get_or_create_teacher(c_name))

                    if not row_teachers:
                        row_teachers = [teacher_head]

                    is_autumn = (current_semester % 2 == 1)
                    sem_code = "2026-1" if is_autumn else "2026-2"
                    target_template = template_autumn if is_autumn else template_spring

                    for tch in row_teachers:
                        hours_p = (lec_h + pz_h + lab_h) or 36
                        hours_f = max(0, int(hours_p * 0.75))

                        wl = Workload.objects.create(
                            teacher=tch,
                            discipline=disc_obj,
                            group=grp_obj,
                            semester=sem_code,
                            hours_plan=hours_p,
                            hours_fact=hours_f,
                            day_of_week=(day_rotator % 6) + 1,
                            lesson_number=(lesson_rotator % 5) + 1,
                            room=rooms_list[(day_rotator + lesson_rotator) % len(rooms_list)],
                        )
                        workloads_created += 1
                        day_rotator += 1
                        lesson_rotator += 1

                        # Назначение для опроса студентов
                        assign = SurveyAssignment.objects.create(
                            template=target_template,
                            teacher=tch,
                            discipline=disc_obj,
                            group=grp_obj,
                            department=tch.department or dept_gisen,
                            is_open=True,
                        )
                        if is_autumn:
                            assignments_autumn.append(assign)
                        else:
                            assignments_spring.append(assign)

        self.stdout.write(f"Создано строк нагрузки: {workloads_created}")
        self.stdout.write(f"Создано назначений опроса (Осень): {len(assignments_autumn)}")
        self.stdout.write(f"Создано назначений опроса (Весна): {len(assignments_spring)}")

        self.stdout.write("7. Генерация оценок студентов (Grades)...")
        grade_count = 0
        for grp in study_groups.values():
            grp_students = Student.objects.filter(group=grp)
            grp_workloads = Workload.objects.filter(group=grp)[:6]
            for st in grp_students:
                for wl in grp_workloads:
                    # Разброс оценок: от 2.0 (неуд/долг) до 5.0 (отл)
                    grade_num = [4.0, 5.0, 3.0, 5.0, 4.0, 2.0][(abs(hash(st.full_name) + hash(wl.discipline.name))) % 6]
                    Grade.objects.create(
                        student=st,
                        discipline=wl.discipline,
                        teacher=wl.teacher,
                        semester=wl.semester,
                        grade=grade_num,
                        source=Grade.MOODLE,
                        date=date(2026, 10, 1),
                    )
                    grade_count += 1
        self.stdout.write(f"Создано {grade_count} записей успеваемости.")

        self.stdout.write("8. Заполнение реалистичных ответов студентов на анкеты (Survey Answers)...")

        sample_feedback_autumn = [
            ([5, 5, 4, 5, 4], "Лекции читаются очень структурированно и с живыми практическими примерами.", "Разбор реальных отраслевых и производственных кейсов"),
            ([4, 4, 4, 5, 5], "Доброжелательный преподаватель, оперативная обратная связь по лабораторным.", "Интерактивные дискуссии и семинарские обсуждения"),
            ([5, 4, 5, 4, 4], "Отличный курс! Разобрали современные методики и требования индустрии.", "Практические расчетные задания и моделирование"),
            ([4, 3, 4, 4, 4], "Интересный материал, хотелось бы чуть больше примеров для самостоятельной работы.", "Индивидуальные консультации с разбором ошибок"),
            ([5, 5, 5, 5, 5], "Один из лучших преподавателей филиала, все четко, понятно и справедливо.", "Разбор реальных отраслевых и производственных кейсов"),
        ]

        sample_feedback_spring = [
            ([5, 4, 5, 5, 4], "Весенний блок дисциплины еще интереснее, много практических задач.", "Разбор реальных отраслевых и производственных кейсов"),
            ([4, 4, 4, 4, 4], "Понятные дескрипторы оценивания, баллы в БРС выставляются вовремя.", "Практические расчетные задания и моделирование"),
            ([5, 5, 4, 5, 5], "Качественные материалы в Moodle, презентации всегда доступны онлайн.", "Интерактивные дискуссии и семинарские обсуждения"),
            ([4, 4, 5, 4, 4], "Преподаватель мотивирует изучать глубже и участвовать в конференциях.", "Работа в малых командах над проектом"),
        ]

        def seed_answers_for_assignments(assign_list, q_list, feedback_pool):
            count = 0
            # Выбираем подмножество назначений (например, по 2-3 на преподавателя)
            sample_assignments = assign_list[:50]
            for a in sample_assignments:
                # 2-3 студента заполняют анкету
                for idx in range(3):
                    scores, comment_pos, format_choice = feedback_pool[(count + idx) % len(feedback_pool)]
                    s_hash = uuid.uuid4().hex
                    # 5 матричных шкал (1-5)
                    for q_idx in range(5):
                        SurveyAnswer.objects.create(
                            assignment=a,
                            question=q_list[q_idx],
                            score=scores[q_idx],
                            submission_hash=s_hash,
                        )
                    # Вопрос 6: обратная связь
                    SurveyAnswer.objects.create(
                        assignment=a,
                        question=q_list[5],
                        text_response="На каждом занятии или в течение 3 дней после сдачи",
                        submission_hash=s_hash,
                    )
                    # Вопрос 7: цифровая среда
                    SurveyAnswer.objects.create(
                        assignment=a,
                        question=q_list[6],
                        text_response="Постоянно (LMS Moodle, электронные тесты, интерактивные презентации)",
                        submission_hash=s_hash,
                    )
                    # Вопрос 8: темп
                    SurveyAnswer.objects.create(
                        assignment=a,
                        question=q_list[7],
                        text_response="Оптимальный темп, нагрузка распределена равномерно",
                        submission_hash=s_hash,
                    )
                    # Вопрос 9: форматы
                    SurveyAnswer.objects.create(
                        assignment=a,
                        question=q_list[8],
                        text_response=format_choice,
                        submission_hash=s_hash,
                    )
                    # Вопрос 10: ресурсы
                    SurveyAnswer.objects.create(
                        assignment=a,
                        question=q_list[9],
                        text_response="Материалы и тесты в LMS Moodle, Авторские презентации",
                        submission_hash=s_hash,
                    )
                    # Вопрос 11: отзыв
                    SurveyAnswer.objects.create(
                        assignment=a,
                        question=q_list[10],
                        text_response=comment_pos,
                        submission_hash=s_hash,
                    )
                    # Вопрос 12: пожелания
                    SurveyAnswer.objects.create(
                        assignment=a,
                        question=q_list[11],
                        text_response="Продолжать развитие курса и практических лабораторных кейсов.",
                        submission_hash=s_hash,
                    )
                    count += 1
            return count

        ans_autumn_count = seed_answers_for_assignments(assignments_autumn, questions_autumn, sample_feedback_autumn)
        ans_spring_count = seed_answers_for_assignments(assignments_spring, questions_spring, sample_feedback_spring)
        self.stdout.write(f"Создано сессий опросов: Осень = {ans_autumn_count}, Весна = {ans_spring_count}")

        self.stdout.write(self.style.SUCCESS("Импорт реальной нагрузки и сидирование успешно завершены!"))
