import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { LoadingScreen } from '@/components/LoadingScreen'
import { useAuth } from '@/hooks/useAuth'

type GuestRouteProps = {
  children: ReactNode
}

export const GuestRoute = ({ children }: GuestRouteProps) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen message="Verificando sua sessão…" />
  }

  if (user !== null) {
    return <Navigate to="/" replace />
  }

  return children
}
