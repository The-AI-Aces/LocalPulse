import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import ReportPage from './pages/ReportPage'
import FeedPage from './pages/FeedPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="top-bar">
        <h1>LocalPulse</h1>
        <nav className="tab-nav">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
            Feed
          </NavLink>
          <NavLink to="/report" className={({ isActive }) => (isActive ? 'active' : '')}>
            Report
          </NavLink>
        </nav>
      </div>

      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App