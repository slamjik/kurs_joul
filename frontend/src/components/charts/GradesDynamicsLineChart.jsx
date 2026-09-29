import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

export function GradesDynamicsLineChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>
        Нет данных для отображения динамики успеваемости
      </div>
    )
  }

  const chartData = data.map((item) => ({
    period: item.period || item.semester || item.month || 'Семестр',
    avg_grade: Number(item.avg_grade || item.average || 0),
  }))

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 15, right: 30, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <YAxis
            domain={[2.0, 5.0]}
            ticks={[2.0, 3.0, 4.0, 5.0]}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)} балла`, 'Средний балл']}
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
            }}
          />
          <ReferenceLine
            y={3.0}
            stroke="#dc2626"
            strokeDasharray="4 4"
            label={{
              value: 'Порог риска (3.0)',
              position: 'insideBottomRight',
              fill: '#dc2626',
              fontSize: 11,
              offset: 8,
            }}
          />
          <Line
            type="monotone"
            dataKey="avg_grade"
            stroke="#1a56db"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#1a56db', strokeWidth: 2, stroke: '#ffffff' }}
            activeDot={{ r: 6, fill: '#1648c0' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
