import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import ReportPage from './pages/ReportPage'
import FeedPage from './pages/FeedPage'
import './App.css'
import { AuthorityProvider } from './AuthorityContext'
import AuthorityLogin from './AuthorityLogin'
import NotificationBell from './NotificationBell'
import EventsPage from './pages/EventsPage'
import DirectoryPage from './pages/DirectoryPage'

function App() {
  return (
    <AuthorityProvider>
    <BrowserRouter>
      <div className="top-bar">
        <h1>LocalPulse</h1>
        <NotificationBell />
        <nav className="tab-nav">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
            Feed
          </NavLink>
          <NavLink to="/report" className={({ isActive }) => (isActive ? 'active' : '')}>
            Report
          </NavLink>
          <NavLink to="/events" className={({ isActive }) => (isActive ? 'active' : '')}>
            Events
          </NavLink>
          <NavLink to="/directory" className={({ isActive }) => (isActive ? 'active' : '')}>
            Directory
          </NavLink>
        </nav>
        <AuthorityLogin />
      </div>

      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </BrowserRouter>
    </AuthorityProvider>
  )
}

export default App