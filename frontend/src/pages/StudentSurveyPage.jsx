import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  Typography,
  Radio,
  Checkbox,
  Input,
  Button,
  Select,
  message,
  Result,
  Divider,
  Tag,
  Spin,
  Progress,
} from 'antd'
import {
  GraduationCap,
  ArrowLeft,
  Send,
  BookOpen,
  UserCheck,
  Layers,
  MessageSquare,
  CheckCircle2,
  CheckSquare,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  getCascadingSurveyOptions,
  getSurveyAssignments,
  submitSurveyResponse,
} from '../api/surveys'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input

// Шкала оценивания 1-5
const SCALE_OPTIONS = [
  { value: 1, label: '1 — Совсем не согласен', shortLabel: '1 (Очень плохо)' },
  { value: 2, label: '2 — Скорее не согласен', shortLabel: '2 (Слабо)' },
  { value: 3, label: '3 — Затрудняюсь ответить', shortLabel: '3 (Средне)' },
  { value: 4, label: '4 — Скорее согласен', shortLabel: '4 (Хорошо)' },
  { value: 5, label: '5 — Полностью согласен', shortLabel: '5 (Отлично)' },
]

// 12 критериев опроса качества преподавания (соответствуют академическим стандартам филиала)
const DEFAULT_QUESTIONS = [
  // 5 критериев матрицы (шкала 1-5)
  {
    id: 1,
    category: 'clarity',
    category_display: 'Понятность и структурированность',
    text: 'Преподаватель понятно, логично и структурированно излагает учебный материал',
    question_type: 'scale_5',
    options: [],
  },
  {
    id: 2,
    category: 'relevance',
    category_display: 'Практическая ценность',
    text: 'Содержание курса практически ценно, полезно для будущей профессии и содержит актуальные примеры',
    question_type: 'scale_5',
    options: [],
  },
  {
    id: 3,
    category: 'fairness',
    category_display: 'Объективность оценивания',
    text: 'Критерии оценивания прозрачны, баллы по БРС выставляются объективно и своевременно',
    question_type: 'scale_5',
    options: [],
  },
  {
    id: 4,
    category: 'ethics',
    category_display: 'Педагогический такт',
    text: 'Преподаватель доброжелателен, пунктуален, соблюдает этику и готов помочь на консультациях',
    question_type: 'scale_5',
    options: [],
  },
  {
    id: 5,
    category: 'facilities',
    category_display: 'Материальные условия и организация',
    text: 'Условия в аудиториях комфортны, техническое и программное оснащение исправно',
    question_type: 'scale_5',
    options: [],
  },

  // 3 вопроса с одиночным выбором (single_choice)
  {
    id: 6,
    category: 'organization',
    category_display: 'Обратная связь',
    text: 'Как часто преподаватель предоставляет обратную связь по выполненным работам?',
    question_type: 'single_choice',
    options: [
      'Каждую неделю / раз в 3 занятия',
      'Примерно 1-2 раза в семестр',
      'Только перед зачетом / экзаменом',
      'Практически никогда',
    ],
  },
  {
    id: 7,
    category: 'facilities',
    category_display: 'Цифровая среда',
    text: 'В какой степени в учебном процессе используются цифровые сервисы и материалы кафедры?',
    question_type: 'single_choice',
    options: [
      'Постоянно (LMS Moodle, электронный конспект, базы данных)',
      'Преимущественно на практических работах',
      'Редко, только при необходимости',
      'Не используются',
    ],
  },
  {
    id: 8,
    category: 'clarity',
    category_display: 'Темп обучения',
    text: 'Оцените темп и интенсивность подачи материала преподавателем:',
    question_type: 'single_choice',
    options: [
      'Оптимальный, успеваю усваивать',
      'Слишком быстрый, трудно успевать',
      'Слишком медленный, можно интенсивнее',
      'Неравномерный, в конце семестра перегрузка',
    ],
  },

  // 2 вопроса с множественным выбором (multiple_choice)
  {
    id: 9,
    category: 'relevance',
    category_display: 'Полезные форматы',
    text: 'Какие форматы и методики на занятиях преподавателя были наиболее полезными?',
    question_type: 'multiple_choice',
    options: [
      'Разбор реальных отраслевых кейсов',
      'Практикумы на компьютерах и тренажерах',
      'Дискуссии и разбор типичных ошибок',
      'Индивидуальные консультации',
      'Традиционные лекции под запись',
    ],
  },
  {
    id: 10,
    category: 'organization',
    category_display: 'Учебные материалы',
    text: 'Какими учебными материалами преподавателя вы пользовались чаще всего?',
    question_type: 'multiple_choice',
    options: [
      'Электронный курс в LMS Moodle',
      'Слайды презентаций с лекций',
      'Рекомендованная научная и профильная литература',
      'Методические указания к лабораторным',
      'Конспекты одногруппников',
    ],
  },

  // 2 открытых текстовых вопроса (text)
  {
    id: 11,
    category: 'clarity',
    category_display: 'Сильные стороны курса',
    text: 'Что вам больше всего понравилось в методике преподавания данного курса?',
    question_type: 'text',
    options: [],
  },
  {
    id: 12,
    category: 'general',
    category_display: 'Рекомендации по улучшению',
    text: 'Ваши конструктивные предложения по совершенствованию дисциплины и работы преподавателя:',
    question_type: 'text',
    options: [],
  },
]

export function StudentSurveyPage() {
  const navigate = useNavigate()

  // Состояние загрузки данных
  const [isLoading, setIsLoading] = useState(true)
  const [cascadingData, setCascadingData] = useState({ groups: [], items: [] })
  const [assignments, setAssignments] = useState([])

  // Состояние 3-шагового каскадного выбора
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [selectedDisciplineId, setSelectedDisciplineId] = useState(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState(null)
  const [activeAssignment, setActiveAssignment] = useState(null)

  // Ответы студента: { [qId]: { question_id, score, text_response } }
  const [answers, setAnswers] = useState({})
  const [lessonFormat, setLessonFormat] = useState('offline') // Формат занятий
  const [openComment, setOpenComment] = useState('') // Текстовый отзыв

  // Состояние отправки
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submissionHash, setSubmissionHash] = useState('')

  // Загрузка списков с бэкенда
  useEffect(() => {
    async function loadSurveyData() {
      try {
        const [cascRes, assignRes] = await Promise.all([
          getCascadingSurveyOptions(),
          getSurveyAssignments({ is_open: true }),
        ])

        const casc = cascRes || { groups: [], items: [] }
        const assignList = Array.isArray(assignRes)
          ? assignRes
          : assignRes?.results || []

        setCascadingData(casc)
        setAssignments(assignList)

        // Инициализация по умолчанию на 4-й курс (БПИ-23 или первая группа)
        if (casc.groups && casc.groups.length > 0) {
          const defaultGroup =
            casc.groups.find((g) => g.name === 'БПИ-23') || casc.groups[0]
          setSelectedGroupId(defaultGroup.id)

          // Находим первую доступную дисциплину для этой группы
          const matchingItems = casc.items.filter(
            (i) => i.group_id === defaultGroup.id
          )
          if (matchingItems.length > 0) {
            const firstItem = matchingItems[0]
            setSelectedDisciplineId(firstItem.discipline_id)
            setSelectedTeacherId(firstItem.teacher_id)

            // Находим назначение (assignment)
            const foundAssign = assignList.find(
              (a) => a.id === firstItem.assignment_id
            )
            setActiveAssignment(foundAssign || null)
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки данных опроса:', err)
        message.error('Не удалось загрузить параметры анкеты')
      } finally {
        setIsLoading(false)
      }
    }

    loadSurveyData()
  }, [])

  // Опции для шага 1: Группы
  const groupOptions = useMemo(() => {
    return (cascadingData.groups || []).map((g) => ({
      value: g.id,
      label: (
        <span>
          <strong>{g.name}</strong>{' '}
          <span style={{ color: '#64748b', fontSize: 12 }}>
            ({g.course} курс &bull; {g.direction || 'Бакалавриат'})
          </span>
        </span>
      ),
    }))
  }, [cascadingData.groups])

  // Опции для шага 2: Дисциплины (отфильтрованные по группе)
  const disciplineOptions = useMemo(() => {
    if (!selectedGroupId) return []
    const itemsForGroup = (cascadingData.items || []).filter(
      (i) => i.group_id === selectedGroupId
    )
    const uniqueDiscs = []
    const seen = new Set()
    for (const item of itemsForGroup) {
      if (!seen.has(item.discipline_id)) {
        seen.add(item.discipline_id)
        uniqueDiscs.push({
          value: item.discipline_id,
          label: item.discipline_name,
        })
      }
    }
    return uniqueDiscs
  }, [cascadingData.items, selectedGroupId])

  // Опции для шага 3: Преподаватели (отфильтрованные по группе и дисциплине)
  const teacherOptions = useMemo(() => {
    if (!selectedGroupId || !selectedDisciplineId) return []
    const itemsForDisc = (cascadingData.items || []).filter(
      (i) =>
        i.group_id === selectedGroupId &&
        i.discipline_id === selectedDisciplineId
    )
    return itemsForDisc.map((item) => ({
      value: item.teacher_id,
      label: (
        <span>
          <strong>{item.teacher_name}</strong>{' '}
          <span style={{ color: '#64748b', fontSize: 12 }}>
            ({item.teacher_position || 'Преподаватель'})
          </span>
        </span>
      ),
      assignmentId: item.assignment_id,
    }))
  }, [cascadingData.items, selectedGroupId, selectedDisciplineId])

  // Обработчики каскадного переключения
  const handleGroupChange = (grpId) => {
    setSelectedGroupId(grpId)
    setAnswers({})
    const itemsForGroup = (cascadingData.items || []).filter(
      (i) => i.group_id === grpId
    )
    if (itemsForGroup.length > 0) {
      const nextItem = itemsForGroup[0]
      setSelectedDisciplineId(nextItem.discipline_id)
      setSelectedTeacherId(nextItem.teacher_id)
      const found = assignments.find((a) => a.id === nextItem.assignment_id)
      setActiveAssignment(found || null)
    } else {
      setSelectedDisciplineId(null)
      setSelectedTeacherId(null)
      setActiveAssignment(null)
    }
  }

  const handleDisciplineChange = (discId) => {
    setSelectedDisciplineId(discId)
    setAnswers({})
    const itemsForDisc = (cascadingData.items || []).filter(
      (i) => i.group_id === selectedGroupId && i.discipline_id === discId
    )
    if (itemsForDisc.length > 0) {
      const nextItem = itemsForDisc[0]
      setSelectedTeacherId(nextItem.teacher_id)
      const found = assignments.find((a) => a.id === nextItem.assignment_id)
      setActiveAssignment(found || null)
    } else {
      setSelectedTeacherId(null)
      setActiveAssignment(null)
    }
  }

  const handleTeacherChange = (tchId) => {
    setSelectedTeacherId(tchId)
    setAnswers({})
    const item = (cascadingData.items || []).find(
      (i) =>
        i.group_id === selectedGroupId &&
        i.discipline_id === selectedDisciplineId &&
        i.teacher_id === tchId
    )
    if (item) {
      const found = assignments.find((a) => a.id === item.assignment_id)
      setActiveAssignment(found || null)
    }
  }

  // Вопросы анкеты: берем из назначения (activeAssignment.questions) или шаблона,
  // а при их отсутствии — гарантированные критерии по умолчанию
  const rawQuestions = useMemo(() => {
    if (activeAssignment?.questions && activeAssignment.questions.length > 0) {
      return activeAssignment.questions
    }
    if (activeAssignment?.template?.questions && activeAssignment.template.questions.length > 0) {
      return activeAssignment.template.questions
    }
    return DEFAULT_QUESTIONS
  }, [activeAssignment])

  // Разделение на матричные критерии (1-5), одиночный выбор, множественный выбор и текстовые отзывы
  const matrixQuestions = useMemo(() => {
    const list = rawQuestions.filter(
      (q) => q.question_type === 'scale_5' || q.question_type === 'score_5'
    )
    return list.length > 0 ? list : DEFAULT_QUESTIONS.slice(0, 5)
  }, [rawQuestions])

  const singleChoiceQuestions = useMemo(() => {
    const list = rawQuestions.filter((q) => q.question_type === 'single_choice')
    return list.length > 0 ? list : DEFAULT_QUESTIONS.slice(5, 8)
  }, [rawQuestions])

  const multipleChoiceQuestions = useMemo(() => {
    const list = rawQuestions.filter((q) => q.question_type === 'multiple_choice')
    return list.length > 0 ? list : DEFAULT_QUESTIONS.slice(8, 10)
  }, [rawQuestions])

  const textQuestions = useMemo(() => {
    const list = rawQuestions.filter((q) => q.question_type === 'text')
    return list.length > 0 ? list : DEFAULT_QUESTIONS.slice(10, 12)
  }, [rawQuestions])

  // Установка оценки в матрице
  const handleMatrixScore = (questionId, scoreValue) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        score: scoreValue,
        text_response: '',
      },
    }))
  }

  // Одиночный выбор
  const handleSingleChoice = (questionId, selectedVal) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        score: null,
        text_response: selectedVal,
      },
    }))
  }

  // Множественный выбор
  const handleMultipleChoice = (questionId, selectedArr) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        score: null,
        selected_options: selectedArr,
        text_response: selectedArr.join(', '),
      },
    }))
  }

  // Свободный текстовый ввод
  const handleTextAnswer = (questionId, textVal) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        score: null,
        text_response: textVal,
      },
    }))
  }

  // Расчет прогресса заполнения
  const totalMatrixCount = matrixQuestions.length
  const answeredMatrixCount = matrixQuestions.filter(
    (q) => answers[q.id]?.score
  ).length

  const answeredSingleCount = singleChoiceQuestions.filter(
    (q) => answers[q.id]?.text_response
  ).length

  const answeredMultipleCount = multipleChoiceQuestions.filter(
    (q) => (answers[q.id]?.selected_options || []).length > 0
  ).length

  const answeredTextCount = textQuestions.filter(
    (q) => answers[q.id]?.text_response?.trim()
  ).length

  const totalQuestionsCount =
    matrixQuestions.length +
    singleChoiceQuestions.length +
    multipleChoiceQuestions.length +
    textQuestions.length

  const totalAnswered =
    answeredMatrixCount +
    answeredSingleCount +
    answeredMultipleCount +
    answeredTextCount

  const progressPercent =
    totalQuestionsCount > 0
      ? Math.round((totalAnswered / totalQuestionsCount) * 100)
      : 0

  // Отправка анкеты
  const handleSubmit = async () => {
    if (!activeAssignment) {
      message.warning('Пожалуйста, выберите дисциплину и преподавателя')
      return
    }

    if (answeredMatrixCount < totalMatrixCount) {
      message.warning(
        `Пожалуйста, оцените все ${totalMatrixCount} критериев в матрице (заполнено: ${answeredMatrixCount} из ${totalMatrixCount})`
      )
      return
    }

    setIsSubmitting(true)
    try {
      const payloadAnswers = []

      // 1. Ответы по матрице критериев
      for (const q of matrixQuestions) {
        if (answers[q.id]?.score) {
          payloadAnswers.push({
            question_id: q.id,
            score: answers[q.id].score,
            text_response: '',
          })
        }
      }

      // 2. Вопросы с одиночным выбором
      for (const q of singleChoiceQuestions) {
        if (answers[q.id]?.text_response) {
          payloadAnswers.push({
            question_id: q.id,
            score: null,
            text_response: answers[q.id].text_response,
          })
        }
      }

      // 3. Вопросы с множественным выбором
      for (const q of multipleChoiceQuestions) {
        const opts = answers[q.id]?.selected_options || []
        if (opts.length > 0) {
          payloadAnswers.push({
            question_id: q.id,
            score: null,
            text_response: opts.join(', '),
          })
        }
      }

      // 4. Текстовые развернутые отзывы
      for (const q of textQuestions) {
        const txt = answers[q.id]?.text_response?.trim()
        if (txt) {
          payloadAnswers.push({
            question_id: q.id,
            score: null,
            text_response: txt,
          })
        }
      }

      const res = await submitSurveyResponse({
        assignment_id: activeAssignment.id,
        answers: payloadAnswers,
      })

      const hash = res.submission_hash || res.session_token || 'SHA256-ANONYMOUS'
      setSubmissionHash(hash)
      setIsSubmitted(true)
      message.success('Анкета успешно сохранена!')
    } catch (err) {
      console.error('Ошибка отправки:', err)
      message.error(
        err.response?.data?.detail ||
          'Произошла ошибка при отправке анкеты. Попробуйте еще раз.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <Spin size="large" />
        <div style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>
          Загрузка анкеты...
        </div>
      </div>
    )
  }

  // Экран успешной отправки
  if (isSubmitted) {
    return (
      <div style={{ maxWidth: 680, margin: '60px auto', padding: '0 20px' }}>
        <Card
          style={{
            borderRadius: 16,
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0',
          }}
        >
          <Result
            status="success"
            title="Спасибо за участие в опросе!"
            subTitle={
              <div>
                <p style={{ margin: '8px 0', fontSize: 15, color: '#334155' }}>
                  Ваш отзыв успешно сохранен в системе мониторинга кафедры{' '}
                  <strong>«{activeAssignment?.department_name || 'ГиСЭН'}»</strong>.
                </p>
                {submissionHash && (
                  <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
                    Идентификатор сессии: <code>{submissionHash.slice(0, 16)}...</code>
                  </div>
                )}
              </div>
            }
            extra={[
              <Button
                type="primary"
                key="next"
                size="large"
                onClick={() => {
                  setAnswers({})
                  setOpenComment('')
                  setIsSubmitted(false)
                }}
                style={{ backgroundColor: '#1a56db', borderColor: '#1a56db' }}
              >
                Оценить другую дисциплину
              </Button>,
              <Button
                key="dashboard"
                size="large"
                onClick={() => navigate('/dashboard')}
              >
                Вернуться на главную
              </Button>,
            ]}
          />
        </Card>
      </div>
    )
  }

  const selectedItemInfo = (cascadingData.items || []).find(
    (i) =>
      i.group_id === selectedGroupId &&
      i.discipline_id === selectedDisciplineId &&
      i.teacher_id === selectedTeacherId
  )

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '20px auto 60px auto',
        padding: '0 20px',
        minHeight: '100vh',
      }}
    >
      {/* Верхняя панель */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          Вернуться
        </Button>
      </div>

      {/* Заглавная карточка опроса */}
      <Card
        style={{
          borderRadius: 16,
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          marginBottom: 24,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1a56db',
              flexShrink: 0,
            }}
          >
            <GraduationCap size={26} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
              Анонимный опрос
            </Title>
            <Paragraph style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: 13 }}>
              Новотроицкий филиал НИТУ МИСИС &bull; Кафедра ГиСЭН
            </Paragraph>
          </div>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* Шаг 1-2-3: Каскадный выбор */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Layers size={18} color="#1a56db" />
            <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
              Параметры оценивания:
            </Text>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 16,
            }}
          >
            {/* Шаг 1: Группа */}
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Шаг 1. Ваша учебная группа:
              </Text>
              <Select
                style={{ width: '100%' }}
                size="large"
                placeholder="Выберите группу"
                value={selectedGroupId}
                onChange={handleGroupChange}
                options={groupOptions}
              />
            </div>

            {/* Шаг 2: Дисциплина */}
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Шаг 2. Изучаемая дисциплина:
              </Text>
              <Select
                style={{ width: '100%' }}
                size="large"
                placeholder="Выберите дисциплину"
                value={selectedDisciplineId}
                onChange={handleDisciplineChange}
                disabled={!selectedGroupId || disciplineOptions.length === 0}
                options={disciplineOptions}
              />
            </div>

            {/* Шаг 3: Преподаватель */}
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Шаг 3. Оцениваемый преподаватель:
              </Text>
              <Select
                style={{ width: '100%' }}
                size="large"
                placeholder="Выберите преподавателя"
                value={selectedTeacherId}
                onChange={handleTeacherChange}
                disabled={!selectedDisciplineId || teacherOptions.length === 0}
                options={teacherOptions}
              />
            </div>
          </div>
        </div>

        {/* Информационная карточка выбранного назначения */}
        {selectedItemInfo && (
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                  {selectedItemInfo.teacher_name}
                </Text>
                <Tag color="blue">{selectedItemInfo.teacher_position || 'Преподаватель'}</Tag>
              </div>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                Дисциплина: <strong>{selectedItemInfo.discipline_name}</strong> &bull; Группа:{' '}
                <strong>{selectedItemInfo.group_name}</strong> &bull; Кафедра: <strong>{selectedItemInfo.department_name}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Прогресс заполнения</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Progress
                  percent={progressPercent}
                  size="small"
                  style={{ width: 110 }}
                  strokeColor={progressPercent === 100 ? '#15803d' : '#1a56db'}
                />
                <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
                  {totalAnswered} / {totalQuestionsCount}
                </Text>
              </div>
            </div>
          </div>
        )}

        {/* ТАБЛИЦА МАТРИЧНОГО ОЦЕНИВАНИЯ (MATRIX TABLE) */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={18} color="#1a56db" />
              <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
                Таблица критериев качества преподавания
              </Title>
            </div>
            <Paragraph style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
              Оцените степень вашего согласия по каждому утверждению по 5-балльной шкале
              (от «1 — Очень плохо» до «5 — Отлично»).
            </Paragraph>
          </div>

          {/* Десктоп-матрица (Desktop-first) с адаптивным скроллом */}
          <div
            style={{
              overflowX: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              backgroundColor: '#ffffff',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 680,
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#334155',
                      width: '45%',
                    }}
                  >
                    Критерий оценки
                  </th>
                  {SCALE_OPTIONS.map((scale) => (
                    <th
                      key={scale.value}
                      style={{
                        padding: '12px 8px',
                        textAlign: 'center',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#334155',
                        width: '11%',
                      }}
                    >
                      <div>{scale.value}</div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 400, marginTop: 2 }}>
                        {scale.value === 1 ? 'Очень плохо' : scale.value === 5 ? 'Отлично' : `${scale.value} б.`}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixQuestions.map((q, idx) => {
                  const currentVal = answers[q.id]?.score
                  const isAnswered = !!currentVal

                  return (
                    <tr
                      key={q.id}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: isAnswered ? '#fcfdfd' : '#ffffff',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              backgroundColor: isAnswered ? '#dcfce7' : '#f1f5f9',
                              color: isAnswered ? '#15803d' : '#64748b',
                              fontSize: 12,
                              fontWeight: 600,
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>
                              {q.text}
                            </div>
                            {q.category_display && (
                              <Tag color="cyan" style={{ fontSize: 11, marginTop: 4 }}>
                                {q.category_display}
                              </Tag>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Радиокнопки 1-5 на пересечениях колонок матрицы */}
                      {SCALE_OPTIONS.map((scale) => {
                        const isChecked = currentVal === scale.value

                        return (
                          <td
                            key={scale.value}
                            style={{
                              padding: '12px 8px',
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              backgroundColor: isChecked ? '#eff6ff' : 'transparent',
                              cursor: 'pointer',
                            }}
                            onClick={() => handleMatrixScore(q.id, scale.value)}
                          >
                            <Radio
                              checked={isChecked}
                              onChange={() => handleMatrixScore(q.id, scale.value)}
                              style={{ margin: 0 }}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* РАЗДЕЛ 2: ВОПРОСЫ С ОДИНОЧНЫМ ВЫБОРОМ (КРУЖОЧКИ) */}
        {singleChoiceQuestions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} color="#1a56db" />
                <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
                  Организация и процесс обучения (Один вариант ответа)
                </Title>
              </div>
              <Paragraph style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
                Выберите один наиболее подходящий вариант ответа для каждого вопроса:
              </Paragraph>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {singleChoiceQuestions.map((q, idx) => {
                const currentAnswer = answers[q.id]?.text_response || ''
                return (
                  <div
                    key={q.id}
                    style={{
                      padding: '16px 20px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: currentAnswer ? '#dcfce7' : '#e0edff',
                          color: currentAnswer ? '#15803d' : '#1a56db',
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {matrixQuestions.length + idx + 1}
                      </span>
                      <div>
                        <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
                          {q.text}
                        </Text>
                        {q.category_display && (
                          <Tag color="blue" style={{ fontSize: 11, marginLeft: 8 }}>
                            {q.category_display}
                          </Tag>
                        )}
                      </div>
                    </div>

                    <Radio.Group
                      value={currentAnswer}
                      onChange={(e) => handleSingleChoice(q.id, e.target.value)}
                      style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 34 }}
                    >
                      {(q.options || []).map((opt, optIdx) => (
                        <Radio key={optIdx} value={opt} style={{ fontSize: 13, color: '#334155' }}>
                          {opt}
                        </Radio>
                      ))}
                    </Radio.Group>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* РАЗДЕЛ 3: ВОПРОСЫ С МНОЖЕСТВЕННЫМ ВЫБОРОМ (ЧЕКБОКСЫ) */}
        {multipleChoiceQuestions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckSquare size={18} color="#1a56db" />
                <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
                  Форматы и материалы (Несколько вариантов ответа)
                </Title>
              </div>
              <Paragraph style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
                Отметьте все подходящие варианты, которые были полезны в процессе обучения:
              </Paragraph>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {multipleChoiceQuestions.map((q, idx) => {
                const selectedList = answers[q.id]?.selected_options || []
                return (
                  <div
                    key={q.id}
                    style={{
                      padding: '16px 20px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: selectedList.length > 0 ? '#dcfce7' : '#e0edff',
                          color: selectedList.length > 0 ? '#15803d' : '#1a56db',
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {matrixQuestions.length + singleChoiceQuestions.length + idx + 1}
                      </span>
                      <div>
                        <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
                          {q.text}
                        </Text>
                        {q.category_display && (
                          <Tag color="cyan" style={{ fontSize: 11, marginLeft: 8 }}>
                            {q.category_display}
                          </Tag>
                        )}
                        <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>
                          (выберите 1 или более вариантов)
                        </span>
                      </div>
                    </div>

                    <Checkbox.Group
                      value={selectedList}
                      onChange={(vals) => handleMultipleChoice(q.id, vals)}
                      style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 34 }}
                    >
                      {(q.options || []).map((opt, optIdx) => (
                        <Checkbox key={optIdx} value={opt} style={{ fontSize: 13, color: '#334155' }}>
                          {opt}
                        </Checkbox>
                      ))}
                    </Checkbox.Group>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* РАЗДЕЛ 4: РАЗВЕРНУТЫЕ ТЕКСТОВЫЕ ОТЗЫВЫ И РЕКОМЕНДАЦИИ */}
        {textQuestions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} color="#1a56db" />
                <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
                  Развернутые отзывы и пожелания преподавателю
                </Title>
              </div>
              <Paragraph style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
                Поделитесь своим мнением, чтобы помочь преподавателю и кафедре повысить качество занятий:
              </Paragraph>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {textQuestions.map((q, idx) => {
                const txt = answers[q.id]?.text_response || ''
                return (
                  <div
                    key={q.id}
                    style={{
                      padding: '16px 20px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: txt.trim() ? '#dcfce7' : '#f1f5f9',
                          color: txt.trim() ? '#15803d' : '#64748b',
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {matrixQuestions.length + singleChoiceQuestions.length + multipleChoiceQuestions.length + idx + 1}
                      </span>
                      <div>
                        <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
                          {q.text}
                        </Text>
                        {q.category_display && (
                          <Tag color="purple" style={{ fontSize: 11, marginLeft: 8 }}>
                            {q.category_display}
                          </Tag>
                        )}
                      </div>
                    </div>

                    <TextArea
                      rows={3}
                      placeholder="Напишите развернутый комментарий..."
                      value={txt}
                      onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                      maxLength={1000}
                      showCount
                      style={{ marginLeft: 34, width: 'calc(100% - 34px)' }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Панель отправки */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 12,
            paddingTop: 16,
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <Button size="large" onClick={() => navigate(-1)}>
            Отмена
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<Send size={16} />}
            loading={isSubmitting}
            onClick={handleSubmit}
            disabled={answeredMatrixCount < totalMatrixCount}
            style={{
              backgroundColor:
                answeredMatrixCount === totalMatrixCount ? '#1a56db' : '#94a3b8',
              borderColor:
                answeredMatrixCount === totalMatrixCount ? '#1a56db' : '#94a3b8',
              fontWeight: 600,
              padding: '0 28px',
            }}
          >
            Отправить анкету ({totalAnswered} / {totalQuestionsCount})
          </Button>
        </div>
      </Card>
    </div>
  )
}
