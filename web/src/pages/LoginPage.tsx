import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import { AuthLayout } from '@/layouts/AuthLayout'
import { authErrorMessage } from '@/utils/auth-errors'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldErrors = Partial<Record<'email' | 'password', string>>

export const LoginPage = () => {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submitting) {
      return
    }

    const errors: FieldErrors = {}

    if (email.trim() === '') {
      errors.email = 'Informe seu email.'
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = 'Informe um email válido.'
    }

    if (password === '') {
      errors.password = 'Informe sua senha.'
    }

    setFieldErrors(errors)
    setFormError(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    setSubmitting(true)

    try {
      await signIn({ email: email.trim(), password })
      navigate('/', { replace: true })
    } catch (error) {
      setFormError(authErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      description="Acesse sua conta do Broadcast."
      footer={
        <Typography variant="body2">
          Ainda não tem conta?{' '}
          <Typography
            component={Link}
            to="/register"
            variant="body2"
            className="font-medium text-slate-900 underline-offset-4 hover:underline"
          >
            Criar conta
          </Typography>
        </Typography>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError !== null && (
          <Alert severity="error" variant="outlined" role="alert">
            {formError}
          </Alert>
        )}

        <TextField
          id="login-email"
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          autoFocus
          fullWidth
          required
          value={email}
          disabled={submitting}
          error={fieldErrors.email !== undefined}
          helperText={fieldErrors.email ?? ' '}
          onChange={(event) => setEmail(event.target.value)}
        />

        <TextField
          id="login-password"
          label="Senha"
          type="password"
          name="password"
          autoComplete="current-password"
          fullWidth
          required
          value={password}
          disabled={submitting}
          error={fieldErrors.password !== undefined}
          helperText={fieldErrors.password ?? ' '}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={submitting}
          className="h-11"
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthLayout>
  )
}
