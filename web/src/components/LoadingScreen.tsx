import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

type LoadingScreenProps = {
  message?: string
}

export const LoadingScreen = ({ message = 'Carregando…' }: LoadingScreenProps) => (
  <Box
    role="status"
    aria-live="polite"
    className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-slate-50"
  >
    <CircularProgress size={22} thickness={5} />
    <Typography variant="body2" color="text.secondary">
      {message}
    </Typography>
  </Box>
)
