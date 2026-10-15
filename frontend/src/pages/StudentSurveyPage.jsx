import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  Typography,
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
  Alert,
} from 'antd'
import {
  GraduationCap,
  ArrowLeft,
  Send,
  BookOpen,
  UserCheck,
  Layers,
  Calendar,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Heart,
  HelpCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  getCascadingSurveyOptions,
  getSurveyAssignments,
  submitSurveyResponse,
} from '../api/surveys'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input

// 5 официальных стандартов качества кафедры (Блоки 1–5)
export const QUALITY_BLOCKS = [
  {
    id: 1,
    order: 1,
    title: 'Блок 1. Организационно-методическое обеспечение дисциплины',
    shortTitle: 'Организационно-методическое обеспечение',
    category: 'relevance',
    icon: Layers,
    standard:
      'На первом занятии преподаватель должен полностью ознакомить с организацией изучения дисциплины: чётко озвучить форму промежуточной аттестации (зачёт или экзамен) и правила её прохождения, предоставить список вопросов к экзамену, ссылку на курс в Moodle, количество мероприятий текущего контроля и сроки, а также требования к оформлению и дедлайны по курсовым и контрольным работам.',
    options: [
      { key: 'fully', label: '🟢 Сделано полностью', score: 5, color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
      { key: 'partially', label: '🟡 Сделано частично', score: 3, color: '#ca8a04', bg: '#fef9c3', border: '#fde047' },
      { key: 'not', label: '🔴 Не сделано вообще', score: 1, color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
    ],
    defectsTitle: 'Отметьте галочками то, чего НЕ ХВАТИЛО на первом занятии:',
    defects: [
      'Преподаватель не озвучил форму промежуточной аттестации (будет зачёт или экзамен).',
      'Не озвучил правила получения зачёта и/или форму проведения экзамена (критерии оценки).',
      'Не предоставил список вопросов к экзамену.',
      'Не предоставил доступ / ссылку на электронный курс в системе Moodle.',
      'Не озвучил количество мероприятий текущего контроля и их сроки.',
      'Не выдал своевременно задания на контрольную или курсовую работу.',
      'Не ознакомил с требованиями к выполнению и оформлению контрольной или курсовой работы.',
      'Не обозначил чёткие сроки, в которые должна быть сдана контрольная или курсовая работа.',
    ],
  },
  {
    id: 2,
    order: 2,
    title: 'Блок 2. Качество проведения занятий и подача материала',
    shortTitle: 'Качество проведения занятий',
    category: 'clarity',
    icon: BookOpen,
    standard:
      'Преподаватель проводит занятия профессионально, увлечённо и доступным языком. На лекциях материал структурирован, без монотонного зачитывания с листа, с наглядными практическими примерами. На практиках (лабораторных) подробно объясняется алгоритм решения, оказывается помощь при трудностях. На любых парах преподаватель готов отвечать на вопросы и связывает теорию с профессией.',
    options: [
      { key: 'fully', label: '🟢 Полностью соответствует', score: 5, color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
      { key: 'partially', label: '🟡 Соответствует частично', score: 3, color: '#ca8a04', bg: '#fef9c3', border: '#fde047' },
      { key: 'not', label: '🔴 Не соответствует вообще', score: 1, color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
    ],
    defectsTitle: 'Отметьте галочками то, чего НЕ ХВАТИЛО на занятиях в течение семестра:',
    subgroups: [
      {
        title: 'Проблемы на ЛЕКЦИЯХ:',
        items: [
          'Материал излагается слишком сложно, трудно воспринимать на слух.',
          'Преподаватель монотонно читает лекцию с листа или слайдов, не удерживая внимание.',
          'Теоретический материал устарел или не содержит живых примеров из практики.',
          'Преподаватель неохотно или неполно отвечает на вопросы по теме лекции.',
        ],
      },
      {
        title: 'Проблемы на ПРАКТИКАХ / ЛАБОРАТОРНЫХ:',
        items: [
          'Перед началом работы не объясняется алгоритм и логика выполнения практического задания.',
          'При возникновении трудностей или ошибок сложно дождаться помощи или консультации преподавателя.',
          'Задания на практиках слишком оторваны от лекций (непонятно, как делать на основе теории).',
          'Время занятия используется неэффективно (преподаватель часто отвлекается на посторонние дела).',
        ],
      },
    ],
  },
  {
    id: 3,
    order: 3,
    title: 'Блок 3. Выполнение учебного плана и дисциплина проведения занятий',
    shortTitle: 'Выполнение плана и дисциплина',
    category: 'fairness',
    icon: Calendar,
    standard:
      'Все занятия проводятся строго по расписанию и в полном объёме согласно учебному плану. Ни одна пара не отменяется без уважительной причины. Пропущенные часы официально переносятся и отрабатываются. Преподаватель не опаздывает, не отпускает студентов раньше времени, проводит консультации по КР/НИР и обязательную консультацию перед экзаменом.',
    options: [
      { key: 'fully', label: '🟢 Полностью соответствует', score: 5, color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
      { key: 'partially', label: '🟡 Соответствует частично', score: 3, color: '#ca8a04', bg: '#fef9c3', border: '#fde047' },
      { key: 'not', label: '🔴 Не соответствует вообще', score: 1, color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
    ],
    defectsTitle: 'Отметьте галочками то, с чем вы столкнулись в семестре:',
    defects: [
      'Преподаватель регулярно опаздывал на занятия (на 10–15 минут и более).',
      'Преподаватель часто отпускал группу с занятий значительно раньше положенного времени.',
      'Преподаватель оставлял студентов одних во время занятия на длительное время.',
      'Пары периодически отменялись, переносились или отрабатывались в другие дни.',
      'Часть занятий была перенесена в дистанционный формат без предварительного согласования.',
      'Преподаватель мог не явиться на пару, не предупредив старосту или группу заранее.',
      'Преподаватель не проводил (или постоянно переносил) консультации по курсовым работам / НИР.',
      'Преподаватель не провёл (или провёл формально) обязательную консультацию перед экзаменом.',
    ],
  },
  {
    id: 4,
    order: 4,
    title: 'Блок 4. Формирование атмосферы вовлечённости в изучение дисциплины',
    shortTitle: 'Атмосфера вовлечённости',
    category: 'ethics',
    icon: UserCheck,
    standard:
      'Преподаватель искренне увлечён дисциплиной и заряжает интересом аудиторию. На занятиях создана комфортная, безопасная для дискуссий атмосфера, где поощряется аргументированное выражение своего мнения. Соблюдаются нормы взаимного уважения, культура речи, деловой этикет и опрятный внешний вид преподавателя.',
    options: [
      { key: 'fully', label: '🟢 Полностью соответствует', score: 5, color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
      { key: 'partially', label: '🟡 Соответствует частично', score: 3, color: '#ca8a04', bg: '#fef9c3', border: '#fde047' },
      { key: 'not', label: '🔴 Не соответствует вообще', score: 1, color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
    ],
    defectsTitle: 'Отметьте галочками то, чего НЕ ХВАТИЛО для создания идеальной атмосферы:',
    defects: [
      'Преподаватель ведёт занятия безразлично, не демонстрируя интереса к собственному предмету.',
      'Стиль речи монотонный, сухой или излишне академичный (занятия усыпляют).',
      'На занятиях присутствует психологическое напряжение, студенты боятся задавать вопросы или ошибаться.',
      'Преподаватель болезненно воспринимает альтернативное мнение или конструктивную критику.',
      'Нарушаются принципы делового общения (высокомерие, резкие или некорректные замечания).',
      'Преподаватель нарушает личные границы студентов (переходит на личности, посторонние темы).',
      'Внешний вид или манера поведения преподавателя выглядят неопрятно / не соответствуют статусу.',
      'Преподаватель проявляет предвзятость (деление студентов на «любимчиков» и «неугодных»).',
      'Преподаватель позволяет себе едкие замечания, сарказм или высмеивание ошибок студентов.',
      'Преподаватель практикует публичное обсуждение неудач или личных качеств студентов.',
    ],
  },
  {
    id: 5,
    order: 5,
    title: 'Блок 5. Наполнение и использование электронного курса в Moodle',
    shortTitle: 'Электронный курс в Moodle',
    category: 'facilities',
    icon: Sparkles,
    standard:
      'Электронный курс в Moodle является полноценным цифровым сопровождением дисциплины: чётко структурирован, содержит актуальные лекции, задания, тесты, литературу, вопросы к экзамену и критерии оценивания. Преподаватель регулярно работает с платформой, проверяет онлайн-работы и даёт своевременную обратную связь.',
    options: [
      { key: 'fully', label: '🟢 Полностью соответствует', score: 5, color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
      { key: 'partially', label: '🟡 Соответствует частично', score: 3, color: '#ca8a04', bg: '#fef9c3', border: '#fde047' },
      { key: 'not', label: '🔴 Не соответствует вообще', score: 1, color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
    ],
    defectsTitle: 'Отметьте галочками то, с чем вы столкнулись в семестре:',
    defects: [
      'Курс в Moodle существует формально: преподаватель ни разу не обратился к нему за весь семестр.',
      'В курсе отсутствует необходимый контент (нет текстов лекций, практических заданий, тестов или литературы).',
      'Материалы в курсе устарели и не соответствуют тому, что преподаватель даёт на занятиях.',
      'Структура курса хаотична: материалы свалены в кучу, сложно понять, где лекции, а где задания.',
      'Интерфейс курса неудобен для изучения (битые ссылки, нечитаемые форматы, отсутствие логики разделов).',
      'В курсе отсутствуют обязательные организационные элементы (вопросы к экзамену, критерии оценивания работ).',
      'Обратная связь через Moodle не работает (задания загружаются, но оценки и комментарии преподавателя не появляются).',
    ],
  },
]

export function StudentSurveyPage() {
  const navigate = useNavigate()

  // Состояние загрузки данных
  const [isLoading, setIsLoading] = useState(true)
  const [cascadingData, setCascadingData] = useState({ groups: [], items: [] })
  const [assignments, setAssignments] = useState([])

  // Семестр -> Группа -> Дисциплина -> Преподаватель
  const [selectedSemester, setSelectedSemester] = useState('autumn') // 'autumn' | 'spring'
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [selectedDisciplineId, setSelectedDisciplineId] = useState(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState(null)
  const [activeAssignment, setActiveAssignment] = useState(null)

  // Выбранные оценки по 5 блокам: { [blockId]: 'fully' | 'partially' | 'not' }
  const [blockChoices, setBlockChoices] = useState({})

  // Выбранные дефекты по каждому блоку: { [blockId]: string[] }
  const [blockDefects, setBlockDefects] = useState({})

  // Финальные текстовые отзывы
  const [criticismComment, setCriticismComment] = useState('')
  const [gratitudeComment, setGratitudeComment] = useState('')

  // Состояние отправки и завершения
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [submissionHash, setSubmissionHash] = useState('')

  // Фильтрация элементов по выбранному семестру
  const filteredItems = useMemo(() => {
    return (cascadingData.items || []).filter((item) => {
      if (selectedSemester === 'autumn') {
        return item.semester_type === 'autumn' || item.semester === '2026-1' || item.semester?.endsWith('-1')
      }
      return item.semester_type === 'spring' || item.semester === '2026-2' || item.semester?.endsWith('-2')
    })
  }, [cascadingData.items, selectedSemester])

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

        // Инициализация по умолчанию: группа БПИ-23 или первая группа с осенними дисциплинами
        const autumnItems = (casc.items || []).filter(
          (i) => i.semester_type === 'autumn' || i.semester === '2026-1'
        )
        if (autumnItems.length > 0) {
          const defaultGroup =
            casc.groups?.find((g) => g.name === 'БПИ-23') ||
            casc.groups?.find((g) => g.id === autumnItems[0].group_id) ||
            casc.groups?.[0]

          if (defaultGroup) {
            setSelectedGroupId(defaultGroup.id)
            const matchingItems = autumnItems.filter((i) => i.group_id === defaultGroup.id)
            if (matchingItems.length > 0) {
              const izmaylovaItem = matchingItems.find(
                (i) => i.teacher_name && i.teacher_name.includes('Измайлова')
              )
              const firstItem = izmaylovaItem || matchingItems[0]
              setSelectedDisciplineId(firstItem.discipline_id)
              setSelectedTeacherId(firstItem.teacher_id)
              const foundAssign = assignList.find((a) => a.id === firstItem.assignment_id)
              setActiveAssignment(foundAssign || null)
            }
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

  // Опции для семестра
  const handleSemesterChange = (newSem) => {
    setSelectedSemester(newSem)
    resetSurveyAnswers()

    const itemsForNewSem = (cascadingData.items || []).filter((item) => {
      if (newSem === 'autumn') {
        return item.semester_type === 'autumn' || item.semester === '2026-1' || item.semester?.endsWith('-1')
      }
      return item.semester_type === 'spring' || item.semester === '2026-2' || item.semester?.endsWith('-2')
    })

    const groupStillHasItems = itemsForNewSem.some((i) => i.group_id === selectedGroupId)
    const nextGroupId = groupStillHasItems
      ? selectedGroupId
      : itemsForNewSem[0]?.group_id || null

    setSelectedGroupId(nextGroupId)

    if (nextGroupId) {
      const groupItems = itemsForNewSem.filter((i) => i.group_id === nextGroupId)
      if (groupItems.length > 0) {
        const izmaylovaItem = groupItems.find(
          (i) => i.teacher_name && i.teacher_name.includes('Измайлова')
        )
        const firstItem = izmaylovaItem || groupItems[0]
        setSelectedDisciplineId(firstItem.discipline_id)
        setSelectedTeacherId(firstItem.teacher_id)
        const found = assignments.find((a) => a.id === firstItem.assignment_id)
        setActiveAssignment(found || null)
        return
      }
    }

    setSelectedDisciplineId(null)
    setSelectedTeacherId(null)
    setActiveAssignment(null)
  }

  const resetSurveyAnswers = () => {
    setBlockChoices({})
    setBlockDefects({})
    setCriticismComment('')
    setGratitudeComment('')
  }

  // Опции для групп
  const groupOptions = useMemo(() => {
    const activeGroupIds = new Set(filteredItems.map((i) => i.group_id))
    const availableGroups = (cascadingData.groups || []).filter((g) =>
      activeGroupIds.size > 0 ? activeGroupIds.has(g.id) : true
    )

    return availableGroups.map((g) => ({
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
  }, [cascadingData.groups, filteredItems])

  // Опции для дисциплин
  const disciplineOptions = useMemo(() => {
    if (!selectedGroupId) return []
    const itemsForGroup = filteredItems.filter((i) => i.group_id === selectedGroupId)
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
  }, [filteredItems, selectedGroupId])

  // Опции для преподавателей
  const teacherOptions = useMemo(() => {
    if (!selectedGroupId || !selectedDisciplineId) return []
    const itemsForDisc = filteredItems.filter(
      (i) => i.group_id === selectedGroupId && i.discipline_id === selectedDisciplineId
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
  }, [filteredItems, selectedGroupId, selectedDisciplineId])

  // Обработчики каскадного выбора
  const handleGroupChange = (grpId) => {
    setSelectedGroupId(grpId)
    resetSurveyAnswers()
    const itemsForGroup = filteredItems.filter((i) => i.group_id === grpId)
    if (itemsForGroup.length > 0) {
      const izmaylovaItem = itemsForGroup.find(
        (i) => i.teacher_name && i.teacher_name.includes('Измайлова')
      )
      const nextItem = izmaylovaItem || itemsForGroup[0]
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
    resetSurveyAnswers()
    const itemsForDisc = filteredItems.filter(
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
    resetSurveyAnswers()
    const item = filteredItems.find(
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

  // Выбор оценки в блоке (fully / partially / not)
  const handleBlockSelect = (blockId, optKey) => {
    setBlockChoices((prev) => ({
      ...prev,
      [blockId]: optKey,
    }))

    // Если выбрано "Полностью", очищаем отмеченные дефекты для этого блока
    if (optKey === 'fully') {
      setBlockDefects((prev) => ({
        ...prev,
        [blockId]: [],
      }))
    }
  }

  // Переключение чекбокса дефекта
  const handleDefectToggle = (blockId, defectText) => {
    setBlockDefects((prev) => {
      const currentList = prev[blockId] || []
      const exists = currentList.includes(defectText)
      const nextList = exists
        ? currentList.filter((d) => d !== defectText)
        : [...currentList, defectText]
      return {
        ...prev,
        [blockId]: nextList,
      }
    })
  }

  // Расчет прогресса (сколько блоков из 5 заполнено)
  const answeredBlocksCount = QUALITY_BLOCKS.filter((b) => blockChoices[b.id]).length
  const progressPercent = Math.round((answeredBlocksCount / QUALITY_BLOCKS.length) * 100)

  // Имеются ли проблемные блоки (где выбрано partially или not)
  const hasProblemBlocks = QUALITY_BLOCKS.some(
    (b) => blockChoices[b.id] === 'partially' || blockChoices[b.id] === 'not'
  )

  // Отправка анкеты
  const handleSubmit = async () => {
    if (!activeAssignment) {
      message.warning('Пожалуйста, выберите дисциплину и преподавателя для оценивания')
      return
    }

    if (answeredBlocksCount < QUALITY_BLOCKS.length) {
      message.warning(
        `Пожалуйста, оцените все ${QUALITY_BLOCKS.length} блоков анкеты (заполнено: ${answeredBlocksCount} из ${QUALITY_BLOCKS.length})`
      )
      return
    }

    // Если есть замечания, проверяем, чтобы в частично/не сделано блоках были указаны дефекты или подробный отзыв
    if (hasProblemBlocks) {
      for (const b of QUALITY_BLOCKS) {
        if (blockChoices[b.id] === 'partially') {
          const defects = blockDefects[b.id] || []
          if (defects.length === 0 && !criticismComment.trim()) {
            message.warning(
              `В ${b.shortTitle} выбрано «Частично». Пожалуйста, отметьте галочками пункты замечаний или напишите комментарий.`
            )
            return
          }
        }
      }
    }

    setIsSubmitting(true)
    try {
      // Сопоставляем вопросы из активного назначения с 5 блоками
      const templateQuestions =
        activeAssignment?.questions ||
        activeAssignment?.template?.questions ||
        []

      const payloadAnswers = []

      // 1. Оценки по 5 блокам
      QUALITY_BLOCKS.forEach((block, idx) => {
        const choice = blockChoices[block.id]
        const opt = block.options.find((o) => o.key === choice)
        const score = opt ? opt.score : 5
        const selectedDefects = blockDefects[block.id] || []

        // Ищем вопрос с соответствующим order или по индексу
        const q =
          templateQuestions.find((tq) => tq.order === block.order) ||
          templateQuestions[idx]

        if (q) {
          payloadAnswers.push({
            question_id: q.id,
            score: score,
            text_response: selectedDefects.length > 0 ? selectedDefects.join('; ') : '',
          })
        }
      })

      // 2. Открытые вопросы (критика и благодарность)
      // Вопрос #6 — замечания
      const qCrit = templateQuestions.find((tq) => tq.order === 6)
      if (qCrit && criticismComment.trim()) {
        payloadAnswers.push({
          question_id: qCrit.id,
          score: null,
          text_response: criticismComment.trim(),
        })
      }

      // Вопрос #7 — благодарность
      const qGrat = templateQuestions.find((tq) => tq.order === 7)
      if (qGrat && gratitudeComment.trim()) {
        payloadAnswers.push({
          question_id: qGrat.id,
          score: null,
          text_response: gratitudeComment.trim(),
        })
      }

      const res = await submitSurveyResponse({
        assignment_id: activeAssignment.id,
        answers: payloadAnswers,
      })

      const hash = res.session_token || res.submission_hash || 'SHA256-ANONYMOUS'
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
            title="Спасибо за участие в оценке качества образования!"
            subTitle={
              <div>
                <p style={{ margin: '8px 0', fontSize: 15, color: '#334155' }}>
                  Ваш отзыв успешно и строго анонимно сохранён в системе кафедры{' '}
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
                  resetSurveyAnswers()
                  setIsSubmitted(false)
                }}
                style={{ backgroundColor: '#1a56db', borderColor: '#1a56db' }}
              >
                Оценить следующего преподавателя
              </Button>,
              <Button
                key="finish"
                size="large"
                onClick={() => setIsCompleted(true)}
              >
                Завершить опрос
              </Button>,
            ]}
          />
        </Card>
      </div>
    )
  }

  // Экран окончательного завершения опроса
  if (isCompleted) {
    return (
      <div style={{ maxWidth: 680, margin: '80px auto', padding: '0 20px' }}>
        <Card
          style={{
            borderRadius: 16,
            textAlign: 'center',
            padding: '36px 24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0',
          }}
        >
          <CheckCircle2 size={56} color="#16a34a" style={{ margin: '0 auto 16px auto', display: 'block' }} />
          <Title level={3} style={{ color: '#0f172a', marginBottom: 8 }}>
            Опрос успешно завершён!
          </Title>
          <Paragraph style={{ color: '#475569', fontSize: 15, lineHeight: 1.6, maxWidth: 520, margin: '0 auto 24px auto' }}>
            Благодарим вас за участие в мониторинге качества образовательного процесса НФ НИТУ МИСИС.
            Ваши оценки строго анонимны и помогут сделать преподавание лучше!
          </Paragraph>
          <Button
            type="primary"
            size="large"
            onClick={() => {
              resetSurveyAnswers()
              setIsSubmitted(false)
              setIsCompleted(false)
            }}
            style={{ backgroundColor: '#1a56db', borderColor: '#1a56db' }}
          >
            Оценить другого преподавателя
          </Button>
        </Card>
      </div>
    )
  }

  const selectedItemInfo = filteredItems.find(
    (i) =>
      i.group_id === selectedGroupId &&
      i.discipline_id === selectedDisciplineId &&
      i.teacher_id === selectedTeacherId
  )

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '16px auto',
        padding: '0 16px 140px 16px',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      {/* Шапка портала студенческого опроса */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1a56db', fontWeight: 600, fontSize: 14 }}>
          <GraduationCap size={20} />
          <span>НФ НИТУ МИСИС &bull; Студенческий опрос качества</span>
        </div>
        <Tag color="green" style={{ borderRadius: 6, padding: '2px 8px' }}>
          🔒 Анонимная анкета
        </Tag>
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
              Оценка качества преподавания
            </Title>
            <Paragraph style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: 13 }}>
              Опрос строго анонимный &bull; Все данные используются в обобщённом виде для мониторинга кафедры
            </Paragraph>
          </div>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* Выбор семестра (Осенний / Весенний) */}
        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ fontSize: 14, color: '#334155', display: 'block', marginBottom: 8 }}>
            Выберите период учебного года:
          </Text>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              background: '#f1f5f9',
              borderRadius: 12,
              padding: 4,
              gap: 6,
              border: '1px solid #e2e8f0',
              maxWidth: '100%',
            }}
          >
            <button
              id="semester-autumn-btn"
              type="button"
              onClick={() => handleSemesterChange('autumn')}
              style={{
                flex: '1 1 180px',
                padding: '9px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                backgroundColor: selectedSemester === 'autumn' ? '#1a56db' : 'transparent',
                color: selectedSemester === 'autumn' ? '#ffffff' : '#475569',
                boxShadow: selectedSemester === 'autumn' ? '0 2px 8px rgba(26,86,219,0.25)' : 'none',
                transition: 'all 0.2s ease',
                textAlign: 'center',
              }}
            >
              🍂 Осенний семестр
            </button>
            <button
              id="semester-spring-btn"
              type="button"
              onClick={() => handleSemesterChange('spring')}
              style={{
                flex: '1 1 180px',
                padding: '9px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                backgroundColor: selectedSemester === 'spring' ? '#1a56db' : 'transparent',
                color: selectedSemester === 'spring' ? '#ffffff' : '#475569',
                boxShadow: selectedSemester === 'spring' ? '0 2px 8px rgba(26,86,219,0.25)' : 'none',
                transition: 'all 0.2s ease',
                textAlign: 'center',
              }}
            >
              🌸 Весенний семестр
            </button>
          </div>
        </div>

        {/* Каскадный выбор: Группа -> Дисциплина -> Преподаватель */}
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {/* Шаг 1: Группа */}
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Шаг 1. Ваша учебная группа ({groupOptions.length} групп):
              </Text>
              <Select
                id="select-group"
                style={{ width: '100%' }}
                size="large"
                showSearch
                optionFilterProp="children"
                placeholder="Выберите группу"
                value={selectedGroupId}
                onChange={handleGroupChange}
                options={groupOptions}
              />
            </div>

            {/* Шаг 2: Дисциплина */}
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Шаг 2. Изучаемая дисциплина ({disciplineOptions.length}):
              </Text>
              <Select
                id="select-discipline"
                style={{ width: '100%' }}
                size="large"
                showSearch
                optionFilterProp="children"
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
                id="select-teacher"
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
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                  {selectedItemInfo.teacher_name}
                </Text>
                <Tag color="blue">{selectedItemInfo.teacher_position || 'Преподаватель'}</Tag>
                <Tag color={selectedSemester === 'autumn' ? 'orange' : 'green'}>
                  {selectedSemester === 'autumn' ? '🍂 Осенний семестр' : '🌸 Весенний семестр'}
                </Tag>
              </div>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                Дисциплина: <strong>{selectedItemInfo.discipline_name}</strong> &bull; Группа:{' '}
                <strong>{selectedItemInfo.group_name}</strong> &bull; Кафедра: <strong>{selectedItemInfo.department_name}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Прогресс оценивания</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Progress
                  percent={progressPercent}
                  size="small"
                  style={{ width: 110 }}
                  strokeColor={progressPercent === 100 ? '#15803d' : '#1a56db'}
                />
                <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
                  {answeredBlocksCount} / {QUALITY_BLOCKS.length} блоков
                </Text>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 5 КАРТОЧЕК БЛОКОВ КАЧЕСТВА */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
        {QUALITY_BLOCKS.map((block) => {
          const IconComp = block.icon
          const currentChoice = blockChoices[block.id]
          const isProblem = currentChoice === 'partially' || currentChoice === 'not'
          const currentDefects = blockDefects[block.id] || []

          return (
            <Card
              key={block.id}
              data-block-id={block.id}
              style={{
                borderRadius: 14,
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                border: currentChoice
                  ? currentChoice === 'fully'
                    ? '1.5px solid #86efac'
                    : currentChoice === 'partially'
                    ? '1.5px solid #fde047'
                    : '1.5px solid #fca5a5'
                  : '1px solid #e2e8f0',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Заголовок блока */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1a56db',
                    }}
                  >
                    <IconComp size={18} />
                  </div>
                  <Title level={4} style={{ margin: 0, color: '#1e293b', fontSize: 16 }}>
                    {block.title}
                  </Title>
                </div>

                {currentChoice && (
                  <Tag
                    color={
                      currentChoice === 'fully'
                        ? 'success'
                        : currentChoice === 'partially'
                        ? 'warning'
                        : 'error'
                    }
                    style={{ fontSize: 12, padding: '2px 10px', borderRadius: 6 }}
                  >
                    {currentChoice === 'fully'
                      ? '✓ Полностью'
                      : currentChoice === 'partially'
                      ? 'Частично'
                      : 'Не соответствует'}
                  </Tag>
                )}
              </div>

              {/* Плашка стандарта качества */}
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#475569',
                  backgroundColor: '#f8fafc',
                  borderLeft: '4px solid #1a56db',
                  padding: '12px 16px',
                  borderRadius: '0 8px 8px 0',
                  marginBottom: 16,
                }}
              >
                <strong style={{ color: '#1e293b' }}>Стандарт кафедры:</strong> {block.standard}
              </div>

              {/* Кнопки выбора (🟢 / 🟡 / 🔴) */}
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Оцените соответствие преподавателя стандарту:
                </Text>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 10,
                  }}
                >
                  {block.options.map((opt) => {
                    const isActive = currentChoice === opt.key
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleBlockSelect(block.id, opt.key)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: isActive ? `2px solid ${opt.color}` : '1px solid #cbd5e1',
                          backgroundColor: isActive ? opt.bg : '#ffffff',
                          color: isActive ? opt.color : '#334155',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: 14,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          transition: 'all 0.18s ease',
                          boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Раскрывашка с дефектами при выборе 🟡 Частично или 🔴 Не сделано */}
              {isProblem && (
                <div
                  style={{
                    marginTop: 18,
                    padding: 16,
                    backgroundColor: '#fffbeb',
                    borderRadius: 10,
                    border: '1px dashed #f59e0b',
                    animation: 'fadeIn 0.25s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 12,
                      color: '#92400e',
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>{block.defectsTitle}</span>
                  </div>

                  {/* Если в блоке есть подгруппы (как в Блоке 2: Лекции и Практики) */}
                  {block.subgroups ? (
                    <div>
                      {block.subgroups.map((sg, sgIdx) => (
                        <div key={sgIdx} style={{ marginBottom: 14 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#b45309',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              marginBottom: 6,
                            }}
                          >
                            {sg.title}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {sg.items.map((defectText, dIdx) => (
                              <Checkbox
                                key={dIdx}
                                checked={currentDefects.includes(defectText)}
                                onChange={() => handleDefectToggle(block.id, defectText)}
                                style={{ fontSize: 13, color: '#334155' }}
                              >
                                {defectText}
                              </Checkbox>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {block.defects.map((defectText, dIdx) => (
                        <Checkbox
                          key={dIdx}
                          checked={currentDefects.includes(defectText)}
                          onChange={() => handleDefectToggle(block.id, defectText)}
                          style={{ fontSize: 13, color: '#334155' }}
                        >
                          {defectText}
                        </Checkbox>
                      ))}
                    </div>
                  )}

                  {currentDefects.length > 0 && (
                    <div style={{ marginTop: 10, fontSize: 12, color: '#b45309' }}>
                      Отмечено замечаний: <strong>{currentDefects.length}</strong>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* СЕКЦИЯ ОТКРЫТЫХ ВОПРОСОВ */}
      <Card
        style={{
          borderRadius: 16,
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          marginBottom: 28,
          border: '1px solid #e2e8f0',
        }}
      >
        <Title level={4} style={{ margin: '0 0 16px 0', color: '#1e293b' }}>
          Финальные комментарии и предложения
        </Title>

        {/* Если есть хотя бы одна желтая или красная оценка — поле замечаний */}
        {hasProblemBlocks ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <AlertTriangle size={16} color="#dc2626" />
              <Text strong style={{ color: '#dc2626', fontSize: 14 }}>
                Что именно вас не устраивает в организации дисциплины или подаче материала?
              </Text>
            </div>
            <Paragraph style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: 12 }}>
              Вы отметили, что по некоторым стандартам есть отклонения. Пожалуйста, напишите подробно,
              какие темы непонятны, чего не хватает на парах или что мешает учебному процессу:
            </Paragraph>
            <TextArea
              rows={3}
              placeholder="Опишите ваши замечания и конкретные трудности..."
              value={criticismComment}
              onChange={(e) => setCriticismComment(e.target.value)}
              style={{ borderRadius: 8 }}
            />
          </div>
        ) : (
          answeredBlocksCount === QUALITY_BLOCKS.length && (
            <Alert
              type="success"
              showIcon
              message="🎉 Отлично! Вы полностью довольны организацией учебного процесса по всем 5 стандартам."
              style={{ marginBottom: 20, borderRadius: 8 }}
            />
          )
        )}

        {/* Поле благодарности (необязательно) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Heart size={16} color="#16a34a" />
            <Text strong style={{ color: '#16a34a', fontSize: 14 }}>
              ✨ Выражение благодарности (Необязательно)
            </Text>
          </div>
          <Paragraph style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: 12 }}>
            Если вы хотите поблагодарить преподавателя, выделить интересную методику или написать то,
            что не вошло в вопросы, сделайте это здесь:
          </Paragraph>
          <TextArea
            rows={2}
            placeholder="Ваш положительный отзыв или добрые слова преподавателю..."
            value={gratitudeComment}
            onChange={(e) => setGratitudeComment(e.target.value)}
            style={{ borderRadius: 8 }}
          />
        </div>
      </Card>

      {/* ПЛАВАЮЩАЯ ПАНЕЛЬ ОТПРАВКИ (всегда видна внизу окна в любом режиме Chrome) */}
      <div
        id="survey-sticky-submit-bar"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid #e2e8f0',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
          padding: '12px 16px',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Progress
              percent={progressPercent}
              size="small"
              style={{ width: 110 }}
              strokeColor={progressPercent === 100 ? '#15803d' : '#1a56db'}
            />
            <Text strong style={{ fontSize: 13, color: '#334155' }}>
              {answeredBlocksCount === QUALITY_BLOCKS.length
                ? '✅ Все стандарты оценено'
                : `Оценено ${answeredBlocksCount} из ${QUALITY_BLOCKS.length} блоков`}
            </Text>
          </div>

          <Button
            type="primary"
            size="large"
            id="survey-submit-button"
            icon={<Send size={18} />}
            loading={isSubmitting}
            onClick={handleSubmit}
            disabled={!activeAssignment}
            style={{
              height: 44,
              paddingLeft: 24,
              paddingRight: 24,
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 10,
              backgroundColor: '#1a56db',
              boxShadow: '0 2px 10px rgba(26,86,219,0.3)',
            }}
          >
            {answeredBlocksCount === QUALITY_BLOCKS.length
              ? 'Отправить анкету'
              : `Оцените блоки (${answeredBlocksCount}/${QUALITY_BLOCKS.length})`}
          </Button>
        </div>
      </div>
    </div>
  )
}
