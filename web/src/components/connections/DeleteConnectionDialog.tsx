import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog'
import type { Connection } from '@/types'

type DeleteConnectionDialogProps = {
  connection: Connection | null
  onClose: () => void
  onConfirm: (id: string) => Promise<void>
}

export const DeleteConnectionDialog = ({
  connection,
  onClose,
  onConfirm,
}: DeleteConnectionDialogProps) => {
  const open = connection !== null

  return (
    <ConfirmDeleteDialog
      open={open}
      name={connection?.name ?? ''}
      title="Excluir conexão?"
      description="A conexão {{name}} e todos os contatos e broadcasts vinculados serão removidos permanentemente. Esta ação não pode ser desfeita."
      onClose={onClose}
      onConfirm={() => onConfirm(connection!.id)}
    />
  )
}
