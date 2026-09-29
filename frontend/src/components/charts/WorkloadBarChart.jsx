import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export function WorkloadBarChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>
        Нет данных по нагрузке преподавателей
      </div>
    )
  }

  // Format short names for XAxis
  const chartData = data.map((item) => {
    const full = item.teacher_name || 'Не указан'
    const parts = full.split(' ')
    const short = parts.length >= 3
      ? `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`
      : parts.length === 2
      ? `${parts[0]} ${parts[1][0]}.`
      : full

    return {
      ...item,
      shortName: short,
      hours_plan: Number(item.hours_plan || 0),
      hours_fact: Number(item.hours_fact || 0),
    }
  })

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="shortName"
            tick={{ fontSize: 11, fill: '#64748b' }}
            interval={0}
            angle={-15}
            textAnchor="end"
          />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
          <Tooltip
            formatter={(value, name) => [`${value} ч.`, name === 'hours_plan' ? 'План' : 'Факт']}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.teacher_name || label}
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={30}
            formatter={(value) => (
              <span style={{ fontSize: '12px', color: '#4b5563' }}>
                {value === 'hours_plan' ? 'Часов (план)' : 'Часов (факт)'}
              </span>
            )}
          />
          <Bar dataKey="hours_plan" fill="#cbd5e1" radius={[3, 3, 0, 0]} maxBarSize={32} />
          <Bar dataKey="hours_fact" fill="#1a56db" radius={[3, 3, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
