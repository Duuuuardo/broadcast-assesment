import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import { useEffect, useState, type FormEvent } from 'react'

import type { Connection } from '@/types'
import { dataErrorMessage } from '@/utils/data-errors'

type ConnectionDialogProps = {
  open: boolean
  connection: Connection | null
  onClose: () => void
  onSubmit: (name: string) => Promise<void>
}

export const ConnectionDialog = ({ open, connection, onClose, onSubmit }: ConnectionDialogProps) => {
  const [name, setName] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isEditing = connection !== null

  useEffect(() => {
    if (!open) {
      return
    }

    setName(connection?.name ?? '')
    setFieldError(null)
    setSubmitError(null)
  }, [open, connection])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submitting) {
      return
    }

    const trimmedName = name.trim()

    if (trimmedName === '') {
      setFieldError('Informe um nome para a conexão.')
      return
    }

    setFieldError(null)
    setSubmitError(null)
    setSubmitting(true)

    try {
      await onSubmit(trimmedName)
      setName('')
    } catch (error) {
      setSubmitError(dataErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) {
      return
    }

    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle>{isEditing ? 'Editar conexão' : 'Nova conexão'}</DialogTitle>

        <DialogContent>
          <div className="space-y-4 pt-1">
            {submitError !== null && (
              <Alert severity="error" variant="outlined" role="alert">
                {submitError}
              </Alert>
            )}

            <TextField
              id="connection-name"
              label="Nome da conexão"
              name="name"
              autoComplete="off"
              autoFocus
              fullWidth
              required
              value={name}
              disabled={submitting}
              error={fieldError !== null}
              helperText={fieldError ?? ' '}
              onChange={(event) => {
                setName(event.target.value)

                if (fieldError !== null) {
                  setFieldError(null)
                }
              }}
            />
          </div>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} disabled={submitting} color="inherit">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {submitting ? 'Salvando…' : isEditing ? 'Salvar' : 'Criar conexão'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
