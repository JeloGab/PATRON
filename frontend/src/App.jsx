import { Navigate, Route, Routes } from 'react-router-dom'
import { EventsProvider } from './context/EventsContext.jsx'
import { OfficeProvider } from './context/OfficeContext.jsx'
import ManagerLayout from './layouts/ManagerLayout.jsx'
import { getSession } from './lib/session.js'
import Announcements from './pages/Announcements.jsx'
import BlockDate from './pages/BlockDate.jsx'
import CreateEvent from './pages/CreateEvent.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DocumentRequests from './pages/DocumentRequests.jsx'
import EventScheduling from './pages/EventScheduling.jsx'
import Login from './pages/Login.jsx'
import SacramentApplications from './pages/SacramentApplications.jsx'
import SacramentalRecords from './pages/SacramentalRecords.jsx'

function RequireAdmin() {
  if (!getSession()) return <Navigate to="/login" replace />
  return <ManagerLayout />
}

export default function App() {
  return (
    <EventsProvider>
      <OfficeProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAdmin />}>
          <Route index element={<Dashboard />} />
          <Route path="schedule" element={<EventScheduling />} />
          <Route path="events/new" element={<CreateEvent />} />
          <Route path="events/block" element={<BlockDate />} />
          <Route path="applications" element={<SacramentApplications />} />
          <Route path="records" element={<SacramentalRecords />} />
          <Route path="documents" element={<DocumentRequests />} />
          <Route path="announcements" element={<Announcements />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </OfficeProvider>
    </EventsProvider>
  )
}
