import { Navigate, Route, Routes } from 'react-router-dom'
import { EventsProvider } from './context/EventsContext.jsx'
import { OfficeProvider } from './context/OfficeContext.jsx'
import { ParishProvider } from './context/ParishContext.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import ManagerLayout from './layouts/ManagerLayout.jsx'
import PriestLayout from './layouts/PriestLayout.jsx'
import UserLayout from './layouts/UserLayout.jsx'
import { getSession, landingFor } from './lib/session.js'
import Announcements from './pages/Announcements.jsx'
import ChangePassword from './pages/ChangePassword.jsx'
import BlockDate from './pages/BlockDate.jsx'
import ChurchDetail from './pages/ChurchDetail.jsx'
import CreateEvent from './pages/CreateEvent.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DocumentRequests from './pages/DocumentRequests.jsx'
import EventScheduling from './pages/EventScheduling.jsx'
import Login from './pages/Login.jsx'
import Managers from './pages/Managers.jsx'
import MyCalendar from './pages/MyCalendar.jsx'
import MyRequests from './pages/MyRequests.jsx'
import ParishDirectory from './pages/ParishDirectory.jsx'
import PendingApprovals from './pages/PendingApprovals.jsx'
import RegisteredParishes from './pages/RegisteredParishes.jsx'
import RequestDocument from './pages/RequestDocument.jsx'
import SacramentApplications from './pages/SacramentApplications.jsx'
import SacramentalRecords from './pages/SacramentalRecords.jsx'
import UnavailableDate from './pages/UnavailableDate.jsx'
import Verify from './pages/Verify.jsx'

function RequireRole({ role, children }) {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  // A temporary password reaches no route but /change-password — everything behind
  // these layouts answers PASSWORD_CHANGE_REQUIRED 403 — so send them there rather
  // than render a page where every request fails.
  if (session.mustChangePassword) return <Navigate to="/change-password" replace />
  if (session.role !== role) return <Navigate to={landingFor(session)} replace />
  return children
}

function HomeRedirect() {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={landingFor(session)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/verify/:code" element={<Verify />} />
      <Route path="/change-password" element={<ChangePassword />} />

      <Route
        path="/admin"
        element={
          <RequireRole role="sysadmin">
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<RegisteredParishes />} />
      </Route>

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
        <Route path="managers" element={<Managers />} />
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

      <Route
        path="/user"
        element={
          <RequireRole role="parishioner">
            <UserLayout />
          </RequireRole>
        }
      >
        <Route index element={<ParishDirectory />} />
        <Route path="parish/:id" element={<ChurchDetail />} />
        <Route path="parish/:id/request" element={<RequestDocument />} />
        <Route path="requests" element={<MyRequests />} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
