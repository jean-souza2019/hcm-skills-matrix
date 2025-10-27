import { screen } from '@testing-library/react'

import { LoginPage } from './LoginPage'
import { renderWithProviders } from '../../test/utils'

describe('LoginPage', () => {
  it('renders login form elements', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByText('Acesse sua conta')).toBeInTheDocument()
    expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument()
  })
})
