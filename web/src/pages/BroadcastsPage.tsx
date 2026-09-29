import Button from '@mui/material/Button'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { BroadcastEditDialog } from '@/components/broadcasts/BroadcastEditDialog'
import { BroadcastList } from '@/components/broadcasts/BroadcastList'
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog'
import { subscribeToConnections } from '@/services/connections'
import {
  deleteMessage,
  subscribeToMessages,
  updateMessage,
  type MessageFilters,
} from '@/services/messages'
import type { Connection, Message, MessageStatus } from '@/types'
import { dataErrorMessage } from '@/utils/data-errors'

const LOAD_ERROR_MESSAGE = 'Não foi possível carregar suas mensagens. Tente novamente.'

type StatusFilterTab = 'all' | MessageStatus

export const BroadcastsPage = () => {
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<StatusFilterTab>('all')
  const [messages, setMessages] = useState<Message[]>([])
  const [connectionsMap, setConnectionsMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [subscriptionAttempt, setSubscriptionAttempt] = useState(0)

  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [deletingMessage, setDeletingMessage] = useState<Message | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToConnections((connectionsList: Connection[]) => {
      const map: Record<string, string> = {}
      for (const conn of connectionsList) {
        map[conn.id] = conn.name
      }
      setConnectionsMap(map)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    setLoading(true)

    const filters: MessageFilters = {}
    if (activeTab === 'scheduled') {
      filters.status = 'scheduled'
      filters.orderBy = 'scheduledAt'
    } else if (activeTab === 'sent') {
      filters.status = 'sent'
      filters.orderBy = 'createdAt'
    } else {
      filters.orderBy = 'createdAt'
    }

    let active = true

    const unsubscribe = subscribeToMessages(
      filters,
      (snapshot) => {
        if (!active) return
        setMessages(snapshot)
        setLoadError(null)
        setLoading(false)
      },
      (error) => {
        if (!active) return
        setLoading(false)
        setLoadError(dataErrorMessage(error, LOAD_ERROR_MESSAGE))
      },
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [activeTab, subscriptionAttempt])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: StatusFilterTab) => {
    setActiveTab(newValue)
  }

  const handleCreate = useCallback(() => {
    navigate('/broadcasts/new')
  }, [navigate])

  const handleRetry = useCallback(() => {
    setSubscriptionAttempt((current) => current + 1)
  }, [])

  const handleEditSave = useCallback(
    async ({
      content,
      contactIds,
      scheduledAt,
    }: {
      content: string
      contactIds: string[]
      scheduledAt: Date
    }) => {
      if (editingMessage === null) return
      await updateMessage(editingMessage.id, { content, contactIds, scheduledAt })
      setEditingMessage(null)
    },
    [editingMessage],
  )

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingMessage === null) return
    await deleteMessage(deletingMessage.id)
    setDeletingMessage(null)
  }, [deletingMessage])

  const countLabel =
    messages.length === 1 ? '1 broadcast' : `${messages.length} broadcasts`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Typography component="h1" variant="h1">
            Broadcasts
          </Typography>
          <Typography variant="body2" className="mt-1">
            {loading ? 'Carregando…' : countLabel}
          </Typography>
        </div>

        <Button
          variant="contained"
          onClick={handleCreate}
          sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
        >
          Novo broadcast
        </Button>
      </div>

      <div className="border-b border-slate-200">
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Filtro de status dos broadcasts"
        >
          <Tab label="Todos" value="all" />
          <Tab label="Agendadas" value="scheduled" />
          <Tab label="Enviadas" value="sent" />
        </Tabs>
      </div>

      <BroadcastList
        messages={messages}
        connectionsMap={connectionsMap}
        loading={loading}
        error={loadError}
        onRetry={handleRetry}
        onCreate={handleCreate}
        onEdit={setEditingMessage}
        onDelete={setDeletingMessage}
      />

      <BroadcastEditDialog
        open={editingMessage !== null}
        message={editingMessage}
        connectionName={
          editingMessage ? (connectionsMap[editingMessage.connectionId] ?? 'Conexão removida') : ''
        }
        onClose={() => setEditingMessage(null)}
        onSave={handleEditSave}
      />

      <ConfirmDeleteDialog
        open={deletingMessage !== null}
        name="este broadcast"
        title="Excluir broadcast?"
        description="Essa ação não pode ser desfeita."
        onClose={() => setDeletingMessage(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
