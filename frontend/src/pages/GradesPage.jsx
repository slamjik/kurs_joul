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
} from 'lucide-react'
import dayjs from 'dayjs'
import {
  getGrades,
  createGrade,
  updateGrade,
  deleteGrade,
  getRiskZoneStudents,
  importGradesExcel,
} from '../api/grades'
import { downloadGradesExcel } from '../api/reports'
import {
  getStudyGroups,
  getDisciplines,
  getStudents,
  getTeachers,
} from '../api/dictionaries'
import { ImportModal } from '../components/ui/ImportModal'
import { LmsSyncModal } from '../components/ui/LmsSyncModal'
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

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [lmsModalOpen, setLmsModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

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
      render: (text, record) => (
        <div>
          <strong>{text || record.student?.full_name || 'Не указан'}</strong>
          {(record.student?.record_book_number || record.student_record_book) && (
            <div className="text-muted" style={{ fontSize: '11px' }}>
              Зач. №{record.student?.record_book_number || record.student_record_book}
            </div>
          )}
        </div>
      ),
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
      render: (text, record) => text || record.discipline?.name || '—',
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
      render: (text, record) => (
        <span className="text-secondary" style={{ fontSize: '12px' }}>
          {text || record.teacher?.full_name || '—'}
        </span>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
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
    </div>
  )
}
