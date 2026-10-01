import React, { useState, useEffect } from 'react'
import {
  Card,
  Typography,
  Rate,
  Input,
  Button,
  Select,
  Alert,
  message,
  Steps,
  Result,
  Divider,
  Tag,
  Spin,
} from 'antd'
import {
  CheckCircle2,
  Lock,
  Star,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  Building2,
  Send,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSurveyAssignments, submitSurveyResponse } from '../api/surveys'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input

export function StudentSurveyPage() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submissionHash, setSubmissionHash] = useState('')

  // State for question answers: { [questionId]: { score: number, text_response: string } }
  const [answers, setAnswers] = useState({})

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getSurveyAssignments({ is_open: true })
        const items = Array.isArray(data) ? data : (data?.results || [])
        setAssignments(items)
        if (items.length > 0) {
          setSelectedAssignmentId(items[0].id)
        }
      } catch (err) {
        message.error('Не удалось загрузить доступные опросы')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const selectedAssignment = Array.isArray(assignments)
    ? assignments.find((a) => a.id === selectedAssignmentId)
    : null
  const questions = selectedAssignment?.template?.questions || []

  const handleScoreChange = (qId, score) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], question_id: qId, score },
    }))
  }

  const handleTextChange = (qId, text) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], question_id: qId, text_response: text },
    }))
  }

  const handleSubmit = async () => {
    if (!selectedAssignmentId) {
      message.warning('Пожалуйста, выберите дисциплину и преподавателя')
      return
    }

    // Verify all score questions are answered
    const scoreQuestions = questions.filter((q) => q.question_type === 'score_5')
    for (const q of scoreQuestions) {
      if (!answers[q.id]?.score) {
        message.warning(`Пожалуйста, поставьте оценку на вопрос: «${q.text}»`)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payloadAnswers = Object.values(answers).map((a) => ({
        question_id: a.question_id,
        score: a.score || null,
        text_response: a.text_response || '',
      }))

      const res = await submitSurveyResponse({
        assignment_id: selectedAssignmentId,
        answers: payloadAnswers,
      })

      setSubmissionHash(res.session_token || 'OK')
      setIsSubmitted(true)
      message.success('Спасибо! Ваш анонимный отзыв учтен.')
    } catch (err) {
      message.error(err.response?.data?.detail || 'Ошибка при отправке ответов')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Spin size="large" />
        <div style={{ color: '#64748b', fontSize: 14 }}>Загрузка анкеты качества обучения...</div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div style={{ maxWidth: 650, margin: '60px auto', padding: '0 20px' }}>
        <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
          <Result
            status="success"
            title="Спасибо за участие в оценке качества!"
            subTitle={
              <div>
                Ваши ответы были сохранены полностью анонимно.
                <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                  Токен криптографической сессии: <code>{submissionHash.slice(0, 16)}...</code>
                </div>
              </div>
            }
            extra={[
              <Button
                type="primary"
                key="again"
                onClick={() => {
                  setAnswers({})
                  setIsSubmitted(false)
                }}
              >
                Оценить другого преподавателя
              </Button>,
              <Button key="back" onClick={() => navigate('/dashboard')}>
                Вернуться на платформу
              </Button>,
            ]}
          />
        </Card>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 840, margin: '30px auto', padding: '0 20px' }}>
      {/* Navigation bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          Назад
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803d', fontSize: 13, fontWeight: 500 }}>
          <Lock size={14} /> Строгая анонимность гарантирована
        </div>
      </div>

      <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
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
          <div style={{ flex: 1 }}>
            <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
              Оценка качества преподавания
            </Title>
            <Paragraph style={{ margin: '6px 0 0 0', color: '#64748b' }}>
              Новотроицкий филиал НИТУ МИСИС &bull; Мониторинг образовательного процесса
            </Paragraph>
          </div>
        </div>

        <Alert
          style={{ marginTop: 16 }}
          type="info"
          showIcon
          icon={<Lock size={16} />}
          message="Безопасность и анонимность"
          description="Ваши ответы не привязываются к вашему имени, логину или студенческому билету. Результаты используются исключительно в обобщенном виде для совершенствования образовательных программ филиала."
        />

        <Divider />

        {/* Выбор дисциплины и преподавателя */}
        <div style={{ marginBottom: 24 }}>
          <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
            Выберите оцениваемого преподавателя и дисциплину:
          </Text>
          <Select
            style={{ width: '100%' }}
            size="large"
            placeholder="Выберите дисциплину и преподавателя"
            value={selectedAssignmentId}
            onChange={(val) => {
              setSelectedAssignmentId(val)
              setAnswers({})
            }}
            options={assignments.map((a) => ({
              value: a.id,
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <strong>{a.teacher_name}</strong> &bull; {a.discipline_name}
                  </span>
                  <Tag color="blue">{a.group_name}</Tag>
                </div>
              ),
            }))}
          />
        </div>

        {selectedAssignment && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              marginBottom: 24,
              display: 'flex',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Кафедра:</Text>
              <div style={{ fontWeight: 600 }}>{selectedAssignment.department_name}</div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Учебная группа:</Text>
              <div style={{ fontWeight: 600 }}>{selectedAssignment.group_name}</div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Семестр:</Text>
              <div style={{ fontWeight: 600 }}>{selectedAssignment.template?.semester}</div>
            </div>
          </div>
        )}

        {/* Вопросы анкеты */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {questions.map((q, idx) => (
            <Card
              key={q.id}
              size="small"
              style={{
                borderRadius: 8,
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
                  {idx + 1}. {q.text}
                </Text>
                {q.category_display && (
                  <Tag color="cyan" style={{ fontSize: 11 }}>
                    {q.category_display}
                  </Tag>
                )}
              </div>

              {q.question_type === 'score_5' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                  <Rate
                    value={answers[q.id]?.score || 0}
                    onChange={(val) => handleScoreChange(q.id, val)}
                    style={{ fontSize: 24 }}
                  />
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {answers[q.id]?.score
                      ? `${answers[q.id].score} из 5 баллов`
                      : 'Нажмите для оценки (1 — очень плохо, 5 — отлично)'}
                  </Text>
                </div>
              ) : (
                <TextArea
                  rows={3}
                  placeholder="Ваши конструктивные предложения, замечания по ведению занятий..."
                  value={answers[q.id]?.text_response || ''}
                  onChange={(e) => handleTextChange(q.id, e.target.value)}
                  style={{ marginTop: 8 }}
                />
              )}
            </Card>
          ))}
        </div>

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button size="large" onClick={() => navigate(-1)}>
            Отмена
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<Send size={16} />}
            loading={isSubmitting}
            onClick={handleSubmit}
            style={{ backgroundColor: '#15803d', borderColor: '#15803d' }}
          >
            Отправить анонимно
          </Button>
        </div>
      </Card>
    </div>
  )
}
