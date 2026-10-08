import client from './client'

/**
 * Получение списка активных шаблонов опросов
 */
export async function getSurveyTemplates() {
  const response = await client.get('/surveys/templates/')
  return response.data
}

/**
 * Получение назначений анкет для прохождения опроса
 * @param {Object} params - { group, teacher, department, is_open }
 */
export async function getSurveyAssignments(params = {}) {
  const response = await client.get('/surveys/assignments/', { params })
  return response.data
}

/**
 * Получение каскадной структуры выбора для студенческой анкеты:
 * Группа -> Дисциплина -> Преподаватель
 */
export async function getCascadingSurveyOptions() {
  const response = await client.get('/surveys/assignments/cascading-options/')
  return response.data
}


/**
 * Анонимная отправка результатов анкетирования студентом
 * @param {Object} data - { assignment_id, answers: [{ question_id, score, text_response }] }
 */
export async function submitSurveyResponse(data) {
  const response = await client.post('/surveys/submit/', data)
  return response.data
}

/**
 * Получение сводного показателя качества по филиалу и кафедрам
 * @param {Object} params - { semester }
 */
export async function getBranchKpi(params = {}) {
  const response = await client.get('/surveys/analytics/branch-kpi/', { params })
  return response.data
}

/**
 * Получение списка преподавателей выбранной кафедры с рейтингами удовлетворенности
 * @param {Object} params - { department, semester }
 */
export async function getDepartmentTeachersQuality(params = {}) {
  const response = await client.get('/surveys/analytics/department-teachers/', { params })
  return response.data
}

/**
 * Получение данных лепестковой диаграммы (RadarChart) и анонимных отзывов
 * @param {Object} params - { teacher, semester }
 */
export async function getTeacherRadarAnalytics(params = {}) {
  const response = await client.get('/surveys/analytics/teacher-radar/', { params })
  return response.data
}

/**
 * Получение списка рекомендаций преподавателям
 * @param {Object} params - { teacher, semester, status }
 */
export async function getTeacherRecommendations(params = {}) {
  const response = await client.get('/surveys/recommendations/', { params })
  return response.data
}

/**
 * Создание рекомендации заведующим кафедрой
 * @param {Object} data - { teacher, discipline, semester, category, recommendation_text, status }
 */
export async function createTeacherRecommendation(data) {
  const response = await client.post('/surveys/recommendations/', data)
  return response.data
}

/**
 * Обновление статуса рекомендации (напр. принята к сведению)
 * @param {number} id
 * @param {Object} data
 */
export async function updateTeacherRecommendation(id, data) {
  const response = await client.patch(`/surveys/recommendations/${id}/`, data)
  return response.data
}
