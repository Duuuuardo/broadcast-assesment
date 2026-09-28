import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ConnectionDialog } from '@/components/connections/ConnectionDialog'
import { ConnectionList } from '@/components/connections/ConnectionList'
import { DeleteConnectionDialog } from '@/components/connections/DeleteConnectionDialog'
import {
  createConnection,
  deleteConnection,
  subscribeToConnections,
  updateConnection,
} from '@/services/connections'
import type { Connection } from '@/types'
import { dataErrorMessage } from '@/utils/data-errors'

const LOAD_ERROR_MESSAGE = 'Não foi possível carregar suas conexões. Tente novamente.'

export const HomePage = () => {
  const navigate = useNavigate()

  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Connection | null>(null)
  const [deleting, setDeleting] = useState<Connection | null>(null)

  useEffect(() => {
    setLoading(true)

    const unsubscribe = subscribeToConnections(
      (snapshot) => {
        setConnections(snapshot)
        setLoadError(null)
        setLoading(false)
      },
      (error) => {
        setLoading(false)
        setLoadError(dataErrorMessage(error, LOAD_ERROR_MESSAGE))
      },
    )

    return unsubscribe
  }, [subscription])

  const openCreateDialog = useCallback(() => {
    setEditing(null)
    setFormOpen(true)
  }, [])

  const openEditDialog = useCallback((connection: Connection) => {
    setEditing(connection)
    setFormOpen(true)
  }, [])

  const handleSubmit = useCallback(
    async (name: string) => {
      if (editing === null) {
        await createConnection({ name })
      } else {
        await updateConnection(editing.id, { name })
      }

      setFormOpen(false)
    },
    [editing],
  )

  const handleRetry = useCallback(() => {
    setSubscription((current) => current + 1)
  }, [])

  const showContacts = useCallback(
    (connectionId: string) => {
      navigate(`/connections/${connectionId}/contacts`)
    },
    [navigate],
  )

  const countLabel = connections.length === 1 ? '1 conexão' : `${connections.length} conexões`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Typography component="h1" variant="h1">
            Conexões
          </Typography>
          <Typography variant="body2" className="mt-1">
            {loading ? 'Carregando…' : countLabel}
          </Typography>
        </div>

        <Button
          variant="contained"
          onClick={openCreateDialog}
          sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
        >
          Nova conexão
        </Button>
      </div>

      <ConnectionList
        connections={connections}
        loading={loading}
        error={loadError}
        onRetry={handleRetry}
        onCreate={openCreateDialog}
        onEdit={openEditDialog}
        onDelete={setDeleting}
        onShowContacts={showContacts}
      />

      <ConnectionDialog
        open={formOpen}
        connection={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <DeleteConnectionDialog
        connection={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={deleteConnection}
      />
    </div>
  )
}
