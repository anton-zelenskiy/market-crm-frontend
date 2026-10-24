import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './crm/crm.css'
import App from './App.tsx'
import { InitialDataProvider } from './ssr/InitialData'

const container = document.getElementById('root')!

const app = (
  <StrictMode>
    <InitialDataProvider value={window.__INITIAL_DATA__ ?? {}}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </InitialDataProvider>
  </StrictMode>
)

// Landing pages arrive server-rendered; CRM pages arrive as an empty shell
if (container.firstElementChild) {
  hydrateRoot(container, app)
} else {
  createRoot(container).render(app)
}
