import { Outlet } from 'react-router-dom'
import TopNav from '../components/TopNav.jsx'

export default function ManagerLayout() {
  return (
    <div className="shell">
      <TopNav />
      <main className="stage">
        <Outlet />
      </main>
      <footer className="foot">
        <p>PATRON · Parish manager for sacramental schedules and parish office work</p>
      </footer>
    </div>
  )
}
