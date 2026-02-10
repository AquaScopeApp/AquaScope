import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { isLocalMode } from './platform'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/Layout'
import OfflineBanner from './components/OfflineBanner'
import './i18n/config' // Initialize i18n
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
import Consumables from './pages/Consumables'
import ICPTests from './pages/ICPTests'
import Photos from './pages/Photos'
import Notes from './pages/Notes'
import Admin from './pages/Admin'

const Welcome = lazy(() => import('./pages/Welcome'))

const local = isLocalMode()

function App() {
  return (
    <Router>
      <AuthProvider>
        {!local && <OfflineBanner />}
        <Routes>
          {/* Public Routes — only in web mode */}
          {!local && <Route path="/login" element={<Login />} />}
          {!local && <Route path="/register" element={<Register />} />}

          {/* Welcome/onboarding — only in local mode */}
          {local && (
            <Route path="/welcome" element={
              <Suspense fallback={null}><Welcome /></Suspense>
            } />
          )}

          {/* Main app routes — wrapped in ProtectedRoute for web, direct for local */}
          <Route
            path="/"
            element={
              local ? <Layout /> : <ProtectedRoute><Layout /></ProtectedRoute>
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
            <Route path="consumables" element={<Consumables />} />
            <Route path="icp-tests" element={<ICPTests />} />
            <Route path="photos" element={<Photos />} />
            <Route path="notes" element={<Notes />} />
            {!local && <Route path="admin" element={<Admin />} />}
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
