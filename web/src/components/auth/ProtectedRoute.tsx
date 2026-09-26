import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { LoadingScreen } from '@/components/LoadingScreen'
import { useAuth } from '@/hooks/useAuth'

type ProtectedRouteProps = {
  children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen message="Verificando sua sessão…" />
  }

  if (user === null) {
    return <Navigate to="/login" replace />
  }

  return children
}
