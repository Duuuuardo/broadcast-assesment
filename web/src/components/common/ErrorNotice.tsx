import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'

type ErrorNoticeProps = {
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const ErrorNotice = ({ message, action }: ErrorNoticeProps) => (
  <Card>
    <div className="px-6 py-10">
      <Alert
        severity="error"
        variant="outlined"
        role="alert"
        action={
          action === undefined ? undefined : (
            <Button color="inherit" size="small" onClick={action.onClick}>
              {action.label}
            </Button>
          )
        }
      >
        {message}
      </Alert>
    </div>
  </Card>
)
