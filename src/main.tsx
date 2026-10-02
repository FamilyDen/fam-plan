import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import AppProviders from './components/AppProviders.tsx'
import './i18n/index.ts'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.MODE === 'production' ?
    import.meta.env.VITE_CLERK_PRODUCTION_PUBLISHABLE_KEY :
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
    throw new Error('Add your Clerk Publishable Key to the .env file')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders publishableKey={PUBLISHABLE_KEY}>
      <App />
    </AppProviders>
  </StrictMode>,
)
