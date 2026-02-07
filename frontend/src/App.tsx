import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Parameters from './pages/Parameters'

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

            {/* Placeholder routes - will be implemented in next phase */}
            <Route path="tanks" element={<div className="text-center py-12 text-gray-600">Tanks page coming soon...</div>} />
            <Route path="photos" element={<div className="text-center py-12 text-gray-600">Photos page coming soon...</div>} />
            <Route path="notes" element={<div className="text-center py-12 text-gray-600">Notes page coming soon...</div>} />
            <Route path="maintenance" element={<div className="text-center py-12 text-gray-600">Maintenance page coming soon...</div>} />
            <Route path="livestock" element={<div className="text-center py-12 text-gray-600">Livestock page coming soon...</div>} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
