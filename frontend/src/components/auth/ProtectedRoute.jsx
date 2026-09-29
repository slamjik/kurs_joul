import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Result, Button } from 'antd'
import { useAuthStore } from '../../store/authStore'

export function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <Result
        status="403"
        title="403 Доступ ограничен"
        subTitle="У вашей учетной записи недостаточно прав для просмотра этого раздела."
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            Назад
          </Button>
        }
      />
    )
  }

  return <Outlet />
}
