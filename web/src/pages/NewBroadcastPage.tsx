import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import FormLabel from '@mui/material/FormLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ErrorNotice } from '@/components/common/ErrorNotice'
import { getConnections } from '@/services/connections'
import { getContacts } from '@/services/contacts'
import { createMessage } from '@/services/messages'
import type { Connection, Contact } from '@/types'
import { dataErrorMessage } from '@/utils/data-errors'

type SendMode = 'immediate' | 'scheduled'

const dateToDatetimeLocalString = (date: Date): string => {
  const pad = (num: number) => num.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

export const NewBroadcastPage = () => {
  const navigate = useNavigate()

  const [connections, setConnections] = useState<Connection[]>([])
  const [loadingConnections, setLoadingConnections] = useState(true)
  const [connectionsError, setConnectionsError] = useState<string | null>(null)

  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])

  const [content, setContent] = useState('')
  const [sendMode, setSendMode] = useState<SendMode>('immediate')

  const [scheduledAtStr, setScheduledAtStr] = useState<string>(() => {
    const defaultDate = new Date(Date.now() + 60 * 60 * 1000)
    return dateToDatetimeLocalString(defaultDate)
  })

  const [errors, setErrors] = useState<{
    connection?: string
    contacts?: string
    content?: string
    scheduledAt?: string
  }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchConnections = useCallback(() => {
    setLoadingConnections(true)
    setConnectionsError(null)

    getConnections()
      .then((data) => {
        setConnections(data)
        if (data.length > 0 && data[0]?.id) {
          setSelectedConnectionId(data[0].id)
        }
      })
      .catch((error) => {
        setConnectionsError(dataErrorMessage(error, 'Não foi possível carregar suas conexões.'))
      })
      .finally(() => {
        setLoadingConnections(false)
      })
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  useEffect(() => {
    if (!selectedConnectionId) {
      setContacts([])
      setSelectedContactIds([])
      return
    }

    setLoadingContacts(true)
    setSelectedContactIds([])

    getContacts(selectedConnectionId)
      .then((data) => {
        setContacts(data)
      })
      .catch((error) => {
        console.warn('Erro ao carregar contatos da conexão:', error)
        setContacts([])
      })
      .finally(() => {
        setLoadingContacts(false)
      })
  }, [selectedConnectionId])

  const handleConnectionChange = (event: SelectChangeEvent<string>) => {
    setSelectedConnectionId(event.target.value)
    if (errors.connection) {
      setErrors((current) => ({ ...current, connection: undefined }))
    }
  }

  const handleSelectAllContacts = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedContactIds(contacts.map((c) => c.id))
    } else {
      setSelectedContactIds([])
    }
    if (errors.contacts) {
      setErrors((current) => ({ ...current, contacts: undefined }))
    }
  }

  const handleToggleContact = (contactId: string) => {
    setSelectedContactIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId],
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

    const nextErrors: {
      connection?: string
      contacts?: string
      content?: string
      scheduledAt?: string
    } = {}

    if (!selectedConnectionId) {
      nextErrors.connection = 'Selecione uma conexão.'
    }

    if (selectedContactIds.length === 0) {
      nextErrors.contacts = 'Selecione ao menos um contato.'
    }

    const trimmedContent = content.trim()
    if (trimmedContent === '') {
      nextErrors.content = 'Digite a mensagem a ser enviada.'
    }

    let scheduledDate: Date | null = null
    if (sendMode === 'scheduled') {
      if (!scheduledAtStr) {
        nextErrors.scheduledAt = 'Escolha a data e horário de agendamento.'
      } else {
        scheduledDate = new Date(scheduledAtStr)
        if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
          nextErrors.scheduledAt = 'Escolha uma data e horário futuros.'
        }
      }
    }

    setErrors(nextErrors)
    setSubmitError(null)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setSubmitting(true)

    try {
      await createMessage({
        connectionId: selectedConnectionId,
        contactIds: selectedContactIds,
        content: trimmedContent,
        scheduledAt: sendMode === 'scheduled' ? scheduledDate : null,
      })

      navigate('/broadcasts')
    } catch (error) {
      setSubmitError(dataErrorMessage(error))
      setSubmitting(false)
    }
  }

  if (loadingConnections) {
    return (
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-24">
        <CircularProgress size={22} thickness={5} />
        <Typography variant="body2" color="text.secondary">
          Carregando conexões…
        </Typography>
      </div>
    )
  }

  if (connectionsError !== null) {
    return (
      <div className="space-y-6">
        <Typography component="h1" variant="h1">
          Novo broadcast
        </Typography>
        <ErrorNotice
          message={connectionsError}
          action={{
            label: 'Tentar novamente',
            onClick: fetchConnections,
          }}
        />
      </div>
    )
  }

  if (connections.length === 0) {
    return (
      <div className="space-y-6">
        <Typography component="h1" variant="h1">
          Novo broadcast
        </Typography>
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <Typography variant="h6">Você ainda não possui nenhuma conexão.</Typography>
            <Typography variant="body2" color="text.secondary">
              Crie uma conexão antes de criar um broadcast.
            </Typography>
            <Button component={Link} to="/connections" variant="contained">
              Ir para Conexões
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const allSelected = contacts.length > 0 && selectedContactIds.length === contacts.length
  const someSelected = selectedContactIds.length > 0 && selectedContactIds.length < contacts.length

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <Typography component="h1" variant="h1">
          Novo broadcast
        </Typography>
        <Button component={Link} to="/broadcasts" color="inherit">
          Voltar
        </Button>
      </div>

      <Card component="form" onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-6">
          {submitError !== null && (
            <Alert severity="error" variant="outlined" role="alert">
              {submitError}
            </Alert>
          )}

          <FormControl fullWidth required error={errors.connection !== undefined}>
            <InputLabel id="connection-select-label">Conexão</InputLabel>
            <Select
              labelId="connection-select-label"
              id="connection-select"
              value={selectedConnectionId}
              label="Conexão"
              onChange={handleConnectionChange}
              disabled={submitting}
            >
              {connections.map((conn) => (
                <MenuItem key={conn.id} value={conn.id}>
                  {conn.name}
                </MenuItem>
              ))}
            </Select>
            {errors.connection && <FormHelperText>{errors.connection}</FormHelperText>}
          </FormControl>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Typography variant="subtitle2" className="font-semibold">
                Contatos ({selectedContactIds.length} selecionados)
              </Typography>

              {contacts.length > 0 && (
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
                  Carregando contatos da conexão…
                </Typography>
              </div>
            ) : contacts.length === 0 ? (
              <div className="p-4 rounded bg-slate-50 border border-slate-200 text-center space-y-2">
                <Typography variant="body2" color="text.secondary">
                  Essa conexão ainda não possui contatos.
                </Typography>
                <Button
                  component={Link}
                  to={`/connections/${selectedConnectionId}/contacts`}
                  size="small"
                  variant="outlined"
                >
                  Adicionar contatos
                </Button>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto rounded border border-slate-200 p-2 space-y-1 bg-white">
                {contacts.map((contact) => (
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
            id="broadcast-content"
            label="Mensagem"
            multiline
            rows={4}
            fullWidth
            required
            placeholder="Escreva o conteúdo da mensagem…"
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

          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
              Opções de envio
            </FormLabel>
            <RadioGroup
              row
              name="sendMode"
              value={sendMode}
              onChange={(e) => setSendMode(e.target.value as SendMode)}
              sx={{ mt: 1 }}
            >
              <FormControlLabel
                value="immediate"
                control={<Radio disabled={submitting} />}
                label="Enviar agora"
              />
              <FormControlLabel
                value="scheduled"
                control={<Radio disabled={submitting} />}
                label="Agendar envio"
              />
            </RadioGroup>
          </FormControl>

          {sendMode === 'scheduled' && (
            <TextField
              id="broadcast-scheduledAt"
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
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button component={Link} to="/broadcasts" disabled={submitting} color="inherit">
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {submitting
                ? 'Processando…'
                : sendMode === 'immediate'
                ? 'Enviar agora'
                : 'Agendar envio'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
