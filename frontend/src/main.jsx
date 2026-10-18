// consumeAuthFragment() runs before HashRouter mounts — see lib/authFragment.js.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { consumeAuthFragment } from './lib/authFragment.js'
import './index.css'

consumeAuthFragment()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
