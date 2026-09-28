import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
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
import type { Connection } from '@/types'
import { formatTimestamp } from '@/utils/format-timestamp'

type ConnectionListProps = {
  connections: Connection[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onCreate: () => void
  onEdit: (connection: Connection) => void
  onDelete: (connection: Connection) => void
  onShowContacts: (connectionId: string) => void
}

const SKELETON_ROWS = 3

export const ConnectionList = ({
  connections,
  loading,
  error,
  onRetry,
  onCreate,
  onEdit,
  onDelete,
  onShowContacts,
}: ConnectionListProps) => {
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

  if (!loading && connections.length === 0) {
    return (
      <EmptyState
        title="Nenhuma conexão ainda"
        description="Crie sua primeira conexão para começar a enviar mensagens."
        actionLabel="Nova conexão"
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
              <TableCell>Nome</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, width: 190 }}>
                Criada em
              </TableCell>
              <TableCell align="right" sx={{ width: { xs: 190, sm: 240 } }}>
                Ações
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading
              ? Array.from({ length: SKELETON_ROWS }, (_row, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton animation="wave" width={`${60 + index * 15}%`} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Skeleton animation="wave" width={130} />
                    </TableCell>
                    <TableCell align="right">
                      <Skeleton animation="wave" width={150} />
                    </TableCell>
                  </TableRow>
                ))
              : connections.map((connection) => (
                  <TableRow key={connection.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" className="break-words">
                        {connection.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        className="break-words sm:hidden"
                        sx={{ mt: 0.25 }}
                      >
                        {formatTimestamp(connection.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2">{formatTimestamp(connection.createdAt)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex flex-wrap justify-end">
                        <Button
                          size="small"
                          onClick={() => onShowContacts(connection.id)}
                          aria-label={`Ver contatos de ${connection.name}`}
                          sx={{ px: 1 }}
                        >
                          Contatos
                        </Button>
                        <Button
                          size="small"
                          onClick={() => onEdit(connection)}
                          aria-label={`Editar ${connection.name}`}
                          sx={{ px: 1 }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => onDelete(connection)}
                          aria-label={`Excluir ${connection.name}`}
                          sx={{ px: 1 }}
                        >
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  )
}
