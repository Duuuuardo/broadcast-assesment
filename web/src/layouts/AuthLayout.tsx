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

export const AuthLayout = ({ title, description, children, footer }: AuthLayoutProps) => (
  <Box className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-slate-50 px-4 py-12">
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
