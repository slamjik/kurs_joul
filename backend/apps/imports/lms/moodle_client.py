"""
Реальный Moodle LMS клиент.
Взаимодействует с Moodle через REST Web Services API (wstoken + wsfunction).
"""

from typing import Any, Dict, List, Optional
import urllib.parse
import urllib.request
import json

from .base import LMSClient, LMSGrade, LMSStudent


class MoodleLMSClient(LMSClient):
    """
    Клиент для Moodle REST API.
    Для включения необходимо:
    1. На сервере Moodle включить Web Services и создать токен доступа.
    2. В .env задать MOODLE_URL и MOODLE_TOKEN.
    """

    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.endpoint = f"{self.base_url}/webservice/rest/server.php"

    def _call(self, function: str, **params) -> Dict[str, Any]:
        """Базовый HTTP-запрос к Moodle Web Services API."""
        query_params = {
            "wstoken": self.token,
            "wsfunction": function,
            "moodlewsrestformat": "json",
            **params,
        }
        url = f"{self.endpoint}?{urllib.parse.urlencode(query_params)}"
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme.lower() not in ("http", "https"):
            raise ValueError(f"Недопустимый протокол подключения к Moodle: {parsed.scheme}")

        req = urllib.request.Request(url, headers={"User-Agent": "KafIS-Backend/1.0"})

        with urllib.request.urlopen(req, timeout=10) as response:  # nosec B310
            data = json.loads(response.read().decode("utf-8"))

        if isinstance(data, dict) and "exception" in data:
            raise RuntimeError(f"Moodle API Error: {data.get('message', data)}")

        return data

    def get_grades(self, course_id: str) -> List[LMSGrade]:
        """Получить оценки студентов по курсу через gradereport_user_get_grade_items."""
        raw = self._call("gradereport_user_get_grade_items", courseid=int(course_id))
        grades = []

        for user_report in raw.get("usergrades", []):
            student_name = str(user_report.get("userfullname", "")).strip()
            student_id = str(user_report.get("userid", ""))

            for item in user_report.get("gradeitems", []):
                raw_grade = item.get("graderaw")
                if raw_grade is None:
                    continue

                grades.append(
                    LMSGrade(
                        student_external_id=student_id,
                        student_name=student_name,
                        discipline_name=item.get("itemname") or "Дисциплина Moodle",
                        grade=float(raw_grade),
                        max_grade=float(item.get("grademax", 5.0)),
                        date=str(item.get("gradedategraded", "")),
                        source="moodle",
                    )
                )

        return grades

    def get_students(self, group_name: Optional[str] = None) -> List[LMSStudent]:
        """Получение списка студентов."""
        # Реализуется при наличии структуры когорт/групп в конкретном развертывании Moodle
        return []

    def get_courses(self) -> List[dict]:
        """Получение списка курсов через core_course_get_courses."""
        courses = self._call("core_course_get_courses")
        return [
            {"id": str(c["id"]), "name": c["fullname"], "discipline_code": c.get("shortname", "")}
            for c in courses
        ]

    def is_available(self) -> bool:
        """Проверка доступности Moodle через core_webservice_get_site_info."""
        try:
            self._call("core_webservice_get_site_info")
            return True
        except Exception:
            return False
