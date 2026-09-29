import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const COLOR_MAP = {
  'Отлично': '#15803d',          // темно-зеленый
  'Хорошо': '#1a56db',           // синий
  'Удовлетворительно': '#d97706', // янтарный
  'Неудовлетворительно': '#dc2626', // красный
}

const DEFAULT_COLORS = ['#1a56db', '#3b82f6', '#d97706', '#dc2626']

export function QualityPieChart({ data }) {
  if (!data) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>
        Нет данных для построения диаграммы
      </div>
    )
  }

  // Support both object { excellent, good, satisfactory, unsatisfactory } and array [ { label, count } ]
  let items = []
  if (Array.isArray(data)) {
    items = data
  } else if (typeof data === 'object') {
    const total = data.total || (Number(data.excellent || 0) + Number(data.good || 0) + Number(data.satisfactory || 0) + Number(data.unsatisfactory || 0))
    const calcPct = (cnt) => (total > 0 ? Math.round((cnt / total) * 100) : 0)
    items = [
      { name: 'Отлично', value: data.excellent || 0, percent: calcPct(data.excellent || 0), color: '#15803d' },
      { name: 'Хорошо', value: data.good || 0, percent: calcPct(data.good || 0), color: '#1a56db' },
      { name: 'Удовлетворительно', value: data.satisfactory || 0, percent: calcPct(data.satisfactory || 0), color: '#d97706' },
      { name: 'Неудовлетворительно', value: data.unsatisfactory || 0, percent: calcPct(data.unsatisfactory || 0), color: '#dc2626' },
    ]
  }

  if (items.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>
        Нет данных для построения диаграммы
      </div>
    )
  }

  // Formatting data
  const formattedData = items.map((item, idx) => ({
    name: item.label || item.name || `Группа ${idx + 1}`,
    value: item.count !== undefined ? item.count : (item.value ?? 0),
    percent: item.percent !== undefined ? item.percent : item.percentage,
    color: item.color || COLOR_MAP[item.label || item.name] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
  }))

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name, props) => [
              `${value} чел. (${props.payload.percent !== undefined ? `${props.payload.percent}%` : ''})`,
              name,
            ]}
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => <span style={{ fontSize: '12px', color: '#4b5563' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
