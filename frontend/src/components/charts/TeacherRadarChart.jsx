import React from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

export function TeacherRadarChart({ radarData, height = 300 }) {
  if (!radarData || radarData.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: '13px',
        }}
      >
        Нет данных для построения радара компетенций
      </div>
    )
  }

  // Format data for Recharts Radar
  const chartData = radarData.map((item) => ({
    subject: item.label || item.category,
    score: item.score || 0,
    fullMark: item.max_score || 5.0,
    pct: item.rate_pct || Math.round(((item.score - 1) / 4) * 100),
  }))

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            padding: '8px 12px',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            fontSize: '12px',
          }}
        >
          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
            {data.subject}
          </div>
          <div style={{ color: '#1a56db', fontWeight: 600 }}>
            Средний балл: {data.score} / {data.fullMark}
          </div>
          <div style={{ color: '#64748b' }}>
            Удовлетворенность: {data.pct}%
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 5]}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickCount={6}
          />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            name="Оценка студентов"
            dataKey="score"
            stroke="#1a56db"
            fill="#3b82f6"
            fillOpacity={0.4}
            dot={{ r: 4, fill: '#1a56db', strokeWidth: 1 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
