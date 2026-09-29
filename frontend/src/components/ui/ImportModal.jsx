import React, { useState } from 'react'
import { Modal, Upload, Button, Alert, List, message } from 'antd'
import { Inbox, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'

const { Dragger } = Upload

export function ImportModal({
  open,
  onClose,
  onSuccess,
  title = 'Импорт данных из Excel',
  description = 'Загрузите файл Excel (.xlsx) с актуальными данными',
  requiredColumns = [],
  uploadFn,
}) {
  const [fileList, setFileList] = useState([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  const handleClose = () => {
    setFileList([])
    setResult(null)
    setErrorMsg(null)
    onClose()
  }

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Пожалуйста, выберите файл')
      return
    }

    const formData = new FormData()
    formData.append('file', fileList[0].originFileObj || fileList[0])

    setUploading(true)
    setErrorMsg(null)
    setResult(null)

    try {
      const data = await uploadFn(formData)
      setResult(data)
      message.success(`Импорт завершен успешно! Обработано записей: ${data.imported_count || data.created_count || 0}`)
      if (onSuccess) onSuccess(data)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Ошибка при загрузке и обработке файла'
      setErrorMsg(msg)
    } finally {
      setUploading(false)
    }
  }

  const uploadProps = {
    onRemove: () => {
      setFileList([])
      setResult(null)
      setErrorMsg(null)
    },
    beforeUpload: (file) => {
      const isExcel =
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls')

      if (!isExcel) {
        message.error('Разрешены только файлы Excel (.xlsx, .xls)')
        return Upload.LIST_IGNORE
      }

      setFileList([file])
      setResult(null)
      setErrorMsg(null)
      return false
    },
    fileList,
    maxCount: 1,
  }

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileSpreadsheet size={18} color="var(--color-primary)" />
          <span>{title}</span>
        </div>
      }
      onCancel={handleClose}
      footer={[
        <Button key="back" onClick={handleClose}>
          {result ? 'Закрыть' : 'Отмена'}
        </Button>,
        !result && (
          <Button
            key="submit"
            type="primary"
            loading={uploading}
            disabled={fileList.length === 0}
            onClick={handleUpload}
          >
            Загрузить и импортировать
          </Button>
        ),
      ]}
      width={560}
      destroyOnClose
    >
      <p className="text-secondary" style={{ marginBottom: 12 }}>
        {description}
      </p>

      {requiredColumns.length > 0 && (
        <div style={{ marginBottom: 16, fontSize: '12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <strong>Ожидаемые колонки:</strong> {requiredColumns.join(', ')}
        </div>
      )}

      {!result && (
        <Dragger {...uploadProps} style={{ padding: '16px 0', background: '#fafbfc' }}>
          <p className="ant-upload-drag-icon">
            <Inbox size={36} color="var(--color-primary)" />
          </p>
          <p className="ant-upload-text" style={{ fontSize: '14px', fontWeight: 500 }}>
            Нажмите или перетащите файл Excel в эту область
          </p>
          <p className="ant-upload-hint text-muted" style={{ fontSize: '12px' }}>
            Поддерживаются форматы .xlsx и .xls (до 10 МБ)
          </p>
        </Dragger>
      )}

      {errorMsg && (
        <Alert
          message="Ошибка обработки файла"
          description={errorMsg}
          type="error"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <Alert
            message="Импорт завершен"
            description={`Успешно добавлено / обновлено записей: ${result.imported_count || result.created_count || 0}`}
            type={result.errors && result.errors.length > 0 ? 'warning' : 'success'}
            showIcon
          />

          {result.errors && result.errors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: 6, color: 'var(--color-danger)' }}>
                Ошибки в строках ({result.errors.length}):
              </div>
              <List
                size="small"
                bordered
                dataSource={result.errors}
                renderItem={(err) => (
                  <List.Item style={{ fontSize: '12px', color: '#b91c1c' }}>
                    <AlertCircle size={14} style={{ marginRight: 6, flexShrink: 0 }} />
                    {typeof err === 'string' ? err : `${err.row ? `Строка ${err.row}: ` : ''}${err.error || JSON.stringify(err)}`}
                  </List.Item>
                )}
                style={{ maxHeight: 150, overflowY: 'auto' }}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
