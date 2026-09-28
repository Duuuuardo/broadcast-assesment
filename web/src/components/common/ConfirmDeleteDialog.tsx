import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

import { dataErrorMessage } from '@/utils/data-errors'

type ConfirmDeleteDialogProps = {
  open: boolean
  name: string
  title: string
  description: string
  confirmLabel?: string
  loadingLabel?: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

export const ConfirmDeleteDialog = ({
  open,
  name,
  title,
  description,
  confirmLabel = 'Excluir',
  loadingLabel = 'Excluindo…',
  onClose,
  onConfirm,
}: ConfirmDeleteDialogProps) => {
  const [displayName, setDisplayName] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setDisplayName(name)
  }, [open, name])

  const handleClose = () => {
    if (deleting) {
      return
    }

    setSubmitError(null)
    onClose()
  }

  const handleConfirm = async () => {
    if (deleting) {
      return
    }

    setSubmitError(null)
    setDeleting(true)

    try {
      await onConfirm()
      onClose()
    } catch (error) {
      setSubmitError(dataErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>

      <DialogContent>
        <div className="space-y-4 pt-1">
          {submitError !== null && (
            <Alert severity="error" variant="outlined" role="alert">
              {submitError}
            </Alert>
          )}

          <Typography variant="body2" color="text.primary">
            {description.replace('{{name}}', displayName)}
          </Typography>
        </div>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={deleting} color="inherit">
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={deleting}
          startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {deleting ? loadingLabel : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
