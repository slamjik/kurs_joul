import React, { useState } from 'react'
import { Modal, Tag, Rate, Typography, Tabs, Card, List, Button, Input, Select, message, Spin, Alert, Form } from 'antd'
import {
  Award,
  MessageSquare,
  Sparkles,
  UserCheck,
  Building2,
  Calendar,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { TeacherRadarChart } from '../charts/TeacherRadarChart'
import { createTeacherRecommendation, updateTeacherRecommendation } from '../../api/surveys'
import { useAuthStore } from '../../store/authStore'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

export function TeacherQualityModal({ visible, onClose, radarData, isLoading, onRefresh }) {
  const { user } = useAuthStore()
  const isHeadOrAdmin = user?.role === 'head' || user?.role === 'admin'
  const [form] = Form.useForm()
  const [isSubmittingRec, setIsSubmittingRec] = useState(false)
  const [showAddRecForm, setShowAddRecForm] = useState(false)

  if (!radarData && isLoading) {
    return (
      <Modal open={visible} onCancel={onClose} footer={null} width={800}>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#64748b' }}>Загрузка профиля качества и оценок...</div>
        </div>
      </Modal>
    )
  }

  if (!radarData) {
    return null
  }

  const handleAddRecommendation = async (values) => {
    setIsSubmittingRec(true)
    try {
      await createTeacherRecommendation({
        teacher: radarData.teacher_id,
        category: values.category || '',
        recommendation_text: values.recommendation_text,
        semester: '2024-1',
        source: 'head',
        status: 'published',
      })
      message.success('Рекомендация успешно добавлена и направлена преподавателю')
      form.resetFields()
      setShowAddRecForm(false)
      if (onRefresh) onRefresh()
    } catch (err) {
      message.error(err.response?.data?.detail || 'Не удалось сохранить рекомендацию')
    } finally {
      setIsSubmittingRec(false)
    }
  }

  const handleMarkReviewed = async (recId) => {
    try {
      await updateTeacherRecommendation(recId, { status: 'reviewed' })
      message.success('Статус рекомендации обновлен (принята к сведению)')
      if (onRefresh) onRefresh()
    } catch (err) {
      message.error('Не удалось обновить статус')
    }
  }

  const overallRate = radarData.overall_rate || 75.0
  const rateColor = overallRate >= 80 ? '#15803d' : overallRate >= 70 ? '#1a56db' : '#d97706'

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Закрыть
        </Button>,
      ]}
      width={880}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Award size={22} color="#1a56db" />
          <span>Профиль качества преподавателя: {radarData.teacher_name}</span>
        </div>
      }
    >
      {/* Header Info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          padding: '16px 20px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
            {radarData.teacher_name}
          </Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <Tag color="blue">{radarData.position || 'Преподаватель'}</Tag>
            <Tag color="cyan">
              <Building2 size={12} style={{ marginRight: 4 }} />
              {radarData.department_code}
            </Tag>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Всего анкет: <strong>{radarData.total_responses}</strong>
            </Text>
          </div>
        </div>

        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Индекс удовлетворенности</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: rateColor }}>
              {overallRate}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Средняя оценка</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>{radarData.overall_score}</span>
              <Rate disabled allowHalf value={Number(radarData.overall_score)} style={{ fontSize: 14 }} />
            </div>
          </div>
        </div>
      </div>

      <Tabs
        defaultActiveKey="radar"
        items={[
          {
            key: 'radar',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} /> Лепестковая диаграмма компетенций
              </span>
            ),
            children: (
              <div>
                <Alert
                  type="info"
                  showIcon
                  message="Оценка по 5 ключевым образовательным критериям"
                  description="Диаграмма формируется на основе анонимных анкет обучающихся по дисциплинам текущего семестра."
                  style={{ marginBottom: 16 }}
                />
                <TeacherRadarChart radarData={radarData.radar} height={320} />

                {/* Таблица показателей по категориям */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  {(radarData.radar || []).map((item) => (
                    <Card key={item.category} size="small" style={{ backgroundColor: '#fafbfc' }}>
                      <div style={{ fontSize: 11, color: '#64748b', height: 28, overflow: 'hidden' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#1a56db', marginTop: 4 }}>
                        {item.score} <span style={{ fontSize: 11, color: '#94a3b8' }}>/ 5.0</span>
                      </div>
                      <div style={{ fontSize: 11, color: item.rate_pct >= 75 ? '#15803d' : '#d97706' }}>
                        {item.rate_pct}% удв.
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ),
          },
          {
            key: 'comments',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageSquare size={16} /> Анонимные отзывы студентов ({radarData.comments?.length || 0})
              </span>
            ),
            children: (
              <div>
                <Alert
                  type="success"
                  showIcon
                  message="Строгая анонимность отзывов"
                  description="Все отзывы деперсонализированы в соответствии с протоколом защиты данных обучающихся. Идентификаторы студентов не сохраняются."
                  style={{ marginBottom: 16 }}
                />

                <List
                  dataSource={radarData.comments || []}
                  locale={{ emptyText: 'Студенты пока не оставили текстовых отзывов к данной дисциплине' }}
                  renderItem={(item) => (
                    <Card
                      size="small"
                      style={{
                        marginBottom: 10,
                        borderLeft: '4px solid #1a56db',
                        backgroundColor: '#fcfcfd',
                      }}
                    >
                      <Paragraph style={{ margin: 0, fontSize: 13, color: '#1e293b' }}>
                        «{item.text}»
                      </Paragraph>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: 8,
                          fontSize: 11,
                          color: '#94a3b8',
                        }}
                      >
                        <span>Анонимный отзыв обучающегося</span>
                        <span>{item.date}</span>
                      </div>
                    </Card>
                  )}
                />
              </div>
            ),
          },
          {
            key: 'recommendations',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserCheck size={16} /> Рекомендации и решения ({radarData.recommendations?.length || 0})
              </span>
            ),
            children: (
              <div>
                {isHeadOrAdmin && (
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="dashed"
                      icon={<PlusCircle size={16} />}
                      onClick={() => setShowAddRecForm(!showAddRecForm)}
                    >
                      {showAddRecForm ? 'Отмена' : 'Вынести рекомендацию кафедры'}
                    </Button>
                  </div>
                )}

                {showAddRecForm && (
                  <Card
                    title="Новая рекомендация преподавателю"
                    size="small"
                    style={{ marginBottom: 16, backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}
                  >
                    <Form form={form} layout="vertical" onFinish={handleAddRecommendation}>
                      <Form.Item name="category" label="Критерий / Направление">
                        <Select
                          placeholder="Выберите компетенцию (необязательно)"
                          allowClear
                          options={[
                            { value: 'clarity', label: 'Понятность и структурированность' },
                            { value: 'fairness', label: 'Объективность оценивания' },
                            { value: 'relevance', label: 'Практическая ценность' },
                            { value: 'ethics', label: 'Педагогический такт и этика' },
                            { value: 'facilities', label: 'Условия и организация' },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item
                        name="recommendation_text"
                        label="Текст методической рекомендации или указания"
                        rules={[{ required: true, message: 'Пожалуйста, введите текст рекомендации' }]}
                      >
                        <TextArea rows={3} placeholder="Введите конкретные указания по корректировке учебного процесса..." />
                      </Form.Item>
                      <Button type="primary" htmlType="submit" loading={isSubmittingRec}>
                        Направить преподавателю
                      </Button>
                    </Form>
                  </Card>
                )}

                <List
                  dataSource={radarData.recommendations || []}
                  locale={{ emptyText: 'Рекомендации отсутствуют — показатели в пределах нормы' }}
                  renderItem={(item) => (
                    <Card
                      size="small"
                      style={{
                        marginBottom: 12,
                        borderLeft: item.source === 'auto' ? '4px solid #3b82f6' : '4px solid #8b5cf6',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Tag color={item.source === 'auto' ? 'blue' : 'purple'}>
                            {item.source_label || (item.source === 'auto' ? 'Алгоритм KafIS' : 'Зав. кафедрой')}
                          </Tag>
                          {item.category_label && <Tag color="default">{item.category_label}</Tag>}
                        </div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {item.created_at}
                        </Text>
                      </div>

                      <Paragraph style={{ margin: '8px 0', fontSize: 13, color: '#334155' }}>
                        {item.text}
                      </Paragraph>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        {item.status !== 'reviewed' ? (
                          <Button
                            size="small"
                            type="text"
                            icon={<CheckCircle2 size={14} color="#15803d" />}
                            onClick={() => handleMarkReviewed(item.id)}
                          >
                            Принять к сведению
                          </Button>
                        ) : (
                          <Tag color="success">Принята к сведению</Tag>
                        )}
                      </div>
                    </Card>
                  )}
                />
              </div>
            ),
          },
        ]}
      />
    </Modal>
  )
}
