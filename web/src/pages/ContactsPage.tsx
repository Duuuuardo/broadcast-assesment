import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog'
import { ErrorNotice } from '@/components/common/ErrorNotice'
import { ContactDialog } from '@/components/contacts/ContactDialog'
import { ContactList } from '@/components/contacts/ContactList'
import { getConnection } from '@/services/connections'
import { createContact, deleteContact, subscribeToContacts, updateContact } from '@/services/contacts'
import type { Connection, Contact } from '@/types'
import { dataErrorMessage } from '@/utils/data-errors'

const CONNECTION_ERROR_MESSAGE = 'Não foi possível carregar a conexão. Tente novamente.'
const CONTACTS_ERROR_MESSAGE = 'Não foi possível carregar os contatos desta conexão. Tente novamente.'

const CONNECTION_MISSING_MESSAGE = 'Conexão não encontrada.'

type ConnectionState =
  | { status: 'loading' }
  | { status: 'ready'; connection: Connection }
  | { status: 'missing' }
  | { status: 'error' }

export const ContactsPage = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()

  const [connectionState, setConnectionState] = useState<ConnectionState>({ status: 'loading' })
  const [connectionAttempt, setConnectionAttempt] = useState(0)

  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsError, setContactsError] = useState<string | null>(null)
  const [contactsAttempt, setContactsAttempt] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [deleting, setDeleting] = useState<Contact | null>(null)

  const goBack = useCallback(() => {
    navigate('/connections')
  }, [navigate])

  useEffect(() => {
    if (connectionId === undefined) {
      setConnectionState({ status: 'missing' })

      return
    }

    let active = true

    setConnectionState({ status: 'loading' })

    getConnection(connectionId)
      .then((connection) => {
        if (!active) {
          return
        }

        setConnectionState(
          connection === null ? { status: 'missing' } : { status: 'ready', connection },
        )
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setConnectionState({ status: 'error' })
        console.warn('Falha ao carregar a conexão:', dataErrorMessage(error))
      })

    return () => {
      active = false
    }
  }, [connectionId, connectionAttempt])

  const resolvedConnectionId = connectionState.status === 'ready' ? connectionState.connection.id : null

  useEffect(() => {
    if (resolvedConnectionId === null) {
      return
    }

    let active = true

    setContactsLoading(true)

    const unsubscribe = subscribeToContacts(
      resolvedConnectionId,
      (snapshot) => {
        if (!active) {
          return
        }

        setContacts(snapshot)
        setContactsError(null)
        setContactsLoading(false)
      },
      (error) => {
        if (!active) {
          return
        }

        setContactsLoading(false)
        setContactsError(dataErrorMessage(error, CONTACTS_ERROR_MESSAGE))
      },
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [resolvedConnectionId, contactsAttempt])

  const handleSubmit = useCallback(
    async ({ name, phone }: { name: string; phone: string }) => {
      if (resolvedConnectionId === null) {
        return
      }

      if (editing === null) {
        await createContact({ connectionId: resolvedConnectionId, name, phone })
      } else {
        await updateContact(editing.id, { name, phone })
      }

      setFormOpen(false)
    },
    [resolvedConnectionId, editing],
  )

  if (connectionState.status === 'loading') {
    return (
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-24">
        <CircularProgress size={22} thickness={5} />
        <Typography variant="body2" color="text.secondary">
          Abrindo conexão…
        </Typography>
      </div>
    )
  }

  if (connectionState.status === 'missing') {
    return (
      <div className="space-y-6">
        <Typography component="h1" variant="h1">
          Contatos
        </Typography>
        <ErrorNotice
          message={CONNECTION_MISSING_MESSAGE}
          action={{
            label: 'Voltar para conexões',
            onClick: goBack,
          }}
        />
      </div>
    )
  }

  if (connectionState.status === 'error') {
    return (
      <div className="space-y-6">
        <Typography component="h1" variant="h1">
          Contatos
        </Typography>
        <ErrorNotice
          message={CONNECTION_ERROR_MESSAGE}
          action={{
            label: 'Tentar novamente',
            onClick: () => setConnectionAttempt((current) => current + 1),
          }}
        />
      </div>
    )
  }

  const countLabel = contacts.length === 1 ? '1 contato' : `${contacts.length} contatos`

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Typography component="h1" variant="h1">
          Contatos
        </Typography>
        <Typography variant="body2" className="break-words">
          Conexão: <span className="font-medium text-slate-900">{connectionState.connection.name}</span>
          {contactsLoading ? ' · carregando…' : ` · ${countLabel}`}
        </Typography>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button onClick={goBack} color="inherit" className="self-start">
          Voltar
        </Button>

        <Button
          variant="contained"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
        >
          Novo contato
        </Button>
      </div>

      <ContactList
        contacts={contacts}
        loading={contactsLoading}
        error={contactsError}
        onRetry={() => setContactsAttempt((current) => current + 1)}
        onCreate={() => {
          setEditing(null)
          setFormOpen(true)
        }}
        onEdit={(contact) => {
          setEditing(contact)
          setFormOpen(true)
        }}
        onDelete={setDeleting}
      />

      <ContactDialog
        open={formOpen}
        contact={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={deleting !== null}
        name={deleting?.name ?? ''}
        title="Excluir contato?"
        description="O contato {{name}} será removido permanentemente. Esta ação não pode ser desfeita."
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteContact(deleting!.id)}
      />
    </div>
  )
}
