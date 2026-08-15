import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './meal-prayers.css'
import './calendar.css'
import App from './App.tsx'
import { CalendarLauncher } from './components/CalendarLauncher.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <CalendarLauncher />
  </StrictMode>,
)
