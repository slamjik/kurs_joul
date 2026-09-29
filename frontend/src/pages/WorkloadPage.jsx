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
import { ImportModal } from '../components/ui/ImportModal'
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
      render: (text, record) => (
        <div>
          <strong>{text || record.teacher?.full_name || 'Не указан'}</strong>
          {record.teacher?.academic_degree && (
            <div className="text-muted" style={{ fontSize: '11px' }}>
              {record.teacher.academic_degree}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Дисциплина',
      dataIndex: 'discipline_name',
      key: 'discipline_name',
      render: (text, record) => text || record.discipline?.name || '—',
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
    </div>
  )
}
