import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Parameters from './pages/Parameters'
import Tanks from './pages/Tanks'
import TankList from './pages/TankList'
import TankDetail from './pages/TankDetail'
import Maintenance from './pages/Maintenance'
import Livestock from './pages/Livestock'
import Equipment from './pages/Equipment'
import ICPTests from './pages/ICPTests'
import Photos from './pages/Photos'
import Notes from './pages/Notes'
import Admin from './pages/Admin'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Feature Routes */}
            <Route path="parameters" element={<Parameters />} />
            <Route path="tanks" element={<Tanks />}>
              <Route index element={<TankList />} />
              <Route path=":tankId" element={<TankDetail />} />
            </Route>
            <Route path="maintenance" element={<Maintenance />} />

            <Route path="livestock" element={<Livestock />} />
            <Route path="equipment" element={<Equipment />} />
            <Route path="icp-tests" element={<ICPTests />} />
            <Route path="photos" element={<Photos />} />
            <Route path="notes" element={<Notes />} />
            <Route path="admin" element={<Admin />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
