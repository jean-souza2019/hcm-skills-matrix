import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'

import App from './App'
import { AppProviders } from './providers/AppProviders'
import './index.css'

const isElectron =
  typeof navigator !== 'undefined' &&
  navigator.userAgent.toLowerCase().includes('electron')

const Router = isElectron ? HashRouter : BrowserRouter

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <Router>
      <AppProviders>
        <App />
      </AppProviders>
    </Router>
  </StrictMode>,
)
