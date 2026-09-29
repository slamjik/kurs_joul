import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select, Button, Space, message, Card, Divider } from 'antd'
import {
  FileSpreadsheet,
  FileText,
  Download,
  CalendarCheck,
  GraduationCap,
  Printer,
} from 'lucide-react'
import {
  downloadWorkloadExcel,
  downloadWorkloadPdf,
  downloadGradesExcel,
  downloadGradesPdf,
} from '../api/reports'
import {
  getTeachers,
  getStudyGroups,
  getDisciplines,
} from '../api/dictionaries'
import styles from './ReportsPage.module.css'

export function ReportsPage() {
  const [params, setParams] = useState({
    academic_year: '2024-2025',
    semester: 1,
    teacher_id: undefined,
    discipline_id: undefined,
    study_group_id: undefined,
  })

  const [loadingAction, setLoadingAction] = useState(null)

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: getTeachers,
  })

  const { data: groups = [] } = useQuery({
    queryKey: ['study-groups'],
    queryFn: getStudyGroups,
  })

  const { data: disciplines = [] } = useQuery({
    queryKey: ['disciplines'],
    queryFn: getDisciplines,
  })

  const handleDownload = async (actionType, fn) => {
    setLoadingAction(actionType)
    try {
      await fn(params)
      message.success('Файл успешно сформирован и загружен')
    } catch (err) {
      message.error('Ошибка при формировании отчета')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Центр формирования и экспорта отчетов</h1>
        <span className="text-secondary">
          Генерация официальных ведомостей кафедры ГиСЭН в форматах Microsoft Excel и PDF с корпоративным оформлением
        </span>
      </div>

      {/* Панель параметров */}
      <div className={styles.filtersBar}>
        <span style={{ fontWeight: 600, fontSize: '13px', marginRight: 4 }}>Параметры отчетов:</span>

        <Select
          value={params.academic_year}
          onChange={(v) => setParams((p) => ({ ...p, academic_year: v }))}
          style={{ width: 140 }}
          options={[
            { value: '2024-2025', label: '2024–2025' },
            { value: '2025-2026', label: '2025–2026' },
          ]}
          placeholder="Учебный год"
        />

        <Select
          value={params.semester}
          onChange={(v) => setParams((p) => ({ ...p, semester: v }))}
          style={{ width: 120 }}
          options={[
            { value: 1, label: '1 семестр' },
            { value: 2, label: '2 семестр' },
          ]}
          placeholder="Семестр"
        />

        <Select
          allowClear
          value={params.teacher_id}
          onChange={(v) => setParams((p) => ({ ...p, teacher_id: v }))}
          style={{ width: 220 }}
          placeholder="Преподаватель (все)"
          options={teachers.map((t) => ({
            value: t.id,
            label: t.full_name || `${t.last_name || ''} ${t.first_name || ''}`.trim(),
          }))}
        />

        <Select
          allowClear
          value={params.discipline_id}
          onChange={(v) => setParams((p) => ({ ...p, discipline_id: v }))}
          style={{ width: 200 }}
          placeholder="Дисциплина (все)"
          options={disciplines.map((d) => ({
            value: d.id,
            label: d.name,
          }))}
        />

        <Select
          allowClear
          value={params.study_group_id}
          onChange={(v) => setParams((p) => ({ ...p, study_group_id: v }))}
          style={{ width: 160 }}
          placeholder="Группа (все)"
          options={groups.map((g) => ({
            value: g.id,
            label: g.name,
          }))}
        />
      </div>

      {/* Сетка доступных отчетов */}
      <div className={styles.reportsGrid}>
        {/* Карточка 1: Нагрузка */}
        <div className={styles.reportCard}>
          <div>
            <div className={styles.reportHeader}>
              <div className={styles.reportIcon}>
                <CalendarCheck size={24} />
              </div>
              <div>
                <h2 className={styles.reportTitle}>Отчет по учебной нагрузке</h2>
                <span className="text-muted" style={{ fontSize: '12px' }}>
                  Форма кафедры • Семестровый срез
                </span>
              </div>
            </div>

            <p className={styles.reportDescription}>
              Сводная ведомость распределения учебной нагрузки преподавателей кафедры:
              лекции, практики, лабораторные работы с расчетом плановых и фактически
              отработанных академических часов и итоговых процентов выполнения.
            </p>
          </div>

          <div className={styles.reportActions}>
            <Button
              type="primary"
              icon={<FileSpreadsheet size={15} />}
              loading={loadingAction === 'workload-excel'}
              onClick={() => handleDownload('workload-excel', downloadWorkloadExcel)}
            >
              Скачать Excel (.xlsx)
            </Button>

            <Button
              icon={<FileText size={15} />}
              loading={loadingAction === 'workload-pdf'}
              onClick={() => handleDownload('workload-pdf', downloadWorkloadPdf)}
            >
              Скачать PDF
            </Button>
          </div>
        </div>

        {/* Карточка 2: Успеваемость */}
        <div className={styles.reportCard}>
          <div>
            <div className={styles.reportHeader}>
              <div className={styles.reportIcon} style={{ background: '#fef3c7', color: '#b45309' }}>
                <GraduationCap size={24} />
              </div>
              <div>
                <h2 className={styles.reportTitle}>Отчет по академической успеваемости</h2>
                <span className="text-muted" style={{ fontSize: '12px' }}>
                  Форма контроля качества • Аттестационная ведомость
                </span>
              </div>
            </div>

            <p className={styles.reportDescription}>
              Итоговая ведомость мониторинга качества образования: средние баллы студентов,
              распределение качественной успеваемости («отлично», «хорошо», «удовл.») и
              выделенный список студентов группы риска (средний балл &lt; 3.0).
            </p>
          </div>

          <div className={styles.reportActions}>
            <Button
              type="primary"
              icon={<FileSpreadsheet size={15} />}
              loading={loadingAction === 'grades-excel'}
              onClick={() => handleDownload('grades-excel', downloadGradesExcel)}
            >
              Скачать Excel (.xlsx)
            </Button>

            <Button
              icon={<FileText size={15} />}
              loading={loadingAction === 'grades-pdf'}
              onClick={() => handleDownload('grades-pdf', downloadGradesPdf)}
            >
              Скачать PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
