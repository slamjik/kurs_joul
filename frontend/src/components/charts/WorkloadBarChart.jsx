import React, { useState, useMemo } from 'react'
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
import { Radio } from 'antd'

export function WorkloadBarChart({ data = [] }) {
  const [viewMode, setViewMode] = useState('top8') // 'top8' | 'top15' | 'all'

  // Фильтруем преподавателей с ненулевой нагрузкой и сортируем по объему часов
  const activeTeachers = useMemo(() => {
    const valid = (data || []).filter(
      (item) => Number(item.hours_plan || 0) > 0 || Number(item.hours_fact || 0) > 0
    )
    // Сортировка по плановой нагрузке по убыванию
    return valid.sort((a, b) => Number(b.hours_plan || 0) - Number(a.hours_plan || 0))
  }, [data])

  const chartData = useMemo(() => {
    let subset = activeTeachers
    if (viewMode === 'top8') {
      subset = activeTeachers.slice(0, 8)
    } else if (viewMode === 'top15') {
      subset = activeTeachers.slice(0, 15)
    }

    return subset.map((item) => {
      const full = (item.teacher_name || 'Не указан').trim()
      const parts = full.split(/\s+/)
      let short = full
      if (parts.length === 1) {
        short = parts[0]
      } else if (parts.length === 2) {
        // Если уже инициалы, например "Швалева А.С." или "Торшина Е.А."
        if (parts[1].includes('.')) {
          short = `${parts[0]} ${parts[1]}`
        } else {
          short = `${parts[0]} ${parts[1][0]}.`
        }
      } else if (parts.length >= 3) {
        // Если полное ФИО "Иванов Иван Иванович" или "Швалева А. С."
        if (parts[1].includes('.') && parts[2].includes('.')) {
          short = `${parts[0]} ${parts[1]}${parts[2]}`
        } else {
          short = `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`
        }
      }

      return {
        ...item,
        shortName: short,
        fullName: full,
        hours_plan: Number(item.hours_plan || 0),
        hours_fact: Number(item.hours_fact || 0),
      }
    })
  }, [activeTeachers, viewMode])

  if (!activeTeachers || activeTeachers.length === 0) {
    return (
      <div
        style={{
          height: 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: '13px',
        }}
      >
        Нет данных по нагрузке преподавателей
      </div>
    )
  }

  const isWide = chartData.length > 10
  const containerMinWidth = isWide ? chartData.length * 48 : '100%'

  return (
    <div>
      {/* Переключатель количества отображаемых преподавателей */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          fontSize: 12,
        }}
      >
        <span style={{ color: '#64748b' }}>
          Преподавателей с нагрузкой: <strong>{activeTeachers.length}</strong>
        </span>
        <Radio.Group
          size="small"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value="top8">Топ-8</Radio.Button>
          <Radio.Button value="top15">Топ-15</Radio.Button>
          <Radio.Button value="all">Все ({activeTeachers.length})</Radio.Button>
        </Radio.Group>
      </div>

      {/* Контейнер диаграммы со скроллом при большом количестве колонок */}
      <div
        style={{
          width: '100%',
          height: 300,
          overflowX: isWide ? 'auto' : 'hidden',
          overflowY: 'hidden',
          paddingBottom: isWide ? 6 : 0,
        }}
      >
        <div style={{ width: containerMinWidth, height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 16, left: -14, bottom: 48 }}
              barGap={3}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="shortName"
                tick={{ fontSize: 11, fill: '#475569' }}
                interval={0}
                angle={-30}
                textAnchor="end"
                dy={8}
                height={46}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                domain={[0, 'auto']}
              />
              <Tooltip
                formatter={(value, name) => [
                  `${value} ч.`,
                  name === 'hours_plan' ? 'План' : 'Факт',
                ]}
                labelFormatter={(label, payload) =>
                  payload?.[0]?.payload?.fullName || label
                }
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  padding: '8px 12px',
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={26}
                formatter={(value) => (
                  <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>
                    {value === 'hours_plan' ? 'План (ч)' : 'Факт (ч)'}
                  </span>
                )}
              />
              <Bar
                dataKey="hours_plan"
                fill="#cbd5e1"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="hours_fact"
                fill="#1a56db"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
