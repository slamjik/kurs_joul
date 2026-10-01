import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarCheck,
  GraduationCap as AcademicIcon,
  GraduationCap,
  FileSpreadsheet,
  ShieldAlert,
  LogOut,
  RefreshCw,
  Award,
  ExternalLink,
} from 'lucide-react'
import { Button, Tag, Tooltip, message, Popconfirm } from 'antd'
import { useAuthStore } from '../../store/authStore'
import { invalidateKpiCache } from '../../api/kpi'
import styles from './AppLayout.module.css'

const ROLE_CONFIG = {
  head: { label: 'Зав. кафедрой', color: 'blue' },
  teacher: { label: 'Преподаватель', color: 'green' },
  admin: { label: 'Администратор', color: 'purple' },
}

export function AppLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    message.info('Вы вышли из системы')
    navigate('/login')
  }

  const handleInvalidateCache = async () => {
    try {
      await invalidateKpiCache()
      message.success('Кэш показателей успешно сброшен')
      window.location.reload()
    } catch (err) {
      message.error('Не удалось сбросить кэш')
    }
  }

  const role = user?.role || 'teacher'
  const roleInfo = ROLE_CONFIG[role] || { label: 'Сотрудник', color: 'default' }
  const isHeadOrAdmin = role === 'head' || role === 'admin'

  const navItems = [
    { to: '/dashboard', label: 'Дашборд кафедры', icon: LayoutDashboard },
    { to: '/quality', label: 'Качество и опросы', icon: Award },
    { to: '/workload', label: 'Учебная нагрузка', icon: CalendarCheck },
    { to: '/grades', label: 'Успеваемость', icon: GraduationCap },
    { to: '/reports', label: 'Отчёты и экспорт', icon: FileSpreadsheet },
    ...(isHeadOrAdmin
      ? [{ to: '/audit', label: 'Журнал аудита', icon: ShieldAlert }]
      : []),
  ]

  const displayName = user
    ? `${user.last_name || ''} ${user.first_name || user.username}`.trim()
    : 'Пользователь'

  return (
    <div className={styles.layout}>
      {/* Левый сайдбар */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.logoContainer}>
            <div className={styles.logoTitle}>
              <AcademicIcon size={22} color="var(--color-primary)" />
              <span>КафИС</span>
            </div>
            <div className={styles.logoSubtitle}>Кафедра ГиСЭН • НФ НИТУ МИСИС</div>
          </div>

          <nav className={styles.nav}>
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.active : ''}`
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          Версия 1.0.0 &bull; 2026<br />
          Новотроицкий филиал
        </div>
      </aside>

      {/* Основная рабочая область */}
      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.systemBadge}>ИС «КафИС»</span>
            <span className="text-secondary" style={{ fontSize: '13px' }}>
              Планирование и оперативный мониторинг
            </span>
          </div>

          <div className={styles.headerRight}>
            <Button
              size="small"
              icon={<ExternalLink size={14} />}
              onClick={() => navigate('/survey')}
              style={{ color: '#15803d', borderColor: '#86efac' }}
            >
              Анкета студента
            </Button>

            {isHeadOrAdmin && (
              <Tooltip title="Сбросить кэш показателей (Redis)">
                <Button
                  size="small"
                  icon={<RefreshCw size={14} />}
                  onClick={handleInvalidateCache}
                >
                  Обновить KPI
                </Button>
              </Tooltip>
            )}

            <div className={styles.userInfo}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span className={styles.userName}>{displayName}</span>
                <span className={styles.userRole}>
                  <Tag color={roleInfo.color} style={{ margin: 0, fontSize: '11px', lineHeight: '18px' }}>
                    {roleInfo.label}
                  </Tag>
                </span>
              </div>
            </div>

            <Popconfirm
              title="Выход из системы"
              description="Вы уверены, что хотите выйти?"
              onConfirm={handleLogout}
              okText="Да"
              cancelText="Отмена"
            >
              <Button
                type="text"
                danger
                icon={<LogOut size={16} />}
                title="Выйти"
              >
                Выйти
              </Button>
            </Popconfirm>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
