import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ClerkProvider } from '@clerk/react'
import { initMonitoring } from '@/lib/monitoring'
import './index.css'
import App from './App.tsx'
import SharePage from './pages/SharePage.tsx'

// Initialize monitoring FIRST (before any rendering)
initMonitoring();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public share route — no auth wrapper */}
        <Route path="/share/:token" element={<SharePage />} />

        {/* Main authenticated app — all other paths */}
        <Route
          path="/*"
          element={
            <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
              <App />
            </ClerkProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
