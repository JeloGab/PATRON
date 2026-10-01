import { Navigate, Route, Routes } from 'react-router-dom'
import UserLayout from './layouts/UserLayout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ChurchDetail from './pages/ChurchDetail.jsx'
import RequestDocument from './pages/RequestDocument.jsx'
import MyRequests from './pages/MyRequests.jsx'
import Verify from './pages/Verify.jsx'
import { getSession } from './lib/session.js'

function RequireUser({ children }) {
  if (!getSession()) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify" element={<Verify />} />
      <Route
        path="/"
        element={
          <RequireUser>
            <UserLayout />
          </RequireUser>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="parish/:id" element={<ChurchDetail />} />
        <Route path="parish/:id/request" element={<RequestDocument />} />
        <Route path="requests" element={<MyRequests />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
