import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Alert, Tag, Space, message } from 'antd'
import { User, Lock, GraduationCap, ArrowRight } from 'lucide-react'
import { login, getMe } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const onFinish = async (values) => {
    setLoading(true)
    setErrorMsg(null)

    try {
      const tokens = await login(values.username, values.password)
      // Save tokens temporarily so getMe can authenticate
      localStorage.setItem('access_token', tokens.access)
      localStorage.setItem('refresh_token', tokens.refresh)

      const userInfo = await getMe()

      setAuth({
        user: userInfo,
        access: tokens.access,
        refresh: tokens.refresh,
      })

      message.success(`Добро пожаловать, ${userInfo.first_name || userInfo.username}!`)
      navigate('/dashboard')
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Неверный логин или пароль'
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (username, password) => {
    form.setFieldsValue({ username, password })
    setErrorMsg(null)
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoTitle}>
            <GraduationCap size={28} color="var(--color-primary)" />
            <span>КафИС</span>
          </div>
          <p className={styles.subtitle}>
            Информационная система кафедры ГиСЭН
            <br />
            НФ НИТУ МИСИС
          </p>
        </div>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            label="Имя пользователя"
            name="username"
            rules={[{ required: true, message: 'Введите логин' }]}
          >
            <Input
              prefix={<User size={16} color="#94a3b8" />}
              placeholder="Логин сотрудника"
              size="large"
              autoFocus
            />
          </Form.Item>

          <Form.Item
            label="Пароль"
            name="password"
            rules={[{ required: true, message: 'Введите пароль' }]}
          >
            <Input.Password
              prefix={<Lock size={16} color="#94a3b8" />}
              placeholder="Пароль"
              size="large"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            icon={<ArrowRight size={16} />}
            style={{ marginTop: 8 }}
          >
            Войти в систему
          </Button>
        </Form>

        <div className={styles.demoBox}>
          <div className={styles.demoTitle}>Демонстрационные учетные записи:</div>
          <div className={styles.demoButtons}>
            <Button
              size="small"
              onClick={() => fillDemo('head', 'head12345')}
            >
              Зав. кафедрой (head)
            </Button>
            <Button
              size="small"
              onClick={() => fillDemo('teacher1', 'teacher12345')}
            >
              Преподаватель (teacher1)
            </Button>
            <Button
              size="small"
              onClick={() => fillDemo('admin', 'admin12345')}
            >
              Администратор (admin)
            </Button>
          </div>
        </div>

        <div className={styles.footer}>
          &copy; 2026 НФ НИТУ МИСИС &bull; Все права защищены
        </div>
      </div>
    </div>
  )
}
