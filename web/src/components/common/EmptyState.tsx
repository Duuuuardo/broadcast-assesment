import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'

type EmptyStateProps = {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}

export const EmptyState = ({ title, description, actionLabel, onAction }: EmptyStateProps) => (
  <Card>
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <Typography component="h2" variant="h2">
        {title}
      </Typography>
      <Typography variant="body2" className="max-w-sm">
        {description}
      </Typography>
      <Button variant="contained" onClick={onAction} className="mt-1">
        {actionLabel}
      </Button>
    </div>
  </Card>
)
