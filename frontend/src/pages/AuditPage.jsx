import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Tag, Modal, Button, Input, Select, Space, Descriptions } from 'antd'
import { ShieldAlert, Search, Eye, Filter } from 'lucide-react'
import { getAuditLogs } from '../api/dictionaries'

const ACTION_COLORS = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  login: 'purple',
}

const ACTION_LABELS = {
  create: 'Создание',
  update: 'Изменение',
  delete: 'Удаление',
  login: 'Вход в систему',
}

export function AuditPage() {
  const [filters, setFilters] = useState({
    action: undefined,
    table_name: undefined,
    search: '',
  })

  const [detailsRecord, setDetailsRecord] = useState(null)

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => getAuditLogs(filters),
  })

  const columns = [
    {
      title: 'Дата и время',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 170,
      render: (val) => (val ? new Date(val).toLocaleString('ru-RU') : '—'),
    },
    {
      title: 'Пользователь',
      dataIndex: 'user_username',
      key: 'user_username',
      width: 160,
      render: (text, record) => (
        <div>
          <strong>{text || record.user?.username || 'Система'}</strong>
          {record.user?.role && (
            <div className="text-muted" style={{ fontSize: '11px' }}>
              {record.user.role}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Действие',
      dataIndex: 'action',
      key: 'action',
      width: 130,
      render: (act) => {
        const color = ACTION_COLORS[act?.toLowerCase()] || 'default'
        const label = ACTION_LABELS[act?.toLowerCase()] || act
        return <Tag color={color}>{label}</Tag>
      },
    },
    {
      title: 'Сущность',
      dataIndex: 'table_name',
      key: 'table_name',
      width: 140,
      render: (tbl) => <code>{tbl || '—'}</code>,
    },
    {
      title: 'ID объекта',
      dataIndex: 'object_id',
      key: 'object_id',
      width: 110,
    },
    {
      title: 'IP-адрес',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 130,
      render: (ip) => <span className="text-secondary">{ip || '—'}</span>,
    },
    {
      title: 'Снимок изменений',
      key: 'details',
      width: 110,
      align: 'center',
      render: (_, record) => (
        <Button
          size="small"
          icon={<Eye size={13} />}
          onClick={() => setDetailsRecord(record)}
        >
          Детали
        </Button>
      ),
    },
  ]

  const dataSource = Array.isArray(auditData)
    ? auditData
    : auditData?.results || []

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: 4 }}>Журнал аудита системы</h1>
        <span className="text-secondary">
          Фиксация всех значимых действий пользователей, изменений учебной нагрузки и оценок в соответствии с требованиями безопасности
        </span>
      </div>

      {/* Панель фильтров */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <Select
          allowClear
          value={filters.action}
          onChange={(v) => setFilters((f) => ({ ...f, action: v }))}
          style={{ width: 170 }}
          placeholder="Все действия"
          options={[
            { value: 'create', label: 'Создание' },
            { value: 'update', label: 'Изменение' },
            { value: 'delete', label: 'Удаление' },
          ]}
        />

        <Select
          allowClear
          value={filters.table_name}
          onChange={(v) => setFilters((f) => ({ ...f, table_name: v }))}
          style={{ width: 180 }}
          placeholder="Все таблицы"
          options={[
            { value: 'workload', label: 'Учебная нагрузка' },
            { value: 'grade', label: 'Оценки' },
            { value: 'student', label: 'Студенты' },
            { value: 'user', label: 'Пользователи' },
          ]}
        />

        {(filters.action || filters.table_name) && (
          <Button
            type="link"
            size="small"
            onClick={() => setFilters({ action: undefined, table_name: undefined, search: '' })}
          >
            Сбросить фильтры
          </Button>
        )}
      </div>

      {/* Таблица аудита */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={isLoading}
          size="middle"
          pagination={{
            pageSize: 20,
            showTotal: (total) => `Всего записей в журнале: ${total}`,
          }}
          bordered
        />
      </div>

      {/* Модальное окно просмотра изменений */}
      <Modal
        open={!!detailsRecord}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={18} color="var(--color-primary)" />
            <span>Детали записи аудита #{detailsRecord?.id}</span>
          </div>
        }
        onCancel={() => setDetailsRecord(null)}
        footer={[
          <Button key="close" onClick={() => setDetailsRecord(null)}>
            Закрыть
          </Button>,
        ]}
        width={700}
      >
        {detailsRecord && (
          <div>
            <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Пользователь">
                {detailsRecord.user_username || detailsRecord.user?.username || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Действие">
                <Tag color={ACTION_COLORS[detailsRecord.action?.toLowerCase()]}>
                  {ACTION_LABELS[detailsRecord.action?.toLowerCase()] || detailsRecord.action}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Таблица">
                <code>{detailsRecord.table_name}</code>
              </Descriptions.Item>
              <Descriptions.Item label="ID объекта">
                {detailsRecord.object_id}
              </Descriptions.Item>
              <Descriptions.Item label="Дата и время" span={2}>
                {new Date(detailsRecord.timestamp).toLocaleString('ru-RU')}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <strong style={{ fontSize: '12px' }}>Предыдущее состояние (Old):</strong>
                <pre
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 4,
                    padding: 8,
                    fontSize: '11px',
                    maxHeight: 220,
                    overflowY: 'auto',
                    marginTop: 6,
                  }}
                >
                  {detailsRecord.old_values
                    ? JSON.stringify(detailsRecord.old_values, null, 2)
                    : '— (нет данных)'}
                </pre>
              </div>

              <div>
                <strong style={{ fontSize: '12px' }}>Новое состояние (New):</strong>
                <pre
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 4,
                    padding: 8,
                    fontSize: '11px',
                    maxHeight: 220,
                    overflowY: 'auto',
                    marginTop: 6,
                  }}
                >
                  {detailsRecord.new_values
                    ? JSON.stringify(detailsRecord.new_values, null, 2)
                    : '— (нет данных)'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
