# 🎨 Frontend & Design Guide — React + Vite + Ant Design

---

## 1. Философия дизайна

> **Главное правило:** интерфейс — рабочий инструмент кафедры, не витрина.  
> Сотрудники открывают его каждый день. Он должен быть **чётким, быстрым и не утомлять**.

### Чего НЕ делать
- ❌ Градиентные кнопки на каждом элементе
- ❌ Анимации при каждом клике
- ❌ Тёмный фон с неоновым текстом (выглядит как «сделала нейросеть»)
- ❌ Карточки с тенями везде, размытия, glassmorphism
- ❌ Разные шрифты на одной странице

### Что делать
- ✅ Белый фон, спокойные акценты
- ✅ Таблицы — основной элемент (данных много)
- ✅ Чёткая иерархия: заголовок → фильтры → таблица → действия
- ✅ Один цветовой акцент (синий), всё остальное серое
- ✅ Кнопки с понятными иконками + текстом

---

## 2. Дизайн-система

### Цветовая палитра (CSS-переменные)

```css
/* src/styles/variables.css */
:root {
  /* Акцентный цвет — один на весь проект */
  --color-primary:        #1a56db;   /* Синий — кнопки, ссылки, активные состояния */
  --color-primary-light:  #e8effd;   /* Светло-синий — фон выделенной строки таблицы */
  --color-primary-hover:  #1648c0;   /* Синий при hover */

  /* Нейтральные */
  --color-bg:             #f5f6f8;   /* Фон страницы */
  --color-surface:        #ffffff;   /* Фон карточек, таблиц */
  --color-border:         #e2e6ea;   /* Границы, разделители */
  --color-text:           #1a202c;   /* Основной текст */
  --color-text-secondary: #6b7280;   /* Второстепенный текст, подписи */
  --color-text-muted:     #9ca3af;   /* Плейсхолдеры */

  /* Статусы */
  --color-success:        #15803d;
  --color-success-bg:     #dcfce7;
  --color-warning:        #b45309;
  --color-warning-bg:     #fef3c7;
  --color-danger:         #dc2626;
  --color-danger-bg:      #fee2e2;

  /* Типографика */
  --font-family:    'Inter', -apple-system, sans-serif;
  --font-size-xs:   12px;
  --font-size-sm:   13px;
  --font-size-base: 14px;
  --font-size-md:   15px;
  --font-size-lg:   18px;
  --font-size-xl:   22px;

  /* Отступы */
  --spacing-xs:  4px;
  --spacing-sm:  8px;
  --spacing-md:  16px;
  --spacing-lg:  24px;
  --spacing-xl:  32px;

  /* Радиус скругления */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;

  /* Тени — только лёгкие */
  --shadow-sm:   0 1px 3px rgba(0,0,0,0.08);
  --shadow-md:   0 2px 8px rgba(0,0,0,0.10);
}
```

### Типографика

```css
/* src/styles/typography.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: var(--color-text);
  line-height: 1.5;
  background: var(--color-bg);
}

h1 { font-size: var(--font-size-xl); font-weight: 700; margin: 0; }
h2 { font-size: var(--font-size-lg); font-weight: 600; margin: 0; }
h3 { font-size: var(--font-size-md); font-weight: 600; margin: 0; }

.text-secondary { color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.text-muted     { color: var(--color-text-muted); font-size: var(--font-size-xs); }
```

---

## 3. Структура проекта (React)

```
frontend/src/
├── api/
│   ├── client.js          # axios с базовым URL и интерцепторами
│   ├── workload.js        # запросы к /api/workload/
│   ├── grades.js          # запросы к /api/grades/
│   ├── kpi.js             # запросы к /api/kpi/
│   └── auth.js            # логин, логаут
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx  # основной лейаут (сайдбар + шапка + контент)
│   │   ├── Sidebar.jsx    # навигационное меню
│   │   └── Header.jsx     # шапка с именем пользователя
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Badge.jsx      # статус-бейджики (Зона риска, Выполнено)
│   │   ├── Table.jsx      # обёртка над Ant Table
│   │   ├── Filters.jsx    # панель фильтров
│   │   ├── ImportModal.jsx # модалка загрузки Excel
│   │   └── EmptyState.jsx # пустое состояние таблицы
│   └── charts/
│       ├── PieChart.jsx
│       ├── BarChart.jsx
│       └── LineChart.jsx
│
├── pages/
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx  # KPI-дашборд
│   ├── WorkloadPage.jsx   # Нагрузка
│   ├── GradesPage.jsx     # Успеваемость
│   └── ReportsPage.jsx    # Экспорт отчётов
│
├── hooks/
│   ├── useAuth.js
│   ├── useWorkload.js
│   └── useGrades.js
│
├── store/
│   └── authStore.js       # zustand: токен, роль пользователя
│
└── styles/
    ├── variables.css
    ├── typography.css
    └── global.css
```

---

## 4. Лейаут приложения

```
┌─────────────────────────────────────────────────────────┐
│ HEADER: Логотип «КафИС»          Иванов А.А. ▼ [Выйти] │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  SIDEBAR     │  CONTENT AREA                           │
│  ─────────   │                                          │
│  📊 Дашборд  │  [Заголовок страницы]                   │
│  📋 Нагрузка │                                          │
│  📈 Успевае- │  [Панель фильтров]                       │
│     мость   │  ┌─────────────────────────────────────┐ │
│  📄 Отчёты  │  │         Основной контент             │ │
│             │  │       (таблица / дашборд)            │ │
│             │  └─────────────────────────────────────┘ │
└─────────────┴──────────────────────────────────────────┘
  220px fixed        flex: 1, min-width: 0
```

```jsx
// src/components/layout/AppLayout.jsx
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Table, TrendingUp, FileText } from 'lucide-react'
import styles from './AppLayout.module.css'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/workload',  icon: Table,           label: 'Нагрузка' },
  { to: '/grades',    icon: TrendingUp,      label: 'Успеваемость' },
  { to: '/reports',   icon: FileText,        label: 'Отчёты' },
]

export function AppLayout() {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>КафИС</div>
        <nav>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
```

```css
/* AppLayout.module.css */
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md) 0;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  padding: 0 var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--spacing-md);
}

.navItem {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 10px var(--spacing-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  border-radius: 0;
  margin: 1px 8px;
  border-radius: var(--radius-sm);
}

.navItem:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.navItem.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.main {
  flex: 1;
  overflow-y: auto;
  background: var(--color-bg);
  padding: var(--spacing-lg);
}
```

---

## 5. Страница: Нагрузка

```
┌─────────────────────────────────────────────────────────┐
│ Учебная нагрузка                    [Импорт] [+ Добавить]│
├─────────────────────────────────────────────────────────┤
│ Семестр: [2024-1 ▼]  Преподаватель: [Все ▼]  [Сбросить]│
├─────────────────────────────────────────────────────────┤
│ ФИО                  Дисциплина         Группа  Пл  Фак │
│ ──────────────────── ─────────────────  ──────  ──  ─── │
│ Иванов А.А.          Математика          БПИ-23  72  36  │
│ Петрова Е.В.         Экономика           ЭКМ-22  36  36  │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

```jsx
// src/pages/WorkloadPage.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Select, Table, Space } from 'antd'
import { Upload, Plus, Download } from 'lucide-react'
import { getWorkload, exportWorkloadExcel } from '../api/workload'
import { ImportModal } from '../components/ui/ImportModal'
import styles from './WorkloadPage.module.css'

export function WorkloadPage() {
  const [filters, setFilters] = useState({ semester: '2024-1' })
  const [importOpen, setImportOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['workload', filters],
    queryFn: () => getWorkload(filters),
  })

  const columns = [
    { title: 'Преподаватель', dataIndex: 'teacher_name', sorter: true },
    { title: 'Дисциплина', dataIndex: 'discipline_name' },
    { title: 'Группа', dataIndex: 'group_name', width: 100 },
    { title: 'Часов (план)', dataIndex: 'hours_plan', width: 110, align: 'center' },
    {
      title: 'Выполнение',
      width: 130,
      render: (_, row) => {
        const pct = Math.round(row.hours_fact / row.hours_plan * 100)
        const color = pct >= 100 ? 'success' : pct >= 50 ? 'warning' : 'danger'
        return <ProgressBadge value={pct} variant={color} />
      },
    },
  ]

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>Учебная нагрузка</h1>
        <Space>
          <Button icon={<Upload size={15} />} onClick={() => setImportOpen(true)}>
            Импорт Excel
          </Button>
          <Button icon={<Download size={15} />} onClick={exportWorkloadExcel}>
            Экспорт
          </Button>
          <Button type="primary" icon={<Plus size={15} />}>
            Добавить
          </Button>
        </Space>
      </div>

      {/* Фильтры */}
      <div className={styles.filters}>
        <Select
          value={filters.semester}
          onChange={(v) => setFilters(f => ({ ...f, semester: v }))}
          options={SEMESTER_OPTIONS}
          style={{ width: 130 }}
          placeholder="Семестр"
        />
        <Select
          onChange={(v) => setFilters(f => ({ ...f, teacher: v }))}
          placeholder="Все преподаватели"
          allowClear
          style={{ width: 220 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={data?.results}
        loading={isLoading}
        rowKey="id"
        size="middle"
        pagination={{ pageSize: 25, showSizeChanger: false }}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/api/workload/import/"
        title="Импорт нагрузки из Excel"
        templateHint="Скачать шаблон"
      />
    </div>
  )
}
```

---

## 6. Страница: Дашборд

```
┌──────────┬──────────┬──────────┬──────────┐
│ Всего    │  В зоне  │ % закрытия│% успев.  │
│ студентов│  риска   │   часов  │  в целом │
│   342    │   12 🔴  │   78%    │   71%    │
└──────────┴──────────┴──────────┴──────────┘
┌──────────────────────┬───────────────────────┐
│ Уровни качества      │ Нагрузка (план/факт)  │
│ [Круговая диаграмма] │ [Столбчатый график]   │
└──────────────────────┴───────────────────────┘
┌─────────────────────────────────────────────┐
│ Динамика успеваемости                        │
│ [Линейный график по семестрам]               │
└─────────────────────────────────────────────┘
```

```jsx
// src/pages/DashboardPage.jsx
import { useQuery } from '@tanstack/react-query'
import { KpiCard } from '../components/ui/KpiCard'
import { PieChart } from '../components/charts/PieChart'
import { BarChart } from '../components/charts/BarChart'
import { LineChart } from '../components/charts/LineChart'
import { getKpiSummary, getQualityLevels, getWorkloadChart, getGradesDynamics } from '../api/kpi'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const { data: summary } = useQuery({ queryKey: ['kpi-summary'], queryFn: getKpiSummary })
  const { data: qualityLevels } = useQuery({ queryKey: ['quality-levels'], queryFn: getQualityLevels })
  const { data: workloadChart } = useQuery({ queryKey: ['workload-chart'], queryFn: getWorkloadChart })
  const { data: gradesDynamics } = useQuery({ queryKey: ['grades-dynamics'], queryFn: getGradesDynamics })

  return (
    <div>
      <h1 className={styles.title}>Дашборд кафедры</h1>

      {/* Карточки KPI */}
      <div className={styles.kpiGrid}>
        <KpiCard label="Студентов" value={summary?.total_students} />
        <KpiCard label="В зоне риска" value={summary?.risk_count} variant="danger" />
        <KpiCard label="Закрытие часов" value={`${summary?.hours_completion}%`} />
        <KpiCard label="Успеваемость" value={`${summary?.avg_grade_pct}%`} />
      </div>

      {/* Графики первой строки */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3>Уровни качества образования</h3>
          <PieChart data={qualityLevels} />
        </div>
        <div className={styles.chartCard}>
          <h3>Нагрузка по преподавателям</h3>
          <BarChart data={workloadChart} />
        </div>
      </div>

      {/* Динамика */}
      <div className={styles.fullWidthCard}>
        <h3>Динамика успеваемости</h3>
        <LineChart data={gradesDynamics} />
      </div>
    </div>
  )
}
```

```jsx
// src/components/ui/KpiCard.jsx
import styles from './KpiCard.module.css'

export function KpiCard({ label, value, variant = 'default' }) {
  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.value}>{value ?? '—'}</div>
      <div className={styles.label}>{label}</div>
    </div>
  )
}
```

```css
/* KpiCard.module.css */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md) var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}

.label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}

.card.danger .value  { color: var(--color-danger); }
.card.success .value { color: var(--color-success); }
```

---

## 7. Графики (Recharts)

```jsx
// src/components/charts/PieChart.jsx
import { PieChart as RechartsPie, Pie, Cell, Tooltip, Legend } from 'recharts'

// Ограниченная палитра — не пёстрая
const COLORS = ['#1a56db', '#3b82f6', '#93c5fd', '#6b7280']

export function PieChart({ data = [] }) {
  return (
    <RechartsPie width={300} height={240}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="label"
        cx="50%"
        cy="50%"
        outerRadius={90}
        label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
        labelLine={false}
      >
        {data.map((_, i) => (
          <Cell key={i} fill={COLORS[i % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(v) => [`${v}%`, '']} />
    </RechartsPie>
  )
}
```

---

## 8. API-клиент

```js
// src/api/client.js
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Подставляем токен из localStorage
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Обрабатываем 401 — редирект на логин
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default client
```

---

## 9. Правила дизайна — итог

| Аспект | Правило |
|--------|---------|
| **Цвет** | 1 акцентный (синий), остальное нейтральное. Ярких цветов — только для статусов |
| **Таблицы** | Основной элемент. `size="middle"`, строки не слишком высокие |
| **Кнопки** | Текст + иконка. Только одна `primary` кнопка на экране |
| **Иконки** | `lucide-react` — один набор, размер 15–18px |
| **Отступы** | Всё кратно 8px (`--spacing-*`). Не придумывай свои отступы |
| **Анимации** | Только встроенные в Ant Design (0.15–0.2s). Не добавляй своих |
| **Пустые состояния** | Всегда показывай `<EmptyState>` вместо пустой таблицы |
| **Ошибки** | Toast/notification от Ant Design, не модальные окна |
| **Мобильных нет** | Минимум 1366px. Не тратить время на мобильный вид |

---

## 10. Страница: Логин

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              КафИС                               │
│     Информационная система кафедры          │
│                                                 │
│        ┌───────────────────────┐              │
│        │ Логин  [___________] │              │
│        │ Пароль [___________] │              │
│        │                       │              │
│        │   [ Войти в систему ] │              │
│        └───────────────────────┘              │
│                                                 │
│     © НФ НИТУ МИСИС, 2026                      │
└─────────────────────────────────────────────────┘
```

```jsx
// src/pages/LoginPage.jsx
import { useState } from 'react'
import { Form, Input, Button, message } from 'antd'
import { Lock, User } from 'lucide-react'
import { login } from '../api/auth'
import { useNavigate } from 'react-router-dom'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const { access, refresh } = await login(values.username, values.password)
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      navigate('/dashboard')
    } catch (err) {
      message.error('Неверный логин или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.logo}>КафИС</h1>
        <p className={styles.subtitle}>Информационная система кафедры</p>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true, message: 'Введите логин' }]}>
            <Input prefix={<User size={16} />} placeholder="Логин" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}>
            <Input.Password prefix={<Lock size={16} />} placeholder="Пароль" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Войти в систему
          </Button>
        </Form>

        <p className={styles.footer}>© НФ НИТУ МИСИС, 2026</p>
      </div>
    </div>
  )
}
```

```css
/* LoginPage.module.css */
.page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--color-bg);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 40px 36px;
  width: 380px;
  box-shadow: var(--shadow-md);
}

.logo {
  text-align: center;
  color: var(--color-primary);
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.subtitle {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-lg);
}

.footer {
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  margin-top: var(--spacing-lg);
  margin-bottom: 0;
}
```

---

## 11. Компонент: ProgressBadge

```jsx
// src/components/ui/ProgressBadge.jsx
import styles from './ProgressBadge.module.css'

export function ProgressBadge({ value, variant = 'default' }) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {value}%
    </span>
  )
}
```

```css
/* ProgressBadge.module.css */
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.badge.success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.badge.warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.badge.danger {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.badge.default {
  background: var(--color-bg);
  color: var(--color-text-secondary);
}
```
