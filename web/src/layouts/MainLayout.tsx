import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import { authErrorMessage } from '@/utils/auth-errors'

type MainLayoutProps = {
  children: ReactNode
}

const initialsFrom = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { user, logout } = useAuth()
  const location = useLocation()

  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  const displayName = user?.displayName ?? user?.email ?? ''

  const handleLogout = async () => {
    if (loggingOut) {
      return
    }

    setLoggingOut(true)
    setLogoutError(null)

    try {
      await logout()
    } catch (error) {
      setLogoutError(authErrorMessage(error, 'Não foi possível encerrar a sessão. Tente novamente.'))
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ bgcolor: 'background.paper' }}>
        <Toolbar sx={{ gap: { xs: 1, sm: 2 }, flexWrap: 'wrap', rowGap: 0.5 }}>
          <Typography variant="h3" component="span" sx={{ mr: { xs: 0, sm: 1 } }}>
            Broadcast
          </Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              component={Link}
              to="/connections"
              color={location.pathname.startsWith('/connections') ? 'primary' : 'inherit'}
              size="small"
            >
              Conexões
            </Button>
            <Button
              component={Link}
              to="/broadcasts"
              color={location.pathname.startsWith('/broadcasts') ? 'primary' : 'inherit'}
              size="small"
            >
              Broadcasts
            </Button>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }} />

          {user !== null && (
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main' }}>
                {initialsFrom(displayName)}
              </Avatar>
              <Typography variant="body2" color="text.secondary" className="truncate max-w-[130px] sm:max-w-[180px]">
                {displayName}
              </Typography>
            </div>
          )}

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

          <Button variant="text" color="inherit" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Saindo…' : 'Sair'}
          </Button>
        </Toolbar>
        <Divider />

        {logoutError !== null && (
          <Box sx={{ px: 3, pt: 2 }}>
            <Alert severity="error" variant="outlined" role="alert">
              {logoutError}
            </Alert>
          </Box>
        )}
      </AppBar>

      <Container maxWidth="lg" component="main" sx={{ flex: 1, py: 4 }}>
        {children}
      </Container>
    </Box>
  )
}
