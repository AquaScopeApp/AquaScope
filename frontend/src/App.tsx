import { BrowserRouter as Router } from 'react-router-dom'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-b from-ocean-50 to-ocean-100">
        <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-ocean-900 mb-2">
              ReefLab
            </h1>
            <p className="text-ocean-700">
              Reef Aquarium Management System
            </p>
          </header>

          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-ocean-800 mb-4">
              Welcome to ReefLab
            </h2>
            <p className="text-gray-600">
              Your comprehensive solution for tracking reef parameters, maintenance schedules, and livestock.
            </p>
          </div>
        </div>
      </div>
    </Router>
  )
}

export default App
