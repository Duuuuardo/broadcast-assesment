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

import type { Contact } from '@/types'
import { dataErrorMessage } from '@/utils/data-errors'
import { phoneValidationMessage } from '@/utils/phone'

type ContactDialogProps = {
  open: boolean
  contact: Contact | null
  onClose: () => void
  onSubmit: (values: { name: string; phone: string }) => Promise<void>
}

export const ContactDialog = ({ open, contact, onClose, onSubmit }: ContactDialogProps) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isEditing = contact !== null

  useEffect(() => {
    if (!open) {
      return
    }

    setName(contact?.name ?? '')
    setPhone(contact?.phone ?? '')
    setErrors({})
    setSubmitError(null)
  }, [open, contact])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submitting) {
      return
    }

    const trimmedName = name.trim()
    const phoneMessage = phoneValidationMessage(phone)
    const nextErrors: { name?: string; phone?: string } = {}

    if (trimmedName === '') {
      nextErrors.name = 'Informe o nome do contato.'
    }

    if (phoneMessage !== null) {
      nextErrors.phone = phoneMessage
    }

    setErrors(nextErrors)
    setSubmitError(null)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setSubmitting(true)

    try {
      await onSubmit({ name: trimmedName, phone: phone.trim() })
      setName('')
      setPhone('')
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
        <DialogTitle>{isEditing ? 'Editar contato' : 'Novo contato'}</DialogTitle>

        <DialogContent>
          <div className="space-y-4 pt-1">
            {submitError !== null && (
              <Alert severity="error" variant="outlined" role="alert">
                {submitError}
              </Alert>
            )}

            <TextField
              id="contact-name"
              label="Nome"
              name="name"
              autoComplete="off"
              autoFocus
              fullWidth
              required
              value={name}
              disabled={submitting}
              error={errors.name !== undefined}
              helperText={errors.name ?? ' '}
              onChange={(event) => {
                setName(event.target.value)

                if (errors.name !== undefined) {
                  setErrors((current) => ({ ...current, name: undefined }))
                }
              }}
            />

            <TextField
              id="contact-phone"
              label="Telefone"
              name="phone"
              type="tel"
              autoComplete="off"
              fullWidth
              required
              value={phone}
              disabled={submitting}
              error={errors.phone !== undefined}
              helperText={errors.phone ?? ' '}
              onChange={(event) => {
                setPhone(event.target.value)

                if (errors.phone !== undefined) {
                  setErrors((current) => ({ ...current, phone: undefined }))
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
            {submitting ? 'Salvando…' : isEditing ? 'Salvar' : 'Criar contato'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
