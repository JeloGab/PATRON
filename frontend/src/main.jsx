import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { consumeAuthFragment } from './lib/authFragment.js'
import './index.css'

// BEFORE HashRouter, never after. Supabase returns from a recovery or confirmation
// email with its tokens in the URL fragment, which is exactly where HashRouter keeps
// the route — so the fragment has to be claimed and rewritten while react-router is
// still unaware of it. Mount first and the token is already gone.
consumeAuthFragment()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
