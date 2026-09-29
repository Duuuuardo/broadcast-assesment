import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorNotice } from '@/components/common/ErrorNotice'
import type { Message } from '@/types'
import { formatTimestamp } from '@/utils/format-timestamp'

type BroadcastListProps = {
  messages: Message[]
  connectionsMap: Record<string, string>
  loading: boolean
  error: string | null
  onRetry: () => void
  onCreate: () => void
  onEdit: (message: Message) => void
  onDelete: (message: Message) => void
}

const SKELETON_ROWS = 3

export const BroadcastList = ({
  messages,
  connectionsMap,
  loading,
  error,
  onRetry,
  onCreate,
  onEdit,
  onDelete,
}: BroadcastListProps) => {
  if (error !== null) {
    return (
      <ErrorNotice
        message={error}
        action={{
          label: 'Tentar novamente',
          onClick: onRetry,
        }}
      />
    )
  }

  if (!loading && messages.length === 0) {
    return (
      <EmptyState
        title="Nenhum broadcast criado ainda"
        description="Crie seu primeiro broadcast para enviar ou agendar mensagens."
        actionLabel="Novo broadcast"
        onAction={onCreate}
      />
    )
  }

  return (
    <Card>
      <TableContainer>
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 130 }}>Status</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, width: 180 }}>
                Conexão
              </TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, width: 110 }}>
                Contatos
              </TableCell>
              <TableCell>Mensagem</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: 190 }}>
                Data
              </TableCell>
              <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' }, width: 170 }}>
                Ações
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading
              ? Array.from({ length: SKELETON_ROWS }, (_row, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton animation="wave" width={80} height={24} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Skeleton animation="wave" width={120} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Skeleton animation="wave" width={60} />
                    </TableCell>
                    <TableCell>
                      <Skeleton animation="wave" width={`${70 + index * 10}%`} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Skeleton animation="wave" width={130} />
                    </TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Skeleton animation="wave" width={110} />
                    </TableCell>
                  </TableRow>
                ))
              : messages.map((message) => {
                  const isScheduled = message.status === 'scheduled'
                  const connectionName = connectionsMap[message.connectionId] ?? 'Conexão removida'
                  const contactsCount = message.contactIds.length
                  const contactsLabel = `${contactsCount} ${contactsCount === 1 ? 'contato' : 'contatos'}`
                  const displayDate = isScheduled
                    ? formatTimestamp(message.scheduledAt)
                    : formatTimestamp(message.sentAt ?? message.createdAt)

                  const actions = (
                    <>
                      {isScheduled && (
                        <Button
                          size="small"
                          onClick={() => onEdit(message)}
                          aria-label="Editar broadcast agendado"
                          sx={{ px: 1 }}
                        >
                          Editar
                        </Button>
                      )}
                      <Button
                        size="small"
                        color="error"
                        onClick={() => onDelete(message)}
                        aria-label="Excluir broadcast"
                        sx={{ px: 1 }}
                      >
                        Excluir
                      </Button>
                    </>
                  )

                  return (
                    <TableRow key={message.id} hover>
                      <TableCell>
                        <Chip
                          label={isScheduled ? 'Agendada' : 'Enviada'}
                          size="small"
                          color={isScheduled ? 'warning' : 'success'}
                          variant="outlined"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>

                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Typography variant="body2" className="break-words font-medium">
                          {connectionName}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Typography variant="body2" color="text.secondary">
                          {contactsLabel}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="body2"
                          className="line-clamp-2 break-words"
                          title={message.content}
                        >
                          {message.content}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          className="mt-0.5 block sm:hidden"
                        >
                          {connectionName} · {contactsLabel} · {displayDate}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          className="mt-0.5 hidden sm:block md:hidden"
                        >
                          {displayDate}
                        </Typography>

                        <div className="mt-1 flex flex-wrap sm:hidden">{actions}</div>
                      </TableCell>

                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="body2" color="text.secondary">
                          {displayDate}
                        </Typography>
                      </TableCell>

                      <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <div className="flex flex-wrap justify-end">{actions}</div>
                      </TableCell>
                    </TableRow>
                  )
                })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  )
}
