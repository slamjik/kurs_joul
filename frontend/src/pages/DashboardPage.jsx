import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Tag, Button, Spin, Empty, Alert, Select } from 'antd'
import {
  Users,
  AlertTriangle,
  Clock,
  Award,
  RefreshCw,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  BookOpen,
  Calendar,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { KpiCard } from '../components/ui/KpiCard'
import { QualityPieChart } from '../components/charts/QualityPieChart'
import { WorkloadBarChart } from '../components/charts/WorkloadBarChart'
import { GradesDynamicsLineChart } from '../components/charts/GradesDynamicsLineChart'
import {
  getKpiSummary,
  getKpiQualityLevels,
  getKpiWorkloadChart,
  getKpiGradesDynamics,
  getKpiDirectionsSummary,
  invalidateKpiCache,
} from '../api/kpi'
import { getBranchKpi } from '../api/surveys'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const {
    data: summary,
    isLoading: loadingSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['kpi-summary'],
    queryFn: getKpiSummary,
  })

  const {
    data: qualityLevels,
    isLoading: loadingQuality,
    refetch: refetchQuality,
  } = useQuery({
    queryKey: ['kpi-quality-levels'],
    queryFn: getKpiQualityLevels,
  })

  const {
    data: workloadChart,
    isLoading: loadingWorkload,
    refetch: refetchWorkload,
  } = useQuery({
    queryKey: ['kpi-workload-chart'],
    queryFn: getKpiWorkloadChart,
  })

  const [dynamicsPeriod, setDynamicsPeriod] = React.useState('all')

  const {
    data: gradesDynamics,
    isLoading: loadingDynamics,
    refetch: refetchDynamics,
  } = useQuery({
    queryKey: ['kpi-grades-dynamics', dynamicsPeriod],
    queryFn: () => getKpiGradesDynamics({ period: dynamicsPeriod }),
  })

  const navigate = useNavigate()

  const {
    data: branchKpi,
    refetch: refetchBranchKpi,
  } = useQuery({
    queryKey: ['surveys-branch-kpi'],
    queryFn: () => getBranchKpi({ semester: '2024-1' }),
  })

  const {
    data: directionsSummary,
    isLoading: loadingDirections,
    refetch: refetchDirections,
  } = useQuery({
    queryKey: ['kpi-directions-summary'],
    queryFn: getKpiDirectionsSummary,
  })

  const handleRefreshAll = async () => {
    try {
      await invalidateKpiCache()
      refetchSummary()
      refetchQuality()
      refetchWorkload()
      refetchDynamics()
      refetchDirections()
      refetchBranchKpi()
    } catch (e) {
      console.error(e)
    }
  }

  const directionColumns = [
    {
      title: 'Код',
      dataIndex: 'direction_code',
      width: 120,
      render: (code) => <Tag color="blue">{code || '—'}</Tag>,
    },
    {
      title: 'Направление подготовки',
      dataIndex: 'direction_name',
      render: (name) => <strong>{name}</strong>,
    },
    {
      title: 'Групп',
      dataIndex: 'groups_count',
      align: 'center',
      width: 90,
    },
    {
      title: 'Студентов',
      dataIndex: 'students_count',
      align: 'center',
      width: 110,
    },
    {
      title: 'Средний балл',
      dataIndex: 'avg_grade',
      align: 'center',
      width: 130,
      render: (val) => {
        const num = Number(val || 0)
        const color = num < 3.0 ? 'red' : num >= 4.0 ? 'green' : 'gold'
        return <Tag color={color}>{num.toFixed(2)}</Tag>
      },
    },
    {
      title: 'Часов нагрузки',
      dataIndex: 'hours_total',
      align: 'right',
      width: 140,
      render: (val) => `${val || 0} ч.`,
    },
  ]

  return (
    <div>
      {/* Заголовок страницы */}
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Главная • Обзор кафедры ГиСЭН</h1>
          <span className="text-secondary">
            Сводные аналитические показатели успеваемости, контингента и выполнения учебной нагрузки
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {summary?.cached_at && (
            <span className={styles.cacheNotice}>
              Срез данных: {new Date(summary.cached_at).toLocaleTimeString('ru-RU')}
            </span>
          )}
          <Button
            icon={<RefreshCw size={14} />}
            onClick={handleRefreshAll}
          >
            Обновить данные
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <KpiCard
          label="Всего студентов"
          value={summary?.total_students}
          subtitle={`Преподавателей кафедры: ${summary?.total_teachers || 3}`}
          icon={Users}
          variant="primary"
        />

        <KpiCard
          label="В зоне риска (< 3.0)"
          value={summary?.risk_students_count ?? summary?.risk_count ?? 0}
          subtitle={
            (summary?.risk_students_count ?? summary?.risk_count ?? 0) > 0
              ? 'Требуется кураторский контроль'
              : 'Отсутствуют задолженности'
          }
          icon={AlertTriangle}
          variant={(summary?.risk_students_count ?? summary?.risk_count ?? 0) > 0 ? 'danger' : 'success'}
        />

        <KpiCard
          label="Учебная нагрузка"
          value={`${summary?.hours_plan_total ?? summary?.total_workload_hours ?? 0} ч.`}
          subtitle={`Закрытие часов: ${summary?.hours_completion_pct ?? summary?.hours_completion ?? 0}%`}
          icon={Clock}
          variant="default"
        />

        <KpiCard
          label="Средний балл кафедры"
          value={summary?.avg_grade ? Number(summary.avg_grade).toFixed(2) : '—'}
          subtitle={`Качественная успеваемость: ${summary?.quality_rate ?? summary?.avg_grade_pct ?? 0}%`}
          icon={Award}
          variant="success"
        />
      </div>

      {/* Сводный индикатор удовлетворенности студентов по филиалу */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1a56db 100%)',
          borderRadius: 10,
          padding: '16px 20px',
          color: '#ffffff',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 4px 12px rgba(26, 86, 219, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            ⭐
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Оценка качества образования &bull; НФ НИТУ МИСИС
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#ffffff' }}>
              Удовлетворенность обучением по филиалу: {branchKpi?.branch_satisfaction_rate || 73.4}%
            </div>
            <div style={{ fontSize: 12, color: '#e0e7ff', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>Кафедра ГиСЭН: <strong>75.8%</strong></span>
              <span>&bull;</span>
              <span>Кафедра экономики: <strong>74.0%</strong></span>
              <span>&bull;</span>
              <span>Ответов студентов: <strong>{branchKpi?.total_answers_count || 350}+</strong></span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            type="primary"
            onClick={() => navigate('/quality')}
            style={{ backgroundColor: '#ffffff', color: '#1a56db', borderColor: '#ffffff', fontWeight: 600 }}
          >
            Радар компетенций кафедры &rarr;
          </Button>
          <Button
            ghost
            onClick={() => navigate('/survey')}
            style={{ borderColor: 'rgba(255,255,255,0.7)', color: '#ffffff' }}
          >
            Анкета студента
          </Button>
        </div>
      </div>

      {/* Row 1: Quality Levels & Workload */}
      <div className={styles.chartsGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PieIcon size={16} color="var(--color-primary)" />
              <span className={styles.cardTitle}>Уровни качества образования</span>
            </div>
            <span className="text-muted" style={{ fontSize: '12px' }}>Текущий семестр</span>
          </div>
          {loadingQuality ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spin />
            </div>
          ) : (
            <QualityPieChart data={qualityLevels} />
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={16} color="var(--color-primary)" />
              <span className={styles.cardTitle}>Нагрузка по преподавателям</span>
            </div>
            <span className="text-muted" style={{ fontSize: '12px' }}>План / Факт (часы)</span>
          </div>
          {loadingWorkload ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spin />
            </div>
          ) : (
            <WorkloadBarChart data={workloadChart} />
          )}
        </div>
      </div>

      {/* Row 2: Dynamics */}
      <div className={styles.fullWidthSection}>
        <div className={styles.card}>
          <div className={styles.cardHeader} style={{ flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="var(--color-primary)" />
              <span className={styles.cardTitle}>Динамика среднего балла успеваемости</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="text-muted" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={13} /> Период измерения:
              </span>
              <Select
                value={dynamicsPeriod}
                onChange={setDynamicsPeriod}
                size="small"
                style={{ width: 230 }}
                options={[
                  { value: 'all', label: 'За всё время (по семестрам)' },
                  { value: 'year_2024_2025', label: '2024–2025 учебный год' },
                  { value: 'year_2023_2024', label: '2023–2024 учебный год' },
                  { value: 'last_year', label: 'Последние 2 семестра' },
                  { value: 'monthly', label: 'Контрольные срезы (по месяцам)' },
                ]}
              />
            </div>
          </div>
          {loadingDynamics ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spin />
            </div>
          ) : (
            <GradesDynamicsLineChart data={gradesDynamics} />
          )}
        </div>
      </div>


      {/* Row 3: Directions Summary Table */}
      <div className={styles.fullWidthSection}>
        <div className={styles.card} style={{ padding: '20px 20px 12px' }}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} color="var(--color-primary)" />
              <span className={styles.cardTitle}>Сводные данные по направлениям подготовки</span>
            </div>
          </div>
          <Table
            columns={directionColumns}
            dataSource={directionsSummary || []}
            rowKey={(r) => r.direction_code || r.direction_name}
            loading={loadingDirections}
            pagination={false}
            size="middle"
            bordered
          />
        </div>
      </div>
    </div>
  )
}
