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

type FieldName = 'name' | 'email' | 'password' | 'confirmPassword'

type FieldErrors = Partial<Record<FieldName, string>>

export const RegisterPage = () => {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submitting) {
      return
    }

    const errors: FieldErrors = {}

    if (name.trim() === '') {
      errors.name = 'Informe seu nome.'
    }

    if (email.trim() === '') {
      errors.email = 'Informe seu email.'
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = 'Informe um email válido.'
    }

    if (password === '') {
      errors.password = 'Informe uma senha.'
    }

    if (confirmPassword === '') {
      errors.confirmPassword = 'Confirme sua senha.'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem.'
    }

    setFieldErrors(errors)
    setFormError(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    setSubmitting(true)

    try {
      await signUp({ name: name.trim(), email: email.trim(), password })
      navigate('/', { replace: true })
    } catch (error) {
      setFormError(authErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      description="Cadastre-se para começar a usar o Broadcast."
      footer={
        <Typography variant="body2">
          Já tem conta?{' '}
          <Typography
            component={Link}
            to="/login"
            variant="body2"
            className="font-medium text-slate-900 underline-offset-4 hover:underline"
          >
            Entrar
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
          id="register-name"
          label="Nome"
          name="name"
          autoComplete="name"
          autoFocus
          fullWidth
          required
          value={name}
          disabled={submitting}
          error={fieldErrors.name !== undefined}
          helperText={fieldErrors.name}
          onChange={(event) => setName(event.target.value)}
        />

        <TextField
          id="register-email"
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          fullWidth
          required
          value={email}
          disabled={submitting}
          error={fieldErrors.email !== undefined}
          helperText={fieldErrors.email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <TextField
          id="register-password"
          label="Senha"
          type="password"
          name="password"
          autoComplete="new-password"
          fullWidth
          required
          value={password}
          disabled={submitting}
          error={fieldErrors.password !== undefined}
          helperText={fieldErrors.password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <TextField
          id="register-confirm-password"
          label="Confirmar senha"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          fullWidth
          required
          value={confirmPassword}
          disabled={submitting}
          error={fieldErrors.confirmPassword !== undefined}
          helperText={fieldErrors.confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={submitting}
          className="h-11"
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {submitting ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
    </AuthLayout>
  )
}
