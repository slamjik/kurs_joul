import React from 'react'
import { Modal, Tag, Typography, Table, Card, Button, Spin, Empty, Space } from 'antd'
import {
  GraduationCap,
  Mail,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Award,
  Layers,
  User,
} from 'lucide-react'

const { Title, Text } = Typography

export function StudentProfileModal({ visible, onClose, studentData, isLoading }) {
  if (!studentData && isLoading) {
    return (
      <Modal open={visible} onCancel={onClose} footer={null} width={750}>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#64748b' }}>Загрузка профиля студента...</div>
        </div>
      </Modal>
    )
  }

  if (!studentData) return null

  const avgNum = Number(studentData.avg_grade || 0)
  const isRisk = studentData.is_risk
  const gpaColor = isRisk ? '#dc2626' : avgNum >= 4.5 ? '#15803d' : avgNum >= 3.5 ? '#1a56db' : '#d97706'

  const columns = [
    {
      title: 'Дисциплина',
      dataIndex: 'discipline_name',
      key: 'discipline_name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Семестр',
      dataIndex: 'semester',
      key: 'semester',
      width: 100,
      align: 'center',
      render: (sem) => <Tag color="blue">{sem || '—'}</Tag>,
    },
    {
      title: 'Оценка',
      dataIndex: 'grade',
      key: 'grade',
      width: 120,
      align: 'center',
      render: (val) => {
        const num = Number(val || 0)
        let color = 'default'
        let label = `${num.toFixed(1)}`

        if (num >= 4.5) {
          color = 'green'
          label += ' (Отл)'
        } else if (num >= 3.5) {
          color = 'blue'
          label += ' (Хор)'
        } else if (num >= 2.5) {
          color = 'gold'
          label += ' (Удов)'
        } else {
          color = 'red'
          label += ' (Неуд)'
        }

        return <Tag color={color} style={{ fontWeight: 600 }}>{label}</Tag>
      },
    },
    {
      title: 'Преподаватель',
      dataIndex: 'teacher_name',
      key: 'teacher_name',
      render: (text) => <span style={{ fontSize: 13, color: '#475569' }}>{text || '—'}</span>,
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (dt) => (dt ? new Date(dt).toLocaleDateString('ru-RU') : '—'),
    },
    {
      title: 'Источник',
      dataIndex: 'source_display',
      key: 'source_display',
      width: 120,
      render: (src, record) => {
        const text = src || record.source || 'Вручную'
        return <Tag color="default" style={{ fontSize: 11 }}>{text}</Tag>
      },
    },
  ]

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Закрыть
        </Button>,
      ]}
      width={840}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GraduationCap size={22} color="#1a56db" />
          <span>Академический профиль студента</span>
        </div>
      }
    >
      <div style={{ maxHeight: 'calc(84vh - 120px)', overflowY: 'auto', paddingRight: 4 }}>
        {/* Карточка личных данных */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
              {studentData.full_name}
            </Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              <Tag color="cyan" style={{ fontSize: 13, padding: '2px 8px' }}>
                Группа {studentData.group_name}
              </Tag>
              {studentData.course && (
                <Tag color="blue">{studentData.course} курс</Tag>
              )}
              {studentData.direction_code && (
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {studentData.direction_code} {studentData.direction_name}
                </span>
              )}
            </div>
            {studentData.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#64748b' }}>
                <Mail size={13} />
                <span>{studentData.email}</span>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: '8px 16px', backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Средний балл</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: gpaColor, lineHeight: 1.2 }}>
                {avgNum > 0 ? avgNum.toFixed(2) : '—'}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>из 5.0</div>
            </div>

            <div>
              {isRisk ? (
                <Tag color="error" style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={14} /> Зона риска
                </Tag>
              ) : avgNum >= 4.5 ? (
                <Tag color="success" style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={14} /> Отличник
                </Tag>
              ) : (
                <Tag color="processing" style={{ fontSize: 12, padding: '4px 10px' }}>
                  Успевает в норме
                </Tag>
              )}
            </div>
          </div>
        </div>

        {/* Задолженности если есть */}
        {studentData.failing_disciplines && studentData.failing_disciplines.length > 0 && (
          <div
            style={{
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#9f1239',
              fontSize: 13,
            }}
          >
            <AlertTriangle size={18} color="#e11d48" />
            <div>
              <strong>Академическая задолженность (оценка 2.0 / неуд):</strong>{' '}
              {studentData.failing_disciplines.join(', ')}
            </div>
          </div>
        )}

        {/* Таблица всех оценок */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
              Учебная карточка (все оценки в системе: {studentData.grades_count || 0})
            </span>
          </div>
          <Table
            dataSource={studentData.grades || []}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
            bordered
            locale={{ emptyText: 'Оценки у данного студента пока не зарегистрированы' }}
          />
        </div>
      </div>
    </Modal>
  )
}
