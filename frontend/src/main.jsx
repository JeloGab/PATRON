// Both of these run before HashRouter mounts — see lib/authFragment.js and
// lib/oauthReturn.js. Supabase arrives in the fragment, Facebook in the query string.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import ConfirmProvider from './components/ConfirmProvider.jsx'
import { consumeAuthFragment } from './lib/authFragment.js'
import { consumeOauthReturn } from './lib/oauthReturn.js'
import './index.css'

consumeAuthFragment()
consumeOauthReturn()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </HashRouter>
  </StrictMode>,
)
