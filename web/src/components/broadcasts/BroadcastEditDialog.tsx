import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState, type FormEvent } from 'react'

import { getContacts } from '@/services/contacts'
import type { Contact, Message } from '@/types'
import { dataErrorMessage } from '@/utils/data-errors'

type BroadcastEditDialogProps = {
  open: boolean
  message: Message | null
  connectionName: string
  onClose: () => void
  onSave: (values: { content: string; contactIds: string[]; scheduledAt: Date }) => Promise<void>
}

const dateToDatetimeLocalString = (date: Date): string => {
  const pad = (num: number) => num.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

export const BroadcastEditDialog = ({
  open,
  message,
  connectionName,
  onClose,
  onSave,
}: BroadcastEditDialogProps) => {
  const [content, setContent] = useState('')
  const [scheduledAtStr, setScheduledAtStr] = useState('')
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])

  const [errors, setErrors] = useState<{ content?: string; contacts?: string; scheduledAt?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || message === null) {
      return
    }

    setContent(message.content)
    setSelectedContactIds(message.contactIds)
    setErrors({})
    setSubmitError(null)

    if (message.scheduledAt) {
      setScheduledAtStr(dateToDatetimeLocalString(message.scheduledAt.toDate()))
    } else {
      setScheduledAtStr('')
    }

    setLoadingContacts(true)
    getContacts(message.connectionId)
      .then((contacts) => {
        setAvailableContacts(contacts)
      })
      .catch((error) => {
        console.warn('Erro ao carregar contatos da conexão:', error)
      })
      .finally(() => {
        setLoadingContacts(false)
      })
  }, [open, message])

  const handleSelectAllContacts = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedContactIds(availableContacts.map((c) => c.id))
    } else {
      setSelectedContactIds([])
    }
    if (errors.contacts) {
      setErrors((current) => ({ ...current, contacts: undefined }))
    }
  }

  const handleToggleContact = (id: string) => {
    setSelectedContactIds((current) =>
      current.includes(id) ? current.filter((cId) => cId !== id) : [...current, id],
    )
    if (errors.contacts) {
      setErrors((current) => ({ ...current, contacts: undefined }))
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submitting) {
      return
    }

    const trimmedContent = content.trim()
    const nextErrors: { content?: string; contacts?: string; scheduledAt?: string } = {}

    if (trimmedContent === '') {
      nextErrors.content = 'Informe a mensagem do broadcast.'
    }

    if (selectedContactIds.length === 0) {
      nextErrors.contacts = 'Selecione ao menos um contato.'
    }

    if (!scheduledAtStr) {
      nextErrors.scheduledAt = 'Escolha a data e horário de agendamento.'
    } else {
      const scheduledDate = new Date(scheduledAtStr)
      if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
        nextErrors.scheduledAt = 'Escolha uma data e horário futuros.'
      }
    }

    setErrors(nextErrors)
    setSubmitError(null)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setSubmitting(true)

    try {
      await onSave({
        content: trimmedContent,
        contactIds: selectedContactIds,
        scheduledAt: new Date(scheduledAtStr),
      })
      onClose()
    } catch (error) {
      setSubmitError(dataErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const allSelected =
    availableContacts.length > 0 && selectedContactIds.length === availableContacts.length
  const someSelected =
    selectedContactIds.length > 0 && selectedContactIds.length < availableContacts.length

  return (
    <Dialog open={open} onClose={() => !submitting && onClose()} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle>Editar broadcast agendado</DialogTitle>

        <DialogContent dividers>
          <div className="space-y-5">
            {submitError !== null && (
              <Alert severity="error" variant="outlined" role="alert">
                {submitError}
              </Alert>
            )}

            <div>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Conexão
              </Typography>
              <Typography variant="body1" className="font-medium">
                {connectionName}
              </Typography>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Typography variant="subtitle2">
                  Contatos ({selectedContactIds.length} selecionados)
                </Typography>
                {availableContacts.length > 0 && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={handleSelectAllContacts}
                        size="small"
                        disabled={submitting}
                      />
                    }
                    label={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                    sx={{ mr: 0 }}
                  />
                )}
              </div>

              {loadingContacts ? (
                <div className="flex items-center gap-2 py-4">
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Carregando contatos…
                  </Typography>
                </div>
              ) : availableContacts.length === 0 ? (
                <Typography variant="body2" color="text.secondary" className="py-2 italic">
                  Esta conexão não possui contatos disponíveis.
                </Typography>
              ) : (
                <div className="mt-2 max-h-44 overflow-y-auto rounded border border-slate-200 p-2 space-y-1">
                  {availableContacts.map((contact) => (
                    <div key={contact.id}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedContactIds.includes(contact.id)}
                            onChange={() => handleToggleContact(contact.id)}
                            size="small"
                            disabled={submitting}
                          />
                        }
                        label={`${contact.name} (${contact.phone})`}
                      />
                    </div>
                  ))}
                </div>
              )}
              {errors.contacts && (
                <FormHelperText error>{errors.contacts}</FormHelperText>
              )}
            </div>

            <TextField
              id="broadcast-edit-content"
              label="Mensagem"
              multiline
              rows={4}
              fullWidth
              required
              value={content}
              disabled={submitting}
              error={errors.content !== undefined}
              helperText={errors.content ?? `${content.length} caracteres`}
              onChange={(e) => {
                setContent(e.target.value)
                if (errors.content) {
                  setErrors((curr) => ({ ...curr, content: undefined }))
                }
              }}
            />

            <TextField
              id="broadcast-edit-scheduledAt"
              label="Data e horário de envio"
              type="datetime-local"
              fullWidth
              required
              disabled={submitting}
              value={scheduledAtStr}
              error={errors.scheduledAt !== undefined}
              helperText={errors.scheduledAt ?? 'Horário local do seu navegador'}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={(e) => {
                setScheduledAtStr(e.target.value)
                if (errors.scheduledAt) {
                  setErrors((curr) => ({ ...curr, scheduledAt: undefined }))
                }
              }}
            />
          </div>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={submitting} color="inherit">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {submitting ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
