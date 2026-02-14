import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ModuleSettingsProvider } from './hooks/useModuleSettings'
import { RegionalSettingsProvider } from './hooks/useRegionalSettings'
import { ThemeProvider } from './hooks/useTheme'
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
import Finances from './pages/Finances'
import Feeding from './pages/Feeding'
import Diseases from './pages/Diseases'
import Lighting from './pages/Lighting'
import WaterChangeCalculator from './pages/WaterChangeCalculator'
import PublicTankProfile from './pages/PublicTankProfile'
import Setup from './pages/Setup'

const Welcome = lazy(() => import('./pages/Welcome'))

const local = isLocalMode()

function App() {
  return (
    <ThemeProvider>
    <Router>
      <AuthProvider>
        <ModuleSettingsProvider>
        <RegionalSettingsProvider>
        {!local && <OfflineBanner />}
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600" /></div>}>
        <Routes>
          {/* Public Routes — only in web mode */}
          {!local && <Route path="/login" element={<Login />} />}
          {!local && <Route path="/register" element={<Register />} />}
          <Route path="/share/tank/:shareToken" element={<PublicTankProfile />} />

          {/* Regional setup — post-registration onboarding (web mode) */}
          {!local && <Route path="/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />}

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
            <Route path="finances" element={<Finances />} />
            <Route path="feeding" element={<Feeding />} />
            <Route path="diseases" element={<Diseases />} />
            <Route path="lighting" element={<Lighting />} />
            <Route path="water-change-calculator" element={<WaterChangeCalculator />} />
            {!local && <Route path="admin" element={<Admin />} />}
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
        </RegionalSettingsProvider>
        </ModuleSettingsProvider>
      </AuthProvider>
    </Router>
    </ThemeProvider>
  )
}

export default App
