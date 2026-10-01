import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  Typography,
  Button,
  Tag,
  Table,
  Progress,
  Radio,
  Space,
  Spin,
  Alert,
  Tooltip,
  Badge,
} from 'antd'
import {
  Award,
  Sparkles,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  ExternalLink,
  RefreshCw,
  Eye,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  getBranchKpi,
  getDepartmentTeachersQuality,
  getTeacherRadarAnalytics,
} from '../api/surveys'
import { TeacherQualityModal } from '../components/surveys/TeacherQualityModal'

const { Title, Text, Paragraph } = Typography

export function QualityPage() {
  const navigate = useNavigate()
  const [selectedDeptId, setSelectedDeptId] = useState(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 1. Сводный показатель филиала
  const {
    data: branchKpi,
    isLoading: loadingKpi,
    refetch: refetchKpi,
  } = useQuery({
    queryKey: ['surveys-branch-kpi'],
    queryFn: () => getBranchKpi({ semester: '2024-1' }),
  })

  // 2. Список преподавателей кафедры
  const {
    data: teachersQuality,
    isLoading: loadingTeachers,
    refetch: refetchTeachers,
  } = useQuery({
    queryKey: ['surveys-dept-teachers', selectedDeptId],
    queryFn: () => getDepartmentTeachersQuality({ department: selectedDeptId, semester: '2024-1' }),
  })

  // 3. Данные радара выбранного преподавателя
  const {
    data: teacherRadar,
    isLoading: loadingRadar,
    refetch: refetchRadar,
  } = useQuery({
    queryKey: ['surveys-teacher-radar', selectedTeacherId],
    queryFn: () => getTeacherRadarAnalytics({ teacher: selectedTeacherId, semester: '2024-1' }),
    enabled: !!selectedTeacherId,
  })

  const handleOpenTeacherModal = (teacherId) => {
    setSelectedTeacherId(teacherId)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const columns = [
    {
      title: 'Преподаватель',
      dataIndex: 'teacher_name',
      key: 'teacher_name',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{name}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {record.position} &bull; <Tag color="blue">{record.department_code}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Удовлетворенность',
      dataIndex: 'satisfaction_rate',
      key: 'satisfaction_rate',
      width: 220,
      render: (rate) => {
        const strokeColor = rate >= 80 ? '#15803d' : rate >= 70 ? '#1a56db' : '#d97706'
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ fontWeight: 600, color: strokeColor }}>{rate}%</span>
            </div>
            <Progress
              percent={rate}
              showInfo={false}
              strokeColor={strokeColor}
              size="small"
            />
          </div>
        )
      },
    },
    {
      title: 'Средний балл',
      dataIndex: 'average_score',
      key: 'average_score',
      width: 130,
      align: 'center',
      render: (score) => (
        <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
          {score} <span style={{ fontSize: 11, color: '#94a3b8' }}>/ 5.0</span>
        </span>
      ),
    },
    {
      title: 'Анкет',
      dataIndex: 'responses_count',
      key: 'responses_count',
      width: 90,
      align: 'center',
      render: (cnt) => <Tag color="default">{cnt}</Tag>,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status) => {
        if (status === 'excellent') {
          return <Tag color="success">Высокий рейтинг</Tag>
        }
        if (status === 'good') {
          return <Tag color="processing">В пределах нормы</Tag>
        }
        return <Tag color="warning">Требует внимания</Tag>
      },
    },
    {
      title: 'Рекомендации',
      dataIndex: 'recommendations_count',
      key: 'recommendations_count',
      width: 130,
      align: 'center',
      render: (cnt) =>
        cnt > 0 ? (
          <Badge count={cnt} style={{ backgroundColor: '#1a56db' }} />
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 170,
      align: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<Eye size={14} />}
          onClick={() => handleOpenTeacherModal(record.teacher_id)}
        >
          Радар и отзывы
        </Button>
      ),
    },
  ]

  const branchRate = branchKpi?.branch_satisfaction_rate || 73.4

  return (
    <div style={{ padding: '4px 0 24px 0' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0, color: '#0f172a' }}>
            Мониторинг качества образования
          </Title>
          <Paragraph style={{ margin: '4px 0 0 0', color: '#64748b' }}>
            Оценка удовлетворенности студентов, аналитика компетенций и методические рекомендации
          </Paragraph>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            type="primary"
            icon={<ExternalLink size={16} />}
            onClick={() => navigate('/survey')}
            style={{ backgroundColor: '#15803d', borderColor: '#15803d' }}
          >
            Пройти опрос как студент
          </Button>
          <Button
            icon={<RefreshCw size={16} />}
            onClick={() => {
              refetchKpi()
              refetchTeachers()
            }}
          >
            Обновить
          </Button>
        </div>
      </div>

      {/* Верхнеуровневый Баннер KPI Филиала */}
      <Card
        style={{
          borderRadius: 12,
          marginBottom: 24,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1a56db 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 20px -2px rgba(26, 86, 219, 0.25)',
          border: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#bfdbfe', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <Building2 size={16} />
              {branchKpi?.branch_title || 'Новотроицкий филиал НИТУ МИСИС'}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: '#ffffff' }}>
              Индекс удовлетворенности обучением в филиале
            </div>
            <div style={{ color: '#e0e7ff', marginTop: 4, fontSize: 13 }}>
              Семестр: <strong>{branchKpi?.semester || '2024-1 (Осень)'}</strong> &bull; На основе анонимных анкет обучающихся
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              padding: '16px 24px',
              borderRadius: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: '#bfdbfe' }}>Сводный показатель</div>
              <div style={{ fontSize: 38, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
                {branchRate}%
              </div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 20 }}>
              <div style={{ fontSize: 12, color: '#bfdbfe' }}>Всего анкет</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ffffff' }}>
                {branchKpi?.total_answers_count || 350}+
              </div>
              <div style={{ fontSize: 11, color: '#93c5fd' }}>
                Преподавателей: {branchKpi?.evaluated_teachers_count || 12}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Интерактивный блок выбора кафедр и таблица */}
      <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Рейтинг кафедр и преподавателей
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Выберите кафедру для просмотра детализированного среза качества
            </Text>
          </div>

          {/* Интерактивные кнопки/переключатели кафедр */}
          <Radio.Group
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value={null}>
              Все кафедры филиала
            </Radio.Button>
            {(branchKpi?.departments || []).map((d) => (
              <Radio.Button key={d.department_id} value={d.department_id}>
                {d.department_code} ({d.satisfaction_rate}%)
              </Radio.Button>
            ))}
          </Radio.Group>
        </div>

        <Table
          dataSource={teachersQuality?.teachers || []}
          columns={columns}
          rowKey="teacher_id"
          loading={loadingTeachers}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: 'Нет данных по преподавателям выбранной кафедры' }}
        />
      </Card>

      {/* Модальное окно с лепестковой диаграммой и отзывами */}
      <TeacherQualityModal
        visible={isModalOpen}
        onClose={handleCloseModal}
        radarData={teacherRadar}
        isLoading={loadingRadar}
        onRefresh={() => {
          refetchRadar()
          refetchTeachers()
        }}
      />
    </div>
  )
}
