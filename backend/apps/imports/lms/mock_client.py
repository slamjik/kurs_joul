"""
Тестовый LMS клиент (MockLMSClient).
Генерирует реалистичные данные для разработки, демонстрации и модульного тестирования.
"""

import random
from datetime import date, timedelta
from typing import List, Optional

from .base import LMSClient, LMSGrade, LMSStudent

MOCK_STUDENTS = [
    ("s001", "Александров Иван Сергеевич", "БПИ-22-1"),
    ("s002", "Белова Екатерина Дмитриевна", "БПИ-22-1"),
    ("s003", "Волков Андрей Павлович", "БПИ-22-1"),
    ("s004", "Громова Мария Ивановна", "ЭК-22-1"),
    ("s005", "Дмитриев Алексей Николаевич", "ЭК-22-1"),
    ("s006", "Ефимова Светлана Юрьевна", "БПИ-22-1"),
]

MOCK_COURSES = [
    {"id": "c001", "name": "Философия", "discipline_code": "GIS-01"},
    {"id": "c002", "name": "Экономика предприятия", "discipline_code": "GIS-02"},
    {"id": "c003", "name": "Правоведение", "discipline_code": "GIS-03"},
]


class MockLMSClient(LMSClient):
    """
    Заглушка LMS — всегда доступна, эмулирует работу Moodle.
    """

    def get_grades(self, course_id: str) -> List[LMSGrade]:
        course = next((c for c in MOCK_COURSES if str(c["id"]) == str(course_id)), MOCK_COURSES[0])
        grades = []
        base_date = date.today() - timedelta(days=30)

        # Фиксированный seed для детерминированности при повторных тестах
        rnd = random.Random(42)

        for student_id, student_name, _ in MOCK_STUDENTS:
            # Имитация распределения оценок от 2.0 до 5.0
            grade_val = rnd.choice([2.0, 3.0, 4.0, 5.0])
            grade_date = base_date + timedelta(days=rnd.randint(1, 20))

            grades.append(
                LMSGrade(
                    student_external_id=student_id,
                    student_name=student_name,
                    discipline_name=course["name"],
                    grade=float(grade_val),
                    max_grade=5.0,
                    date=grade_date.isoformat(),
                    source="mock",
                )
            )

        return grades

    def get_students(self, group_name: Optional[str] = None) -> List[LMSStudent]:
        filtered = [
            LMSStudent(
                external_id=sid,
                full_name=name,
                email=f"{sid}@misis.ru",
                group_name=group,
            )
            for sid, name, group in MOCK_STUDENTS
            if not group_name or group == group_name
        ]
        return filtered

    def get_courses(self) -> List[dict]:
        return MOCK_COURSES

    def is_available(self) -> bool:
        return True
