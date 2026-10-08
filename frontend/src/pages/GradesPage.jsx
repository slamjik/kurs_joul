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
  DatePicker,
  Tabs,
  Card,
  Row,
  Col,
} from 'antd'
import {
  Plus,
  Upload,
  Download,
  Search,
  AlertTriangle,
  Server,
  Edit2,
  Trash2,
  GraduationCap,
  CheckCircle2,
  Sparkles,
  User,
  Users,
  ExternalLink,
  Award,
} from 'lucide-react'
import dayjs from 'dayjs'
import {
  getGrades,
  createGrade,
  updateGrade,
  deleteGrade,
  getRiskZoneStudents,
  importGradesExcel,
  getStudentProfile,
} from '../api/grades'
import { downloadGradesExcel } from '../api/reports'
import {
  getStudyGroups,
  getDisciplines,
  getStudents,
  getTeachers,
} from '../api/dictionaries'
import { getTeacherRadarAnalytics } from '../api/surveys'
import { ImportModal } from '../components/ui/ImportModal'
import { LmsSyncModal } from '../components/ui/LmsSyncModal'
import { StudentProfileModal } from '../components/grades/StudentProfileModal'
import { DisciplineDetailModal } from '../components/workload/DisciplineDetailModal'
import { TeacherQualityModal } from '../components/surveys/TeacherQualityModal'
import { useAuthStore } from '../store/authStore'
import styles from './GradesPage.module.css'

export function GradesPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isHeadOrAdmin = user?.role === 'head' || user?.role === 'admin'

  const [filters, setFilters] = useState({
    semester: 'all',
    discipline: undefined,
    study_group: undefined,
    search: '',
    below_risk_threshold: false,
  })

  // Режим отображения: Журнал оценок vs Реестр студентов кафедры
  const [activeMainTab, setActiveMainTab] = useState('journal')
  const [studentDirFilters, setStudentDirFilters] = useState({
    search: '',
    group: undefined,
    course: undefined,
    status: 'all',
  })

  // Модальные окна для дисциплин и преподавателей
  const [selectedDisciplineId, setSelectedDisciplineId] = useState(null)
  const [isDisciplineModalOpen, setIsDisciplineModalOpen] = useState(false)
  const [selectedTeacherForQuality, setSelectedTeacherForQuality] = useState(null)
  const [isTeacherQualityModalOpen, setIsTeacherQualityModalOpen] = useState(false)

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [lmsModalOpen, setLmsModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  const [form] = Form.useForm()

  // Queries
  const { data: gradesData, isLoading } = useQuery({
    queryKey: ['grades', filters],
    queryFn: () => {
      const params = {}
      if (filters.semester && filters.semester !== 'all') {
        params.semester = filters.semester
      }
      if (filters.study_group) params.group = filters.study_group
      if (filters.discipline) params.discipline = filters.discipline
      if (filters.below_risk_threshold) params.max_grade = 2.99
      return getGrades(params)
    },
  })

  const { data: riskZoneData } = useQuery({
    queryKey: ['risk-zone-students'],
    queryFn: getRiskZoneStudents,
  })

  const { data: groups = [] } = useQuery({
    queryKey: ['study-groups'],
    queryFn: getStudyGroups,
  })

  const { data: disciplines = [] } = useQuery({
    queryKey: ['disciplines'],
    queryFn: getDisciplines,
  })

  const { data: students = [] } = useQuery({
    queryKey: ['students', filters.study_group],
    queryFn: () => getStudents(filters.study_group ? { group: filters.study_group } : {}),
  })

  // Запрос для полного реестра всех студентов кафедры с поддержкой фильтров
  const { data: allStudentsData, isLoading: loadingAllStudents } = useQuery({
    queryKey: ['students-directory', studentDirFilters.group, studentDirFilters.course, studentDirFilters.search],
    queryFn: () => {
      const params = { page_size: 100 }
      if (studentDirFilters.group) params.group = studentDirFilters.group
      if (studentDirFilters.course) params.course = studentDirFilters.course
      if (studentDirFilters.search) params.search = studentDirFilters.search
      return getStudents(params)
    },
  })

  // Аналитический радар преподавателя
  const {
    data: teacherRadar,
    isLoading: loadingTeacherRadar,
    refetch: refetchTeacherRadar,
  } = useQuery({
    queryKey: ['surveys-teacher-radar-grades', selectedTeacherForQuality],
    queryFn: () =>
      getTeacherRadarAnalytics({
        teacher: selectedTeacherForQuality,
        semester: '2024-1',
      }),
    enabled: !!selectedTeacherForQuality && isTeacherQualityModalOpen,
  })

  const { data: studentProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['student-profile', selectedStudentId],
    queryFn: () => getStudentProfile(selectedStudentId),
    enabled: !!selectedStudentId,
  })

  const handleOpenProfile = (studentId) => {
    if (studentId) {
      setSelectedStudentId(studentId)
      setIsProfileModalOpen(true)
    }
  }

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

  // Фильтрация и вычисление статистики для реестра студентов
  const filteredStudentList = React.useMemo(() => {
    let list = Array.isArray(allStudentsData)
      ? allStudentsData
      : allStudentsData?.results || []

    if (studentDirFilters.search) {
      const q = studentDirFilters.search.toLowerCase()
      list = list.filter(
        (s) =>
          (s.full_name && s.full_name.toLowerCase().includes(q)) ||
          (s.record_book_number && s.record_book_number.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q))
      )
    }

    if (studentDirFilters.status === 'risk') {
      list = list.filter((s) => s.is_risk || (s.average_grade > 0 && s.average_grade < 3.0))
    } else if (studentDirFilters.status === 'good') {
      list = list.filter((s) => s.average_grade >= 3.0 && s.average_grade < 4.5)
    } else if (studentDirFilters.status === 'excellent') {
      list = list.filter((s) => s.average_grade >= 4.5)
    }

    return list
  }, [allStudentsData, studentDirFilters])

  const allStudentsRaw = Array.isArray(allStudentsData)
    ? allStudentsData
    : allStudentsData?.results || []
  const dirTotalCount = allStudentsRaw.length
  const dirRiskCount = allStudentsRaw.filter((s) => s.is_risk || (s.average_grade > 0 && s.average_grade < 3.0)).length
  const dirExcellentCount = allStudentsRaw.filter((s) => s.average_grade >= 4.5).length
  const dirWithGrades = allStudentsRaw.filter((s) => s.average_grade > 0)
  const dirAvgGpa = dirWithGrades.length > 0
    ? (dirWithGrades.reduce((acc, s) => acc + Number(s.average_grade), 0) / dirWithGrades.length).toFixed(2)
    : '—'

  // Колонки таблицы полного реестра студентов
  const studentDirectoryColumns = [
    {
      title: 'Студент',
      key: 'full_name',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              backgroundColor: '#e0edff',
              color: '#1a56db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {record.full_name?.charAt(0) || 'С'}
          </div>
          <div>
            <div
              style={{
                fontWeight: 600,
                color: '#1a56db',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
              onClick={() => handleOpenProfile(record.id)}
              title="Открыть личное дело и успеваемость студента"
            >
              <span>{record.full_name}</span>
              <ExternalLink size={12} color="#1a56db" />
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
              {record.record_book_number ? `Зач. №${record.record_book_number}` : ''}
              {record.email ? ` • ${record.email}` : ''}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Группа',
      dataIndex: 'group_name',
      key: 'group_name',
      width: 110,
      render: (grp) => <Tag color="blue" style={{ fontWeight: 600 }}>{grp || '—'}</Tag>,
    },
    {
      title: 'Курс',
      dataIndex: 'course',
      key: 'course',
      align: 'center',
      width: 90,
      render: (crs) => (crs ? `${crs} курс` : '—'),
    },
    {
      title: 'Направление подготовки',
      dataIndex: 'direction_name',
      key: 'direction_name',
      render: (text, record) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{text || 'Информатика и ВТ'}</div>
          {record.direction_code && (
            <div style={{ fontSize: 11, color: '#64748b' }}>{record.direction_code}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Средний балл (GPA)',
      dataIndex: 'average_grade',
      key: 'average_grade',
      align: 'center',
      width: 150,
      sorter: (a, b) => (a.average_grade || 0) - (b.average_grade || 0),
      render: (val, record) => {
        const num = Number(val || 0)
        if (num === 0 && !record.grades_count) {
          return <span style={{ color: '#94a3b8', fontSize: 12 }}>Нет оценок</span>
        }
        const color = num >= 4.5 ? 'green' : num >= 3.5 ? 'blue' : num >= 3.0 ? 'gold' : 'red'
        return (
          <div>
            <Tag color={color} style={{ fontWeight: 700, fontSize: 13, padding: '2px 8px' }}>
              {num.toFixed(2)}
            </Tag>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              {record.grades_count} {record.grades_count === 1 ? 'оценка' : 'оценок'}
            </div>
          </div>
        )
      },
    },
    {
      title: 'Статус',
      key: 'status',
      align: 'center',
      width: 140,
      render: (_, record) => {
        const gpa = Number(record.average_grade || 0)
        if (record.is_risk || (gpa > 0 && gpa < 3.0)) {
          return (
            <Tag color="error" icon={<AlertTriangle size={12} style={{ verticalAlign: -1, marginRight: 3 }} />}>
              В зоне риска
            </Tag>
          )
        }
        if (gpa >= 4.5) {
          return (
            <Tag color="success" icon={<Sparkles size={12} style={{ verticalAlign: -1, marginRight: 3 }} />}>
              Отличник
            </Tag>
          )
        }
        if (gpa >= 3.0) {
          return <Tag color="processing">Успевает</Tag>
        }
        return <Tag color="default">Новый студент</Tag>
      },
    },
    {
      title: 'Действие',
      key: 'action',
      align: 'center',
      width: 130,
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<User size={13} />}
          onClick={() => handleOpenProfile(record.id)}
        >
          Личное дело
        </Button>
      ),
    },
  ]

  // Mutations
  const createMutation = useMutation({
    mutationFn: createGrade,
    onSuccess: () => {
      message.success('Оценка успешно внесена')
      queryClient.invalidateQueries(['grades'])
      queryClient.invalidateQueries(['risk-zone-students'])
      queryClient.invalidateQueries(['kpi-summary'])
      handleCloseModal()
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.response?.data?.grade?.[0] || 'Ошибка при сохранении оценки'
      message.error(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateGrade(id, data),
    onSuccess: () => {
      message.success('Оценка обновлена')
      queryClient.invalidateQueries(['grades'])
      queryClient.invalidateQueries(['risk-zone-students'])
      queryClient.invalidateQueries(['kpi-summary'])
      handleCloseModal()
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Ошибка при обновлении оценки'
      message.error(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteGrade,
    onSuccess: () => {
      message.success('Оценка удалена')
      queryClient.invalidateQueries(['grades'])
      queryClient.invalidateQueries(['risk-zone-students'])
      queryClient.invalidateQueries(['kpi-summary'])
    },
    onError: () => message.error('Не удалось удалить оценку'),
  })

  const handleOpenAdd = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({
      academic_year: filters.academic_year || '2024-2025',
      semester_term: filters.semester || 1,
      grade: 4.0,
      control_type: 'exam',
      date: dayjs(),
    })
    setEditModalOpen(true)
  }

  const handleOpenEdit = (record) => {
    setEditingItem(record)
    form.resetFields()
    const semParts = (record.semester || '2024-1').split('-')
    form.setFieldsValue({
      student: record.student?.id || record.student,
      discipline: record.discipline?.id || record.discipline,
      grade: record.grade,
      control_type: record.control_type || 'exam',
      academic_year: `${semParts[0]}-${Number(semParts[0]) + 1}`,
      semester_term: Number(semParts[1]) || 1,
      date: record.date ? dayjs(record.date) : dayjs(),
    })
    setEditModalOpen(true)
  }

  const handleCloseModal = () => {
    setEditModalOpen(false)
    setEditingItem(null)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const semStr = values.semester_term
        ? `${values.academic_year?.split('-')[0] || '2024'}-${values.semester_term}`
        : '2024-1'

      const payload = {
        student: values.student,
        discipline: values.discipline,
        grade: values.grade,
        semester: semStr,
        date: values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        source: 'manual',
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

  const handleExportExcel = () => {
    downloadGradesExcel({
      semester: filters.semester,
      academic_year: filters.academic_year,
      discipline_id: filters.discipline,
      study_group_id: filters.study_group,
    })
  }

  const riskCount = Array.isArray(riskZoneData)
    ? riskZoneData.length
    : riskZoneData?.count || 0

  const columns = [
    {
      title: 'Студент',
      dataIndex: 'student_name',
      key: 'student_name',
      render: (text, record) => {
        const studentId = record.student || record.student_id
        const fullName = text || record.student?.full_name || 'Не указан'
        return (
          <div>
            <div
              style={{
                fontWeight: 600,
                color: studentId ? '#1a56db' : '#0f172a',
                cursor: studentId ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
              onClick={() => handleOpenProfile(studentId)}
              title="Нажмите, чтобы открыть профиль студента"
            >
              <span>{fullName}</span>
            </div>
            {(record.student?.record_book_number || record.student_record_book) && (
              <div className="text-muted" style={{ fontSize: '11px' }}>
                Зач. №{record.student?.record_book_number || record.student_record_book}
              </div>
            )}
          </div>
        )
      },
    },
    {
      title: 'Группа',
      dataIndex: 'group_name',
      key: 'group_name',
      width: 110,
      render: (text, record) => (
        <Tag color="cyan">{text || record.student?.study_group_name || '—'}</Tag>
      ),
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
            title="Открыть карточку дисциплины и закрепленных преподавателей"
          >
            <span>{discName}</span>
            {discId && <ExternalLink size={12} color="#1a56db" />}
          </div>
        )
      },
    },
    {
      title: 'Оценка',
      dataIndex: 'grade',
      key: 'grade',
      width: 100,
      align: 'center',
      render: (val, record) => {
        const num = Number(val ?? record.value ?? 0)
        let color = 'default'
        let text = `${num.toFixed(1)}`

        if (num >= 4.5) {
          color = 'green'
          text += ' (Отл)'
        } else if (num >= 3.5) {
          color = 'blue'
          text += ' (Хор)'
        } else if (num >= 2.5) {
          color = 'gold'
          text += ' (Удов)'
        } else {
          color = 'red'
          text += ' (Неуд)'
        }

        return <Tag color={color} style={{ fontWeight: 600 }}>{text}</Tag>
      },
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (date) => (date ? new Date(date).toLocaleDateString('ru-RU') : '—'),
    },
    {
      title: 'Источник',
      dataIndex: 'source',
      key: 'source',
      width: 140,
      render: (source) => {
        if (source === 'lms') {
          return (
            <Tag color="purple" style={{ fontSize: '11px' }}>
              LMS Moodle
            </Tag>
          )
        }
        if (source === 'excel') {
          return (
            <Tag color="geekblue" style={{ fontSize: '11px' }}>
              Ведомость Excel
            </Tag>
          )
        }
        return (
          <Tag color="default" style={{ fontSize: '11px' }}>
            Ручной ввод
          </Tag>
        )
      },
    },
    {
      title: 'Преподаватель',
      dataIndex: 'teacher_name',
      key: 'teacher_name',
      render: (text, record) => {
        const tId = record.teacher?.id || record.teacher
        const tName = text || record.teacher?.full_name || '—'
        return (
          <div
            style={{
              fontWeight: 500,
              color: tId ? '#1a56db' : '#64748b',
              cursor: tId ? 'pointer' : 'default',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '12px',
            }}
            onClick={() => tId && handleOpenTeacherQualityModal(tId)}
            title="Открыть радар качества преподавателя"
          >
            <span>{tName}</span>
            {tId && <ExternalLink size={11} color="#1a56db" />}
          </div>
        )
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Карточка студента">
            <Button
              type="text"
              size="small"
              icon={<User size={14} color="#15803d" />}
              onClick={() => handleOpenProfile(record.student || record.student_id)}
            />
          </Tooltip>
          <Tooltip title="Редактировать оценку">
            <Button
              type="text"
              size="small"
              icon={<Edit2 size={14} color="#1a56db" />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Удалить запись об оценке?"
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

  const dataSource = Array.isArray(gradesData)
    ? gradesData
    : gradesData?.results || []

  return (
    <div>
      {/* Заголовок страницы */}
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Успеваемость и мониторинг качества</h1>
          <span className="text-secondary">
            Учет текущей и промежуточной аттестации, выявление студентов группы риска и интеграция с LMS Moodle
          </span>
        </div>

        <Space>
          <Button
            icon={<Server size={15} />}
            onClick={() => setLmsModalOpen(true)}
          >
            Синхронизация с LMS
          </Button>

          {isHeadOrAdmin && (
            <Button
              icon={<Upload size={15} />}
              onClick={() => setImportModalOpen(true)}
            >
              Импорт ведомости
            </Button>
          )}

          <Button
            icon={<Download size={15} />}
            onClick={handleExportExcel}
          >
            Экспорт в Excel
          </Button>

          <Button
            type="primary"
            icon={<Plus size={15} />}
            onClick={handleOpenAdd}
          >
            Поставить оценку
          </Button>
        </Space>
      </div>

      {/* Переключение между Журналом оценок и Реестром студентов */}
      <Tabs
        activeKey={activeMainTab}
        onChange={setActiveMainTab}
        type="card"
        style={{ marginTop: 8 }}
        items={[
          {
            key: 'journal',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <GraduationCap size={16} color="#1a56db" /> Журнал аттестаций и оценок
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Баннер зоны риска */}
                {riskCount > 0 && (
                  <div className={styles.riskBanner}>
                    <Alert
                      message={
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertTriangle size={18} color="var(--color-danger)" />
                            <span>
                              Внимание: в группе академического риска (&lt; 3.0 баллов) находится{' '}
                              <strong>{riskCount}</strong> {riskCount === 1 ? 'студент' : 'студентов'}.
                            </span>
                          </div>
                          <Button
                            size="small"
                            danger
                            type={filters.below_risk_threshold ? 'primary' : 'default'}
                            onClick={() =>
                              setFilters((f) => ({ ...f, below_risk_threshold: !f.below_risk_threshold }))
                            }
                          >
                            {filters.below_risk_threshold ? 'Показать все оценки' : 'Показать студентов риска'}
                          </Button>
                        </div>
                      }
                      type="error"
                      showIcon={false}
                    />
                  </div>
                )}

                {/* Панель фильтров журнала */}
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
                    style={{ width: 220 }}
                    placeholder="Все дисциплины"
                    options={disciplines.map((d) => ({
                      value: d.id,
                      label: d.name,
                    }))}
                  />

                  <Input
                    placeholder="Поиск студента..."
                    prefix={<Search size={14} color="#94a3b8" />}
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    style={{ width: 200 }}
                    allowClear
                  />

                  {filters.below_risk_threshold && (
                    <Tag
                      color="red"
                      closable
                      onClose={() => setFilters((f) => ({ ...f, below_risk_threshold: false }))}
                    >
                      Фильтр: Зона риска (&lt; 3.0)
                    </Tag>
                  )}

                  {(filters.semester !== 'all' || filters.study_group || filters.discipline || filters.search || filters.below_risk_threshold) && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() =>
                        setFilters({
                          semester: 'all',
                          discipline: undefined,
                          study_group: undefined,
                          search: '',
                          below_risk_threshold: false,
                        })
                      }
                    >
                      Сбросить фильтры
                    </Button>
                  )}
                </div>

                {/* Таблица оценок */}
                <div className={styles.tableWrapper}>
                  <Table
                    columns={columns}
                    dataSource={dataSource}
                    rowKey="id"
                    loading={isLoading}
                    size="middle"
                    pagination={{
                      pageSize: 20,
                      showTotal: (total) => `Всего записей: ${total}`,
                    }}
                    bordered
                  />
                </div>
              </div>
            ),
          },
          {
            key: 'students',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <Users size={16} color="#1a56db" /> Реестр студентов кафедры ({filteredStudentList.length})
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Карточки аналитической сводки по студентам */}
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ borderRadius: 8, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                        Всего студентов
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1a56db', marginTop: 4 }}>
                        {dirTotalCount}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        Кафедра ГиСЭН
                      </div>
                    </Card>
                  </Col>

                  <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ borderRadius: 8, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                        В группе риска (&lt; 3.0)
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: dirRiskCount > 0 ? '#dc2626' : '#15803d', marginTop: 4 }}>
                        {dirRiskCount}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {dirRiskCount > 0 ? 'Требуется кураторство' : 'Задолженностей нет'}
                      </div>
                    </Card>
                  </Col>

                  <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ borderRadius: 8, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                        Средний балл (GPA)
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#15803d', marginTop: 4 }}>
                        {dirAvgGpa}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        По всем аттестациям
                      </div>
                    </Card>
                  </Col>

                  <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ borderRadius: 8, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                        Отличников (&ge; 4.5)
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1a56db', marginTop: 4 }}>
                        {dirExcellentCount}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        Высокая успеваемость
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* Панель поиска и многокритериальных фильтров по студентам */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <Input
                    placeholder="Поиск по ФИО, зачетке, email..."
                    prefix={<Search size={14} color="#94a3b8" />}
                    value={studentDirFilters.search}
                    onChange={(e) =>
                      setStudentDirFilters((f) => ({ ...f, search: e.target.value }))
                    }
                    style={{ width: 280 }}
                    allowClear
                  />

                  <Select
                    allowClear
                    placeholder="Все учебные группы"
                    value={studentDirFilters.group}
                    onChange={(grpId) =>
                      setStudentDirFilters((f) => ({ ...f, group: grpId }))
                    }
                    style={{ width: 180 }}
                    options={groups.map((g) => ({
                      value: g.id,
                      label: `${g.name} (${g.course} курс)`,
                    }))}
                  />

                  <Select
                    allowClear
                    placeholder="Все курсы"
                    value={studentDirFilters.course}
                    onChange={(c) =>
                      setStudentDirFilters((f) => ({ ...f, course: c }))
                    }
                    style={{ width: 140 }}
                    options={[
                      { value: 1, label: '1 курс' },
                      { value: 2, label: '2 курс' },
                      { value: 3, label: '3 курс' },
                      { value: 4, label: '4 курс' },
                    ]}
                  />

                  <Select
                    value={studentDirFilters.status}
                    onChange={(st) =>
                      setStudentDirFilters((f) => ({ ...f, status: st }))
                    }
                    style={{ width: 190 }}
                    options={[
                      { value: 'all', label: 'Все статусы' },
                      { value: 'risk', label: 'В группе риска (< 3.0)' },
                      { value: 'good', label: 'Успевающие (3.0–4.4)' },
                      { value: 'excellent', label: 'Отличники (≥ 4.5)' },
                    ]}
                  />

                  {(studentDirFilters.search || studentDirFilters.group || studentDirFilters.course || studentDirFilters.status !== 'all') && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() =>
                        setStudentDirFilters({
                          search: '',
                          group: undefined,
                          course: undefined,
                          status: 'all',
                        })
                      }
                    >
                      Сбросить фильтры
                    </Button>
                  )}
                </div>

                {/* Таблица полного реестра студентов */}
                <div className={styles.tableWrapper}>
                  <Table
                    columns={studentDirectoryColumns}
                    dataSource={filteredStudentList}
                    rowKey="id"
                    loading={loadingAllStudents}
                    size="middle"
                    pagination={{
                      pageSize: 15,
                      showTotal: (total) => `Всего студентов: ${total}`,
                    }}
                    bordered
                  />
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* Модальное окно добавления / изменения оценки */}
      <Modal
        open={editModalOpen}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={18} color="var(--color-primary)" />
            <span>{editingItem ? 'Редактировать оценку' : 'Выставить академическую оценку'}</span>
          </div>
        }
        onCancel={handleCloseModal}
        onOk={handleSave}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editingItem ? 'Сохранить' : 'Выставить'}
        cancelText="Отмена"
        width={560}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name="student"
            label="Студент"
            rules={[{ required: true, message: 'Выберите студента' }]}
          >
            <Select
              showSearch
              placeholder="Поиск студента по ФИО"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={students.map((s) => ({
                value: s.id,
                label: `${s.full_name || `${s.last_name || ''} ${s.first_name || ''}`.trim()} (${s.study_group_name || 'Группа не указана'})`,
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item
              name="grade"
              label="Оценка (2.0 – 5.0)"
              rules={[{ required: true, message: 'Укажите балл' }]}
            >
              <InputNumber
                min={2.0}
                max={5.0}
                step={0.1}
                precision={1}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="control_type"
              label="Вид контроля"
              rules={[{ required: true, message: 'Выберите вид' }]}
            >
              <Select
                options={[
                  { value: 'exam', label: 'Экзамен' },
                  { value: 'credit', label: 'Зачет' },
                  { value: 'midterm', label: 'Промежуточная аттестация' },
                  { value: 'current', label: 'Текущий контроль' },
                ]}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="academic_year" label="Учебный год">
              <Select
                options={[
                  { value: '2024-2025', label: '2024-2025' },
                  { value: '2025-2026', label: '2025-2026' },
                ]}
              />
            </Form.Item>

            <Form.Item name="semester_term" label="Семестр">
              <Select
                options={[
                  { value: 1, label: '1 семестр' },
                  { value: 2, label: '2 семестр' },
                ]}
              />
            </Form.Item>

            <Form.Item name="date" label="Дата">
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Модальное окно импорта ведомости Excel */}
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries(['grades'])
          queryClient.invalidateQueries(['risk-zone-students'])
          queryClient.invalidateQueries(['kpi-summary'])
        }}
        title="Импорт экзаменационной ведомости из Excel"
        description="Загрузите файл ведомости с оценками студентов. Система сопоставит студентов по номеру зачетной книжки или ФИО."
        requiredColumns={['ФИО студента', 'Номер зачетной книжки', 'Дисциплина', 'Оценка']}
        uploadFn={importGradesExcel}
      />

      {/* Модальное окно синхронизации с LMS */}
      <LmsSyncModal
        open={lmsModalOpen}
        onClose={() => setLmsModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries(['grades'])
          queryClient.invalidateQueries(['risk-zone-students'])
          queryClient.invalidateQueries(['kpi-summary'])
        }}
      />

      {/* Модальное окно академического профиля студента */}
      <StudentProfileModal
        visible={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        studentData={studentProfile}
        isLoading={loadingProfile}
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
