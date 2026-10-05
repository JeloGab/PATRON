import { Navigate, Route, Routes } from 'react-router-dom'
import { EventsProvider } from './context/EventsContext.jsx'
import { OfficeProvider } from './context/OfficeContext.jsx'
import { ParishProvider } from './context/ParishContext.jsx'
import ManagerLayout from './layouts/ManagerLayout.jsx'
import PriestLayout from './layouts/PriestLayout.jsx'
import { getSession, homeForRole } from './lib/session.js'
import Announcements from './pages/Announcements.jsx'
import BlockDate from './pages/BlockDate.jsx'
import CreateEvent from './pages/CreateEvent.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DocumentRequests from './pages/DocumentRequests.jsx'
import EventScheduling from './pages/EventScheduling.jsx'
import Login from './pages/Login.jsx'
import MyCalendar from './pages/MyCalendar.jsx'
import PendingApprovals from './pages/PendingApprovals.jsx'
import SacramentApplications from './pages/SacramentApplications.jsx'
import SacramentalRecords from './pages/SacramentalRecords.jsx'
import UnavailableDate from './pages/UnavailableDate.jsx'

function RequireRole({ role, children }) {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  if (session.role !== role) return <Navigate to={homeForRole(session.role)} replace />
  return children
}

function HomeRedirect() {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={homeForRole(session.role)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/priest"
        element={
          <RequireRole role="priest">
            <ParishProvider>
              <PriestLayout />
            </ParishProvider>
          </RequireRole>
        }
      >
        <Route index element={<MyCalendar />} />
        <Route path="unavailable" element={<UnavailableDate />} />
        <Route path="approvals" element={<PendingApprovals />} />
      </Route>

      <Route
        path="/manager"
        element={
          <RequireRole role="manager">
            <EventsProvider>
              <OfficeProvider>
                <ManagerLayout />
              </OfficeProvider>
            </EventsProvider>
          </RequireRole>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="schedule" element={<EventScheduling />} />
        <Route path="events/new" element={<CreateEvent />} />
        <Route path="events/block" element={<BlockDate />} />
        <Route path="applications" element={<SacramentApplications />} />
        <Route path="records" element={<SacramentalRecords />} />
        <Route path="documents" element={<DocumentRequests />} />
        <Route path="announcements" element={<Announcements />} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
