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
import type { Contact } from '@/types'
import { formatTimestamp } from '@/utils/format-timestamp'

type ContactListProps = {
  contacts: Contact[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onCreate: () => void
  onEdit: (contact: Contact) => void
  onDelete: (contact: Contact) => void
}

const SKELETON_ROWS = 3

export const ContactList = ({
  contacts,
  loading,
  error,
  onRetry,
  onCreate,
  onEdit,
  onDelete,
}: ContactListProps) => {
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

  if (!loading && contacts.length === 0) {
    return (
      <EmptyState
        title="Nenhum contato ainda"
        description="Adicione contatos para poder enviar broadcasts."
        actionLabel="Novo contato"
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
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Telefone</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: 190 }}>
                Criado em
              </TableCell>
              <TableCell align="right" sx={{ width: { xs: 170, sm: 190 } }}>
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
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Skeleton animation="wave" width={130} />
                    </TableCell>
                    <TableCell align="right">
                      <Skeleton animation="wave" width={110} />
                    </TableCell>
                  </TableRow>
                ))
              : contacts.map((contact) => (
                  <TableRow key={contact.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" className="break-words">
                        {contact.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        className="break-words sm:hidden"
                        sx={{ mt: 0.25 }}
                      >
                        {contact.phone}
                      </Typography>
                      <Typography
                        variant="body2"
                        className="break-words md:hidden"
                        sx={{ mt: 0.25, display: { xs: 'none', sm: 'block', md: 'none' } }}
                      >
                        {formatTimestamp(contact.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" className="break-words">
                        {contact.phone}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2">{formatTimestamp(contact.createdAt)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex flex-wrap justify-end">
                        <Button
                          size="small"
                          onClick={() => onEdit(contact)}
                          aria-label={`Editar ${contact.name}`}
                          sx={{ px: 1 }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => onDelete(contact)}
                          aria-label={`Excluir ${contact.name}`}
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
