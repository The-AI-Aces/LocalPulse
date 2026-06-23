import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import ReportPage from './pages/ReportPage'
import FeedPage from './pages/FeedPage'
import './App.css'
import { AuthorityProvider } from './AuthorityContext'
import AuthorityLogin from './AuthorityLogin'
import NotificationBell from './NotificationBell'
import EventsPage from './pages/EventsPage'
import DirectoryPage from './pages/DirectoryPage'
import ProfilePage from './pages/ProfilePage'
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
          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')}>
            Profile
          </NavLink>
        </nav>
        <AuthorityLogin />
      </div>

      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
    </AuthorityProvider>
  )
}

export default App