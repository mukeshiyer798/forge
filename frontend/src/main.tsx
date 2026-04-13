import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initMonitoring } from '@/lib/monitoring'
import './index.css'
import App from './App.tsx'

// Initialize monitoring FIRST (before any rendering)
initMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
