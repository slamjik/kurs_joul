import React from 'react'
import { Modal, Tag, Typography, Table, Progress, Button, Spin, Alert, Row, Col, Card, Tooltip } from 'antd'
import {
  BookOpen,
  Users,
  Clock,
  Award,
  GraduationCap,
  Sparkles,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getDisciplineCard } from '../../api/dictionaries'

const { Title, Text, Paragraph } = Typography

export function DisciplineDetailModal({
  visible,
  onClose,
  disciplineId,
  onOpenTeacher,
}) {
  const { data: discipline, isLoading } = useQuery({
    queryKey: ['discipline-card', disciplineId],
    queryFn: () => getDisciplineCard(disciplineId),
    enabled: !!disciplineId && visible,
  })

  if (!visible) return null

  const teacherColumns = [
    {
      title: 'Преподаватель кафедры',
      key: 'teacher',
      render: (_, record) => (
        <div>
          <div
            style={{
              fontWeight: 600,
              color: '#1a56db',
              cursor: onOpenTeacher ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={() => {
              if (onOpenTeacher && record.teacher_id) {
                onOpenTeacher(record.teacher_id)
              }
            }}
            title="Открыть радар качества преподавателя"
          >
            <span>{record.teacher_name}</span>
            {onOpenTeacher && <ExternalLink size={13} color="#1a56db" />}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {record.position || 'Преподаватель'}
          </div>
        </div>
      ),
    },
    {
      title: 'Закрепленные учебные группы',
      dataIndex: 'groups',
      key: 'groups',
      render: (groups) => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {groups && groups.length > 0 ? (
            groups.map((grp) => (
              <Tag color="blue" key={grp} style={{ margin: 0, fontWeight: 500 }}>
                {grp}
              </Tag>
            ))
          ) : (
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Поток не указан</span>
          )}
        </div>
      ),
    },
    {
      title: 'Нагрузка (План / Факт)',
      key: 'hours',
      align: 'center',
      width: 170,
      render: (_, record) => {
        const pct =
          record.hours_plan > 0
            ? Math.round((record.hours_fact / record.hours_plan) * 100)
            : 100
        const isComplete = pct >= 100
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              <strong>{record.hours_fact}</strong> / {record.hours_plan} ч.
            </div>
            <div style={{ marginTop: 4 }}>
              <Progress
                percent={pct}
                size="small"
                status={isComplete ? 'success' : 'active'}
                strokeColor={isComplete ? '#15803d' : '#1a56db'}
              />
            </div>
          </div>
        )
      },
    },
    ...(onOpenTeacher
      ? [
          {
            title: 'Аналитика',
            key: 'action',
            width: 120,
            align: 'center',
            render: (_, record) => (
              <Button
                size="small"
                type="link"
                icon={<Award size={13} />}
                onClick={() => onOpenTeacher(record.teacher_id)}
              >
                Оценка
              </Button>
            ),
          },
        ]
      : []),
  ]

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Закрыть карточку
        </Button>,
      ]}
      width={780}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#e0edff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1a56db',
            }}
          >
            <BookOpen size={20} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              {isLoading ? 'Загрузка дисциплины...' : discipline?.name}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Код: <strong>{discipline?.code || '—'}</strong></span>
              <span>&bull;</span>
              <span>Тип: <strong>{discipline?.lesson_type_display || 'Лекция'}</strong></span>
            </div>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#64748b' }}>Загрузка сведений о дисциплине кафедры...</div>
        </div>
      ) : discipline ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 12 }}>
          {/* Верхняя плашка ключевых показателей */}
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ borderRadius: 8, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Объем курса
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a56db', marginTop: 4 }}>
                  {discipline.total_hours || discipline.hours_plan_total || 0} ч.
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Факт: {discipline.hours_fact_total || 0} ч.
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ borderRadius: 8, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Охват групп
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                  {discipline.groups?.length || 0}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {discipline.groups?.join(', ') || 'Нет групп'}
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ borderRadius: 8, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Средний балл (GPA)
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: discipline.avg_grade >= 4.0 ? '#15803d' : discipline.avg_grade < 3.0 ? '#dc2626' : '#d97706',
                    marginTop: 4,
                  }}
                >
                  {discipline.avg_grade ? discipline.avg_grade.toFixed(2) : '—'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Оценок в базе: {discipline.grades_count || 0}
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ borderRadius: 8, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Оценка студентов
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#15803d', marginTop: 4 }}>
                  {discipline.satisfaction_rate ? `${discipline.satisfaction_rate}%` : '—'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Мониторинг качества
                </div>
              </Card>
            </Col>
          </Row>

          {/* Информационный комментарий */}
          {discipline.teachers?.length > 1 && (
            <Alert
              type="info"
              showIcon
              icon={<Sparkles size={16} color="#1a56db" />}
              message="Распределенное преподавание дисциплины"
              description={`Данную дисциплину на кафедре ведут ${discipline.teachers.length} преподавателя с разделением по потокам и учебным группам.`}
            />
          )}

          {/* Таблица закрепления преподавателей */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
              Закрепленные преподаватели и распределение нагрузки
            </div>
            <Table
              columns={teacherColumns}
              dataSource={discipline.teachers || []}
              rowKey="teacher_id"
              pagination={false}
              size="small"
              bordered
            />
          </div>
        </div>
      ) : (
        <Alert type="warning" message="Сведения о дисциплине не найдены" />
      )}
    </Modal>
  )
}
