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
        <p>PATRON · Diocese-wide parish registry and staff provisioning</p>
      </footer>
    </div>
  )
}
