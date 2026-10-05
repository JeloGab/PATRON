import { Navigate, Route, Routes } from 'react-router-dom'
import { ParishProvider } from './context/ParishContext.jsx'
import PriestLayout from './layouts/PriestLayout.jsx'
import { getSession } from './lib/session.js'
import Login from './pages/Login.jsx'
import MyCalendar from './pages/MyCalendar.jsx'
import PendingApprovals from './pages/PendingApprovals.jsx'
import UnavailableDate from './pages/UnavailableDate.jsx'

function RequirePriest() {
  if (!getSession()) return <Navigate to="/login" replace />
  return <PriestLayout />
}

export default function App() {
  return (
    <ParishProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequirePriest />}>
          <Route index element={<MyCalendar />} />
          <Route path="unavailable" element={<UnavailableDate />} />
          <Route path="approvals" element={<PendingApprovals />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ParishProvider>
  )
}
