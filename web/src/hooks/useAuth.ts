import { useContext } from 'react'

import { AuthContext } from '@/contexts/AuthContext'

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  }

  return context
}
