import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntdApp } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'

import { useAuthStore } from './store/authStore'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { WorkloadPage } from './pages/WorkloadPage'
import { GradesPage } from './pages/GradesPage'
import { ReportsPage } from './pages/ReportsPage'
import { AuditPage } from './pages/AuditPage'
import { QualityPage } from './pages/QualityPage'
import { StudentSurveyPage } from './pages/StudentSurveyPage'

dayjs.locale('ru')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60 * 1000, // 1 minute
    },
  },
})

// Ant Design Enterprise Theme Customization
const antdTheme = {
  token: {
    colorPrimary: '#1a56db',
    colorPrimaryHover: '#1648c0',
    colorLink: '#1a56db',
    colorSuccess: '#15803d',
    colorWarning: '#b45309',
    colorError: '#dc2626',
    colorInfo: '#1a56db',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    borderRadius: 6,
    colorBgBase: '#ffffff',
    colorTextBase: '#1a202c',
    colorBorder: '#e2e6ea',
  },
  components: {
    Button: {
      controlHeight: 34,
      controlHeightLG: 40,
      controlHeightSM: 28,
      borderRadius: 6,
    },
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#475569',
      borderColor: '#e2e8f0',
      rowHoverBg: '#e8effd',
      padding: 12,
    },
    Card: {
      borderRadiusLG: 8,
      boxShadowTertiary: '0 1px 3px rgba(0, 0, 0, 0.06)',
    },
  },
}

export function App() {
  const { initFromStorage } = useAuthStore()

  useEffect(() => {
    initFromStorage()
  }, [initFromStorage])

  return (
    <ConfigProvider locale={ruRU} theme={antdTheme}>
      <QueryClientProvider client={queryClient}>
        <AntdApp>
          <BrowserRouter>
            <Routes>
              {/* Публичные маршруты */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/survey" element={<StudentSurveyPage />} />

              {/* Защищенные маршруты */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/quality" element={<QualityPage />} />
                  <Route path="/workload" element={<WorkloadPage />} />
                  <Route path="/grades" element={<GradesPage />} />
                  <Route path="/reports" element={<ReportsPage />} />

                  {/* Маршрут только для зав. кафедрой и администратора */}
                  <Route element={<ProtectedRoute allowedRoles={['head', 'admin']} />}>
                    <Route path="/audit" element={<AuditPage />} />
                  </Route>
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AntdApp>
      </QueryClientProvider>
    </ConfigProvider>
  )
}

export default App
