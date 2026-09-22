import { Navigate, Route, Routes } from 'react-router-dom'
import UserLayout from './layouts/UserLayout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ChurchDetail from './pages/ChurchDetail.jsx'
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
        <Route path="verify" element={<Verify />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
