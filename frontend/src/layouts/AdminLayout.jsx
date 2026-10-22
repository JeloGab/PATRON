// The sysadmin shell: top bar plus an <Outlet /> for the admin routes.

import { Outlet } from 'react-router-dom'
import TopNav from '../components/TopNav.jsx'

export default function AdminLayout() {
  return (
    <div className="shell role-admin">
      <TopNav />

      <main className="stage">
        <Outlet />
      </main>

      <footer className="foot">
        <p>PATRON · Parish registry and staff provisioning</p>
      </footer>
    </div>
  )
}
