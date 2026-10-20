// Every route in the app, and the role gate each one sits behind.

import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout.jsx'
import ManagerLayout from './layouts/ManagerLayout.jsx'
import PriestLayout from './layouts/PriestLayout.jsx'
import UserLayout from './layouts/UserLayout.jsx'
import { getSession, landingFor } from './lib/session.js'
import Account from './pages/public/Account.jsx'
import AnnouncementApprovals from './pages/priest/AnnouncementApprovals.jsx'
import Announcements from './pages/manager/Announcements.jsx'
import Feed from './pages/public/Feed.jsx'
import ChangePassword from './pages/public/ChangePassword.jsx'
import BlockDate from './pages/manager/BlockDate.jsx'
import ForgotPassword from './pages/public/ForgotPassword.jsx'
import ChurchDetail from './pages/user/ChurchDetail.jsx'
import CreateEvent from './pages/manager/CreateEvent.jsx'
import Dashboard from './pages/manager/Dashboard.jsx'
import DocumentApprovals from './pages/priest/DocumentApprovals.jsx'
import DocumentRequests from './pages/manager/DocumentRequests.jsx'
import EventScheduling from './pages/manager/EventScheduling.jsx'
import Login from './pages/public/Login.jsx'
import Managers from './pages/priest/Managers.jsx'
import MyCalendar from './pages/priest/MyCalendar.jsx'
import MyRequests from './pages/user/MyRequests.jsx'
import ParishDirectory from './pages/user/ParishDirectory.jsx'
import ParishProfile from './pages/shared/ParishProfile.jsx'
import PendingApprovals from './pages/priest/PendingApprovals.jsx'
import RegisteredParishes from './pages/admin/RegisteredParishes.jsx'
import RequestDocument from './pages/user/RequestDocument.jsx'
import ResetPassword from './pages/public/ResetPassword.jsx'
import EventRoster from './pages/manager/EventRoster.jsx'
import SacramentalRecords from './pages/manager/SacramentalRecords.jsx'
import Signup from './pages/public/Signup.jsx'
import UnavailableDate from './pages/priest/UnavailableDate.jsx'
import Verify from './pages/public/Verify.jsx'

function RequireRole({ role, children }) {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />

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
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/verify/:code" element={<Verify />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/account" element={<Account />} />

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
            <PriestLayout />
          </RequireRole>
        }
      >
        <Route index element={<MyCalendar />} />
        <Route path="unavailable" element={<UnavailableDate />} />
        <Route path="approvals" element={<PendingApprovals />} />
        <Route path="managers" element={<Managers />} />
        <Route path="documents" element={<DocumentApprovals />} />
        <Route path="announcements" element={<AnnouncementApprovals />} />
        <Route path="parish" element={<ParishProfile />} />
      </Route>

      <Route
        path="/manager"
        element={
          <RequireRole role="manager">
            <ManagerLayout />
          </RequireRole>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="schedule" element={<EventScheduling />} />
        <Route path="events/new" element={<CreateEvent />} />
        <Route path="events/block" element={<BlockDate />} />
        <Route path="roster" element={<EventRoster />} />
        <Route path="records" element={<SacramentalRecords />} />
        <Route path="documents" element={<DocumentRequests />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="parish" element={<ParishProfile />} />
      </Route>

      <Route element={<UserLayout />}>
        <Route path="/feed" element={<Feed />} />

        <Route
          path="/user"
          element={
            <RequireRole role="parishioner">
              <Outlet />
            </RequireRole>
          }
        >
          <Route index element={<ParishDirectory />} />
          <Route path="parish/:id" element={<ChurchDetail />} />
          <Route path="parish/:id/request" element={<RequestDocument />} />
          <Route path="requests" element={<MyRequests />} />
        </Route>
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
