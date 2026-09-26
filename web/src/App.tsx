import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { LoadingScreen } from '@/components/LoadingScreen'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AuthProvider } from '@/contexts/AuthContext'
import { MainLayout } from '@/layouts/MainLayout'
import { theme } from '@/theme/theme'

const BroadcastsPage = lazy(() =>
  import('@/pages/BroadcastsPage').then((module) => ({ default: module.BroadcastsPage })),
)
const ContactsPage = lazy(() =>
  import('@/pages/ContactsPage').then((module) => ({ default: module.ContactsPage })),
)
const HomePage = lazy(() => import('@/pages/HomePage').then((module) => ({ default: module.HomePage })))
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const NewBroadcastPage = lazy(() =>
  import('@/pages/NewBroadcastPage').then((module) => ({ default: module.NewBroadcastPage })),
)
const RegisterPage = lazy(() =>
  import('@/pages/RegisterPage').then((module) => ({ default: module.RegisterPage })),
)

const withSession = (page: ReactNode) => (
  <ProtectedRoute>
    <MainLayout>{page}</MainLayout>
  </ProtectedRoute>
)

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              }
            />
            <Route path="/" element={<Navigate to="/connections" replace />} />
            <Route path="/connections" element={withSession(<HomePage />)} />
            <Route
              path="/connections/:connectionId/contacts"
              element={withSession(<ContactsPage />)}
            />
            <Route path="/broadcasts" element={withSession(<BroadcastsPage />)} />
            <Route path="/broadcasts/new" element={withSession(<NewBroadcastPage />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
)

export default App
