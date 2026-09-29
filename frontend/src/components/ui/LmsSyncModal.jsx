import React, { useState, useEffect } from 'react'
import { Modal, Button, Alert, Descriptions, Tag, Space, message, Spin } from 'antd'
import { RefreshCw, Server, CheckCircle2, AlertTriangle } from 'lucide-react'
import { getLMSStatus, importGradesLMS } from '../../api/grades'

export function LmsSyncModal({ open, onClose, onSuccess }) {
  const [status, setStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (open) {
      loadStatus()
      setResult(null)
    }
  }, [open])

  const loadStatus = async () => {
    setLoadingStatus(true)
    try {
      const data = await getLMSStatus()
      setStatus(data)
    } catch (err) {
      message.error('Не удалось получить статус подключения к LMS')
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setResult(null)
    try {
      const res = await importGradesLMS({})
      setResult(res)
      message.success('Синхронизация с LMS Moodle выполнена успешно!')
      if (onSuccess) onSuccess(res)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Ошибка синхронизации с LMS'
      message.error(msg)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Server size={18} color="var(--color-primary)" />
          <span>Интеграция с LMS Moodle</span>
        </div>
      }
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Закрыть
        </Button>,
        <Button
          key="sync"
          type="primary"
          icon={<RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />}
          loading={syncing}
          onClick={handleSync}
        >
          Синхронизировать оценки
        </Button>,
      ]}
      width={560}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <p className="text-secondary" style={{ marginBottom: 12 }}>
          Модуль интеграции с университетской платформой электронного обучения (LMS Moodle).
          Загружает и сопоставляет актуальные баллы и итоговые оценки студентов.
        </p>

        {loadingStatus ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin size="small" />
          </div>
        ) : status ? (
          <Descriptions size="small" bordered column={1}>
            <Descriptions.Item label="Статус шлюза">
              {status.is_connected ? (
                <Tag color="success" icon={<CheckCircle2 size={12} style={{ marginRight: 4 }} />}>
                  Подключено (Онлайн)
                </Tag>
              ) : (
                <Tag color="error">Недоступно</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Тип адаптера">
              <Tag color="blue">{status.adapter_type || 'Moodle REST API'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="URL платформы">
              <code>{status.lms_url || 'https://moodle.misis.ru/webservice/rest/server.php'}</code>
            </Descriptions.Item>
            {status.last_sync_time && (
              <Descriptions.Item label="Последняя синхронизация">
                {new Date(status.last_sync_time).toLocaleString('ru-RU')}
              </Descriptions.Item>
            )}
          </Descriptions>
        ) : null}
      </div>

      {result && (
        <div style={{ marginTop: 16 }}>
          <Alert
            message="Результаты синхронизации"
            description={
              <div>
                <div>Добавлено новых оценок: <strong>{result.imported_count || 0}</strong></div>
                <div>Обновлено существующих: <strong>{result.updated_count || 0}</strong></div>
                <div>Пропущено без изменений: <strong>{result.skipped_count || 0}</strong></div>
                {result.errors && result.errors.length > 0 && (
                  <div style={{ color: 'var(--color-danger)', marginTop: 4 }}>
                    Ошибок при обработке: {result.errors.length}
                  </div>
                )}
              </div>
            }
            type={result.errors && result.errors.length > 0 ? 'warning' : 'success'}
            showIcon
          />
        </div>
      )}
    </Modal>
  )
}
