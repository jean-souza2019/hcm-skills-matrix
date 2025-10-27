import { CircularProgress, Stack } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { paths } from './paths'

import { useAuthStore } from '@/store/auth'
import type { Role } from '@/types/domain'

interface ProtectedRouteProps extends PropsWithChildren {
  roles?: Role[]
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const mustChangePassword = user?.mustChangePassword ?? false
  const isOnForcePasswordPage = location.pathname === paths.forcePasswordChange

  if (isLoading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
        <CircularProgress />
      </Stack>
    )
  }

  if (!token || !user) {
    return <Navigate to={paths.login} state={{ from: location }} replace />
  }

  if (mustChangePassword && !isOnForcePasswordPage) {
    return <Navigate to={paths.forcePasswordChange} replace />
  }

  if (!mustChangePassword && isOnForcePasswordPage) {
    return <Navigate to={paths.dashboard} replace />
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={paths.dashboard} replace />
  }

  if (children) {
    return <>{children}</>
  }

  return <Outlet />
}
