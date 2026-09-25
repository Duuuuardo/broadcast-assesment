import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1f4fd8',
      light: '#5b7fe8',
      dark: '#16399e',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#475569',
    },
    success: {
      main: '#15803d',
    },
    warning: {
      main: '#b45309',
    },
    error: {
      main: '#b91c1c',
    },
    background: {
      default: '#f6f7f9',
      paper: '#ffffff',
    },
    divider: '#e2e5ea',
    text: {
      primary: '#111827',
      secondary: '#5b6472',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: '1.875rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h2: {
      fontSize: '1.375rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.125rem',
      fontWeight: 600,
    },
    subtitle2: {
      fontWeight: 600,
    },
    body2: {
      color: '#5b6472',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          borderColor: '#e2e5ea',
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
})
