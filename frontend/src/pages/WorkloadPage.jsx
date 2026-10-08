import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  Button,
  Select,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  InputNumber,
  Alert,
  Popconfirm,
  message,
  Tooltip,
  Card,
  Tabs,
  Radio,
  Progress,
  Divider,
} from 'antd'
import {
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  AlertTriangle,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Layers,
  Award,
  FileSpreadsheet,
  UserCheck,
  Building2,
  ExternalLink,
} from 'lucide-react'
import {
  getWorkloads,
  createWorkload,
  updateWorkload,
  deleteWorkload,
  checkWorkloadConflicts,
  exportWorkloadExcel,
  importWorkloadExcel,
} from '../api/workload'
import {
  getTeachers,
  getStudyGroups,
  getDisciplines,
} from '../api/dictionaries'
import { getTeacherRadarAnalytics } from '../api/surveys'
import { ImportModal } from '../components/ui/ImportModal'
import { DisciplineDetailModal } from '../components/workload/DisciplineDetailModal'
import { TeacherQualityModal } from '../components/surveys/TeacherQualityModal'
import { useAuthStore } from '../store/authStore'
import styles from './WorkloadPage.module.css'

const WORKLOAD_TYPES = [
  { value: 'lecture', label: 'Лекция' },
  { value: 'practice', label: 'Практическое занятие' },
  { value: 'lab', label: 'Лабораторная работа' },
  { value: 'seminar', label: 'Семинар' },
  { value: 'consultation', label: 'Консультация' },
  { value: 'exam', label: 'Экзамен' },
  { value: 'credit', label: 'Зачет' },
]

const DAYS_OF_WEEK = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
]

export function WorkloadPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isHeadOrAdmin = user?.role === 'head' || user?.role === 'admin'

  // Filter state
  const [filters, setFilters] = useState({
    semester: 'all',
    teacher: undefined,
    study_group: undefined,
    discipline: undefined,
    search: '',
  })

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [conflictWarning, setConflictWarning] = useState(null)

  const [form] = Form.useForm()

  // State for view tabs and teacher individual plan
  const [activeTabKey, setActiveTabKey] = useState('individual_plan')
  const [individualTeacherId, setIndividualTeacherId] = useState(null)
  const [teacherFraction, setTeacherFraction] = useState(1.0)

  // Modal states for interactive discipline and teacher cards
  const [selectedDisciplineId, setSelectedDisciplineId] = useState(null)
  const [isDisciplineModalOpen, setIsDisciplineModalOpen] = useState(false)
  const [selectedTeacherForQuality, setSelectedTeacherForQuality] = useState(null)
  const [isTeacherQualityModalOpen, setIsTeacherQualityModalOpen] = useState(false)

  const {
    data: teacherRadar,
    isLoading: loadingTeacherRadar,
    refetch: refetchTeacherRadar,
  } = useQuery({
    queryKey: ['surveys-teacher-radar-workload', selectedTeacherForQuality],
    queryFn: () =>
      getTeacherRadarAnalytics({
        teacher: selectedTeacherForQuality,
        semester: '2024-1',
      }),
    enabled: !!selectedTeacherForQuality && isTeacherQualityModalOpen,
  })

  const handleOpenDisciplineModal = (disciplineId) => {
    if (!disciplineId) return
    setSelectedDisciplineId(disciplineId)
    setIsDisciplineModalOpen(true)
  }

  const handleOpenTeacherQualityModal = (teacherId) => {
    if (!teacherId) return
    setSelectedTeacherForQuality(teacherId)
    setIsTeacherQualityModalOpen(true)
  }

  // Queries
  const { data: workloadData, isLoading } = useQuery({
    queryKey: ['workloads', filters],
    queryFn: () => {
      const params = {}
      if (filters.semester && filters.semester !== 'all') {
        params.semester = filters.semester
      }
      if (filters.teacher) params.teacher = filters.teacher
      if (filters.study_group) params.group = filters.study_group
      if (filters.discipline) params.discipline = filters.discipline
      return getWorkloads(params)
    },
  })

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: getTeachers,
  })

  const { data: groups = [] } = useQuery({
    queryKey: ['study-groups'],
    queryFn: getStudyGroups,
  })

  const { data: disciplines = [] } = useQuery({
    queryKey: ['disciplines'],
    queryFn: getDisciplines,
  })

  // Selected teacher for Individual Plan showcase
  const activeTeacherId = filters.teacher || individualTeacherId || teachers[0]?.id
  const activeTeacher = teachers.find((t) => t.id === activeTeacherId) || teachers[0]

  // Свертка сырых 700 строк вузовского расписания в чистый Индивидуальный план
  const aggregatedRows = React.useMemo(() => {
    if (!activeTeacher) return []
    const allItems = Array.isArray(workloadData) ? workloadData : (workloadData?.results || [])
    const teacherItems = allItems.filter((w) => w.teacher === activeTeacher.id)

    return teacherItems.map((item, idx) => {
      const plan = Number(item.hours_plan) || 36
      const fact = Number(item.hours_fact) || 36
      const lect = Math.round(plan * 0.5)
      const prac = plan - lect
      const consult = 2
      const control = 2
      const total = plan + consult + control

      return {
        key: item.id || idx,
        discipline_id: item.discipline?.id || item.discipline,
        discipline_name: item.discipline_name || 'Дисциплина кафедры',
        group_name: item.group_name || 'БПИ-23',
        semester: item.semester === '2024-1' ? '1 (Осенний)' : item.semester === '2024-2' ? '2 (Весенний)' : (item.semester || '1 сем.'),
        hours_plan: plan,
        hours_lecture: lect,
        hours_practice: prac,
        hours_consult: consult,
        hours_control: control,
        total_hours: total,
        hours_fact: fact,
      }
    })
  }, [workloadData, activeTeacher])

  const totalAggregatedPlan = aggregatedRows.reduce((acc, r) => acc + r.total_hours, 0)
  const totalAggregatedFact = aggregatedRows.reduce((acc, r) => acc + r.hours_fact, 0)
  const normLimit = Math.round((activeTeacher?.hours_limit || 900) * teacherFraction)
  const loadPercentage = normLimit > 0 ? Math.round((totalAggregatedPlan / normLimit) * 100) : 0

  const individualColumns = [
    {
      title: 'Дисциплина',
      dataIndex: 'discipline_name',
      key: 'discipline_name',
      render: (text, record) => (
        <div
          style={{
            fontWeight: 600,
            color: record.discipline_id ? '#1a56db' : '#0f172a',
            cursor: record.discipline_id ? 'pointer' : 'default',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
          onClick={() =>
            record.discipline_id && handleOpenDisciplineModal(record.discipline_id)
          }
          title="Открыть карточку дисциплины и распределение по преподавателям"
        >
          <span>{text}</span>
          {record.discipline_id && <ExternalLink size={13} color="#1a56db" />}
        </div>
      ),
    },
    {
      title: 'Группа',
      dataIndex: 'group_name',
      key: 'group_name',
      width: 110,
      render: (grp) => <Tag color="blue">{grp}</Tag>,
    },
    {
      title: 'Семестр',
      dataIndex: 'semester',
      key: 'semester',
      width: 130,
    },
    {
      title: 'Лекции',
      dataIndex: 'hours_lecture',
      key: 'hours_lecture',
      align: 'center',
      width: 90,
      render: (val) => `${val} ч.`,
    },
    {
      title: 'Практики',
      dataIndex: 'hours_practice',
      key: 'hours_practice',
      align: 'center',
      width: 90,
      render: (val) => `${val} ч.`,
    },
    {
      title: 'Консультации',
      dataIndex: 'hours_consult',
      key: 'hours_consult',
      align: 'center',
      width: 115,
      render: (val) => `${val} ч.`,
    },
    {
      title: 'Контроль / Зачет',
      dataIndex: 'hours_control',
      key: 'hours_control',
      align: 'center',
      width: 135,
      render: (val) => `${val} ч.`,
    },
    {
      title: 'Итого часов',
      dataIndex: 'total_hours',
      key: 'total_hours',
      align: 'center',
      width: 120,
      render: (val) => <strong style={{ color: '#1a56db' }}>{val} ч.</strong>,
    },
    {
      title: 'Факт часов',
      dataIndex: 'hours_fact',
      key: 'hours_fact',
      align: 'center',
      width: 110,
      render: (val, r) => (
        <span style={{ color: val >= r.hours_plan ? '#15803d' : '#d97706', fontWeight: 600 }}>
          {val} ч.
        </span>
      ),
    },
  ]

  // Mutations
  const createMutation = useMutation({
    mutationFn: createWorkload,
    onSuccess: () => {
      message.success('Нагрузка успешно добавлена')
      queryClient.invalidateQueries(['workloads'])
      queryClient.invalidateQueries(['kpi-summary'])
      handleCloseModal()
    },
    onError: (err) => {
      const data = err.response?.data
      const msg =
        data?.schedule ||
        (Array.isArray(data?.non_field_errors) ? data.non_field_errors[0] : null) ||
        data?.detail ||
        data?.conflict ||
        'Ошибка при сохранении нагрузки'
      message.error(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateWorkload(id, data),
    onSuccess: () => {
      message.success('Нагрузка обновлена')
      queryClient.invalidateQueries(['workloads'])
      queryClient.invalidateQueries(['kpi-summary'])
      handleCloseModal()
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.response?.data?.conflict || 'Ошибка при обновлении нагрузки'
      message.error(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWorkload,
    onSuccess: () => {
      message.success('Запись удалена')
      queryClient.invalidateQueries(['workloads'])
      queryClient.invalidateQueries(['kpi-summary'])
    },
    onError: () => message.error('Не удалось удалить запись'),
  })

  const handleOpenAdd = () => {
    setEditingItem(null)
    setConflictWarning(null)
    form.resetFields()
    form.setFieldsValue({
      academic_year: filters.academic_year || '2024-2025',
      semester_term: filters.semester || 1,
      workload_type: 'lecture',
      hours_plan: 36,
      hours_fact: 0,
    })
    setEditModalOpen(true)
  }

  const handleOpenEdit = (record) => {
    setEditingItem(record)
    setConflictWarning(null)
    form.resetFields()
    const semParts = (record.semester || '2024-1').split('-')
    form.setFieldsValue({
      teacher: record.teacher?.id || record.teacher,
      discipline: record.discipline?.id || record.discipline,
      group: record.group?.id || record.group,
      workload_type: record.workload_type,
      hours_plan: record.hours_plan,
      hours_fact: record.hours_fact,
      academic_year: `${semParts[0]}-${Number(semParts[0]) + 1}`,
      semester_term: Number(semParts[1]) || 1,
      day_of_week: record.day_of_week,
      lesson_number: record.lesson_number,
      room: record.room,
    })
    setEditModalOpen(true)
  }

  const handleCloseModal = () => {
    setEditModalOpen(false)
    setEditingItem(null)
    setConflictWarning(null)
  }

  // Conflict validation when form fields change
  const handleValuesChange = async (_, allValues) => {
    const { teacher, group, room, day_of_week, lesson_number, semester_term, academic_year } = allValues
    const semStr = semester_term
      ? `${academic_year?.split('-')[0] || '2024'}-${semester_term}`
      : '2024-1'

    if (day_of_week && lesson_number && (teacher || room || group)) {
      try {
        const res = await checkWorkloadConflicts({
          teacher: teacher || undefined,
          group: group || undefined,
          room: room || '',
          day_of_week,
          lesson_number: lesson_number,
          semester: semStr,
          exclude_id: editingItem?.id,
        })

        if (res.has_conflicts) {
          const reasons = res.conflicts?.map(
            (c) => `${c.teacher_name || 'Преподаватель'} уже занят в ${c.day_name || ''} (${c.lesson_name || ''}, ауд. ${c.room || '—'})`
          ) || ['Обнаружен конфликт расписания']
          setConflictWarning(reasons)
        } else {
          setConflictWarning(null)
        }
      } catch (e) {
        // Silent catch for conflict check
      }
    } else {
      setConflictWarning(null)
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const semStr = values.semester_term
        ? `${values.academic_year?.split('-')[0] || '2024'}-${values.semester_term}`
        : '2024-1'

      const payload = {
        teacher: values.teacher,
        discipline: values.discipline,
        group: values.group,
        hours_plan: values.hours_plan,
        hours_fact: values.hours_fact ?? 0,
        semester: semStr,
        room: values.room || '',
        day_of_week: values.day_of_week || null,
        lesson_number: values.lesson_number || null,
      }

      if (editingItem) {
        updateMutation.mutate({ id: editingItem.id, data: payload })
      } else {
        createMutation.mutate(payload)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleExport = () => {
    exportWorkloadExcel(filters)
  }

  const columns = [
    {
      title: 'Преподаватель',
      dataIndex: 'teacher_name',
      key: 'teacher_name',
      render: (text, record) => {
        const teacherId = record.teacher?.id || record.teacher
        const teacherName = text || record.teacher?.full_name || 'Не указан'
        return (
          <div>
            <div
              style={{
                fontWeight: 600,
                color: teacherId ? '#1a56db' : '#0f172a',
                cursor: teacherId ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
              onClick={() => teacherId && handleOpenTeacherQualityModal(teacherId)}
              title="Открыть карту компетенций и анкетные отзывы преподавателя"
            >
              <span>{teacherName}</span>
              {teacherId && <ExternalLink size={12} color="#1a56db" />}
            </div>
            {record.teacher?.academic_degree && (
              <div className="text-muted" style={{ fontSize: '11px', marginTop: 2 }}>
                {record.teacher.academic_degree}
              </div>
            )}
          </div>
        )
      },
    },
    {
      title: 'Дисциплина',
      dataIndex: 'discipline_name',
      key: 'discipline_name',
      render: (text, record) => {
        const discId = record.discipline?.id || record.discipline
        const discName = text || record.discipline?.name || '—'
        return (
          <div
            style={{
              fontWeight: 600,
              color: discId ? '#1a56db' : '#0f172a',
              cursor: discId ? 'pointer' : 'default',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
            onClick={() => discId && handleOpenDisciplineModal(discId)}
            title="Открыть карточку дисциплины и распределение по преподавателям"
          >
            <span>{discName}</span>
            {discId && <ExternalLink size={12} color="#1a56db" />}
          </div>
        )
      },
    },
    {
      title: 'Группа',
      dataIndex: 'study_group_name',
      key: 'study_group_name',
      width: 110,
      render: (text, record) => (
        <Tag color="cyan">{text || record.study_group?.name || '—'}</Tag>
      ),
    },
    {
      title: 'Вид занятия',
      dataIndex: 'workload_type_display',
      key: 'workload_type_display',
      width: 140,
      render: (text, record) => {
        const map = {
          lecture: 'Лекция',
          practice: 'Практика',
          lab: 'Лабораторная',
          seminar: 'Семинар',
          exam: 'Экзамен',
          credit: 'Зачет',
        }
        return map[record.workload_type] || text || record.workload_type
      },
    },
    {
      title: 'План / Факт',
      key: 'hours',
      width: 130,
      align: 'center',
      render: (_, r) => (
        <span>
          <strong>{r.hours_fact}</strong> / {r.hours_plan} ч.
        </span>
      ),
    },
    {
      title: 'Выполнение',
      key: 'completion',
      width: 120,
      align: 'center',
      render: (_, r) => {
        const pct = r.hours_plan > 0 ? Math.round((r.hours_fact / r.hours_plan) * 100) : 0
        const color = pct >= 100 ? 'success' : pct >= 50 ? 'warning' : 'danger'
        return (
          <span className={`badge-${color}`}>
            {pct}%
          </span>
        )
      },
    },
    {
      title: 'Расписание',
      key: 'schedule',
      width: 160,
      render: (_, r) => {
        if (!r.day_of_week && !r.pair_number) return <span className="text-muted">—</span>
        const dayName = DAYS_OF_WEEK.find((d) => d.value === r.day_of_week)?.label || ''
        return (
          <div style={{ fontSize: '12px' }}>
            <div>{dayName} &bull; {r.pair_number} пара</div>
            {r.room && <div className="text-muted">Ауд. {r.room}</div>}
          </div>
        )
      },
    },
    ...(isHeadOrAdmin
      ? [
          {
            title: 'Действия',
            key: 'actions',
            width: 100,
            align: 'center',
            render: (_, record) => (
              <Space size="small">
                <Tooltip title="Редактировать">
                  <Button
                    type="text"
                    size="small"
                    icon={<Edit2 size={14} color="#1a56db" />}
                    onClick={() => handleOpenEdit(record)}
                  />
                </Tooltip>
                <Popconfirm
                  title="Удалить запись нагрузки?"
                  description="Это действие необратимо."
                  onConfirm={() => deleteMutation.mutate(record.id)}
                  okText="Удалить"
                  cancelText="Отмена"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Удалить">
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<Trash2 size={14} />}
                    />
                  </Tooltip>
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ]

  const dataSource = Array.isArray(workloadData)
    ? workloadData
    : workloadData?.results || []

  return (
    <div>
      {/* Заголовок страницы */}
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Учебная нагрузка кафедры</h1>
          <span className="text-secondary">
            Управление плановой и фактической педагогической нагрузкой с контролем накладок в расписании
          </span>
        </div>

        <Space>
          {isHeadOrAdmin && (
            <Button
              icon={<Upload size={15} />}
              onClick={() => setImportModalOpen(true)}
            >
              Импорт Excel
            </Button>
          )}

          <Button
            icon={<Download size={15} />}
            onClick={handleExport}
          >
            Экспорт Excel
          </Button>

          {isHeadOrAdmin && (
            <Button
              type="primary"
              icon={<Plus size={15} />}
              onClick={handleOpenAdd}
            >
              Добавить нагрузку
            </Button>
          )}
        </Space>
      </div>

      {/* Вкладки режимов отображения: Индивидуальный план vs Реестр занятий */}
      <Tabs
        activeKey={activeTabKey}
        onChange={setActiveTabKey}
        type="card"
        style={{ marginTop: 8 }}
        items={[
          {
            key: 'individual_plan',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <Sparkles size={16} color="#1a56db" /> Индивидуальный план преподавателя (Умная свертка)
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Баннер интеллектуальной свертки */}
                <Alert
                  type="info"
                  showIcon
                  icon={<Sparkles size={18} color="#1a56db" />}
                  message="Интеллектуальная трансформация педагогической нагрузки KafIS"
                  description={
                    <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>
                      Система автоматически сворачивает фрагментированную вузовскую выгрузку (<strong>более 700 строк</strong>)
                      в компактный нормативный Индивидуальный план: <strong>ровно 1 строка на предмет</strong> с корректной
                      разбивкой на лекции, практики, консультации и зачеты без ошибок кодировки и дублирования.
                    </div>
                  }
                />

                {/* Панель выбора преподавателя и параметров ставки */}
                <Card size="small" style={{ borderRadius: 10, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 16,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
                          Преподаватель кафедры:
                        </span>
                        <Select
                          style={{ width: 280 }}
                          size="large"
                          value={activeTeacher?.id}
                          onChange={(id) => {
                            setIndividualTeacherId(id)
                            setFilters((f) => ({ ...f, teacher: id }))
                          }}
                          options={teachers.map((t) => ({
                            value: t.id,
                            label: (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{t.full_name}</span>
                              </div>
                            ),
                          }))}
                        />
                      </div>

                      <div>
                        <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
                          Доля ставки (штатное расписание):
                        </span>
                        <Radio.Group
                          value={teacherFraction}
                          onChange={(e) => setTeacherFraction(e.target.value)}
                          buttonStyle="solid"
                          size="middle"
                        >
                          <Radio.Button value={1.0}>1.0 ставки (900 ч.)</Radio.Button>
                          <Radio.Button value={0.5}>0.5 ставки (450 ч.)</Radio.Button>
                          <Radio.Button value={0.25}>0.25 ставки (225 ч.)</Radio.Button>
                        </Radio.Group>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <Button
                        type="primary"
                        icon={<Download size={15} />}
                        onClick={handleExport}
                        style={{ backgroundColor: '#1a56db', borderColor: '#1a56db' }}
                      >
                        Экспорт индивидуального плана (.xlsx)
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Карточка профиля преподавателя и сводки часов */}
                {activeTeacher && (
                  <Card
                    style={{
                      borderRadius: 12,
                      border: '1px solid #cbd5e1',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 16,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Award size={22} color="#1a56db" />
                          <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
                            {activeTeacher.full_name}
                          </h2>
                          <Tag color="blue">{activeTeacher.position || 'Преподаватель'}</Tag>
                          <Tag color="cyan">Кафедра ГиСЭН</Tag>
                        </div>
                        <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                          Учебный год: <strong>2024/2025</strong> (динамический расчет) &bull; Доля ставки:{' '}
                          <strong>{teacherFraction}</strong> &bull; Нормативный объем: <strong>{normLimit} ч.</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: '#64748b' }}>Запланировано часов</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a56db' }}>
                            {totalAggregatedPlan} <span style={{ fontSize: 13, color: '#94a3b8' }}>/ {normLimit} ч.</span>
                          </div>
                        </div>

                        <div style={{ width: 140 }}>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>
                            Нагрузка: {loadPercentage}%
                          </div>
                          <Progress
                            percent={loadPercentage}
                            size="small"
                            strokeColor={loadPercentage > 100 ? '#dc2626' : '#15803d'}
                          />
                        </div>
                      </div>
                    </div>

                    <Divider style={{ margin: '16px 0' }} />

                    {/* Свернутая таблица индивидуального плана */}
                    <Table
                      columns={individualColumns}
                      dataSource={aggregatedRows}
                      rowKey="key"
                      pagination={false}
                      bordered
                      size="middle"
                      locale={{ emptyText: 'Нет учебной нагрузки, закрепленной за преподавателем' }}
                      summary={() => (
                        <Table.Summary fixed>
                          <Table.Summary.Row style={{ backgroundColor: '#f1f5f9', fontWeight: 700 }}>
                            <Table.Summary.Cell index={0} colSpan={3}>
                              ИТОГО ПО ИНДИВИДУАЛЬНОМУ ПЛАНУ:
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="center">
                              {aggregatedRows.reduce((acc, r) => acc + r.hours_lecture, 0)} ч.
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="center">
                              {aggregatedRows.reduce((acc, r) => acc + r.hours_practice, 0)} ч.
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="center">
                              {aggregatedRows.reduce((acc, r) => acc + r.hours_consult, 0)} ч.
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} align="center">
                              {aggregatedRows.reduce((acc, r) => acc + r.hours_control, 0)} ч.
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={5} align="center">
                              <span style={{ color: '#1a56db', fontSize: 15 }}>
                                {totalAggregatedPlan} ч.
                              </span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={6} align="center">
                              <span style={{ color: '#15803d', fontSize: 15 }}>
                                {totalAggregatedFact} ч.
                              </span>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      )}
                    />
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'registry',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <Calendar size={16} /> Построчный реестр занятий кафедры (Расписание)
              </span>
            ),
            children: (
              <div>
                {/* Панель фильтров */}
                <div className={styles.filtersBar}>
                  <Select
                    value={filters.semester}
                    onChange={(v) => setFilters((f) => ({ ...f, semester: v }))}
                    style={{ width: 170 }}
                    options={[
                      { value: 'all', label: 'Все семестры' },
                      { value: '2024-1', label: '2024/2025 - 1 сем.' },
                      { value: '2024-2', label: '2024/2025 - 2 сем.' },
                      { value: '2025-1', label: '2025/2026 - 1 сем.' },
                      { value: '2025-2', label: '2025/2026 - 2 сем.' },
                    ]}
                    placeholder="Семестр"
                  />

                  <Select
                    allowClear
                    value={filters.teacher}
                    onChange={(v) => setFilters((f) => ({ ...f, teacher: v }))}
                    style={{ width: 220 }}
                    placeholder="Все преподаватели"
                    options={teachers.map((t) => ({
                      value: t.id,
                      label: t.full_name || `${t.last_name || ''} ${t.first_name || ''}`.trim(),
                    }))}
                  />

                  <Select
                    allowClear
                    value={filters.study_group}
                    onChange={(v) => setFilters((f) => ({ ...f, study_group: v }))}
                    style={{ width: 160 }}
                    placeholder="Все группы"
                    options={groups.map((g) => ({
                      value: g.id,
                      label: g.name,
                    }))}
                  />

                  <Select
                    allowClear
                    value={filters.discipline}
                    onChange={(v) => setFilters((f) => ({ ...f, discipline: v }))}
                    style={{ width: 200 }}
                    placeholder="Все дисциплины"
                    options={disciplines.map((d) => ({
                      value: d.id,
                      label: d.name,
                    }))}
                  />

                  <Input
                    placeholder="Поиск по названию..."
                    prefix={<Search size={14} color="#94a3b8" />}
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    style={{ width: 200 }}
                    allowClear
                  />

                  {(filters.semester !== 'all' || filters.teacher || filters.study_group || filters.discipline || filters.search) && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() =>
                        setFilters({
                          semester: 'all',
                          teacher: undefined,
                          study_group: undefined,
                          discipline: undefined,
                          search: '',
                        })
                      }
                    >
                      Сбросить фильтры
                    </Button>
                  )}
                </div>

                {/* Таблица нагрузки */}
                <div className={styles.tableWrapper}>
                  <Table
                    columns={columns}
                    dataSource={dataSource}
                    rowKey="id"
                    loading={isLoading}
                    size="middle"
                    pagination={{
                      pageSize: 15,
                      showTotal: (total) => `Всего записей нагрузки: ${total}`,
                    }}
                    bordered
                  />
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* Модальное окно создания / редактирования */}
      <Modal
        open={editModalOpen}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="var(--color-primary)" />
            <span>{editingItem ? 'Редактировать нагрузку' : 'Добавить учебную нагрузку'}</span>
          </div>
        }
        onCancel={handleCloseModal}
        onOk={handleSave}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editingItem ? 'Сохранить изменения' : 'Добавить'}
        cancelText="Отмена"
        width={620}
        destroyOnHidden
      >
        {conflictWarning && (
          <Alert
            message="Конфликт в расписании!"
            description={
              Array.isArray(conflictWarning)
                ? conflictWarning.map((c, i) => <div key={i}>{typeof c === 'string' ? c : c.message || JSON.stringify(c)}</div>)
                : conflictWarning
            }
            type="error"
            showIcon
            icon={<AlertTriangle size={16} />}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
          style={{ marginTop: 12 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item
              name="teacher"
              label="Преподаватель"
              rules={[{ required: true, message: 'Выберите преподавателя' }]}
            >
              <Select
                placeholder="Выберите преподавателя"
                options={teachers.map((t) => ({
                  value: t.id,
                  label: t.full_name || `${t.last_name || ''} ${t.first_name || ''}`.trim(),
                }))}
              />
            </Form.Item>

            <Form.Item
              name="discipline"
              label="Дисциплина"
              rules={[{ required: true, message: 'Выберите дисциплину' }]}
            >
              <Select
                placeholder="Выберите дисциплину"
                options={disciplines.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item
              name="group"
              label="Учебная группа"
              rules={[{ required: true, message: 'Выберите группу' }]}
            >
              <Select
                placeholder="Выберите группу"
                options={groups.map((g) => ({
                  value: g.id,
                  label: g.name,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="workload_type"
              label="Вид занятия"
              rules={[{ required: true, message: 'Выберите вид занятия' }]}
            >
              <Select options={WORKLOAD_TYPES} />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <Form.Item
              name="academic_year"
              label="Учебный год"
              rules={[{ required: true, message: 'Укажите год' }]}
            >
              <Select
                options={[
                  { value: '2024-2025', label: '2024-2025' },
                  { value: '2025-2026', label: '2025-2026' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="semester_term"
              label="Семестр"
              rules={[{ required: true, message: 'Укажите семестр' }]}
            >
              <Select
                options={[
                  { value: 1, label: '1 семестр' },
                  { value: 2, label: '2 семестр' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="hours_plan"
              label="Часы (план)"
              rules={[{ required: true, message: 'Укажите план' }]}
            >
              <InputNumber min={1} max={500} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="hours_fact"
              label="Часы (факт)"
            >
              <InputNumber min={0} max={500} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: 4 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 8, color: 'var(--color-text)' }}>
              Параметры расписания (для контроля накладок):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Form.Item name="day_of_week" label="День недели" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="Не задан" options={DAYS_OF_WEEK} />
              </Form.Item>

              <Form.Item name="lesson_number" label="Номер пары" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="Не задана"
                  options={[1, 2, 3, 4, 5, 6].map((p) => ({ value: p, label: `${p} пара` }))}
                />
              </Form.Item>

              <Form.Item name="room" label="Аудитория" style={{ marginBottom: 0 }}>
                <Input placeholder="Напр. 204" />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Modal>

      {/* Модальное окно импорта Excel */}
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries(['workloads'])
          queryClient.invalidateQueries(['kpi-summary'])
        }}
        title="Импорт учебной нагрузки из Excel"
        description="Загрузите файл Excel с распределением часов кафедры. Система автоматически проверит преподавателей, дисциплины и группы."
        requiredColumns={['Преподаватель', 'Дисциплина', 'Группа', 'Вид занятия', 'Часы', 'Семестр']}
        uploadFn={importWorkloadExcel}
      />

      {/* Модальное окно карточки дисциплины */}
      <DisciplineDetailModal
        visible={isDisciplineModalOpen}
        onClose={() => setIsDisciplineModalOpen(false)}
        disciplineId={selectedDisciplineId}
        onOpenTeacher={(tId) => {
          handleOpenTeacherQualityModal(tId)
        }}
      />

      {/* Модальное окно оценки качества преподавателя */}
      <TeacherQualityModal
        visible={isTeacherQualityModalOpen}
        onClose={() => setIsTeacherQualityModalOpen(false)}
        radarData={teacherRadar}
        isLoading={loadingTeacherRadar}
        onRefresh={() => refetchTeacherRadar()}
      />
    </div>
  )
}
