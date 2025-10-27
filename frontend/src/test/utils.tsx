import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { SnackbarProvider } from 'notistack'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { theme } from '../theme'
import '../i18n'

interface Options {
  route?: string
}

export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const route = options.route ?? '/'
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SnackbarProvider maxSnack={3} autoHideDuration={2000}>
            {ui}
          </SnackbarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}
