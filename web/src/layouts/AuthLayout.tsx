import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

type AuthLayoutProps = {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}

const Wordmark = () => (
  <span className="inline-flex items-center gap-2">
    <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-slate-900 text-[11px] font-semibold leading-none text-white">
      B
    </span>
    <span className="text-[15px] font-semibold tracking-tight text-slate-900">Broadcast</span>
  </span>
)

export const AuthLayout = ({ title, description, children, footer }: AuthLayoutProps) => (
  <Box className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-slate-50 px-4 py-12">
    <Wordmark />

    <Card className="w-full max-w-[400px]">
      <CardContent className="px-7 py-7">
        <div className="mb-7 space-y-1.5">
          <Typography component="h1" variant="h2">
            {title}
          </Typography>
          <Typography variant="body2">{description}</Typography>
        </div>

        {children}
      </CardContent>
    </Card>

    <div className="w-full max-w-[400px] text-center">{footer}</div>
  </Box>
)
