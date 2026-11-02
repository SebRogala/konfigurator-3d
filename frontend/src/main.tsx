import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MOCK_CATALOG } from './catalog/catalog.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App catalog={MOCK_CATALOG} />
  </StrictMode>,
)
