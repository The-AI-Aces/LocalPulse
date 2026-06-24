import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useState } from 'react'
import ReportPage from './pages/ReportPage'
import FeedPage from './pages/FeedPage'
import EventsPage from './pages/EventsPage'
import DirectoryPage from './pages/DirectoryPage'
import ProfilePage from './pages/ProfilePage'
import { AuthorityProvider, useAuthority } from './AuthorityContext'
import { LanguageProvider, useLanguage } from './LanguageContext'
import AuthGate from './AuthGate'
import AccountStatus from './AccountStatus'
import NotificationBell from './NotificationBell'
import LanguageSwitcher from './LanguageSwitcher'
import './App.css'

function Gate() {
  const { isAuthority, isLoggedIn, loading } = useAuthority()
  const [guestActive, setGuestActive] = useState(
    localStorage.getItem('localpulse_guest_active') === 'true'
  )

  function grantGuestAccess() {
    localStorage.setItem('localpulse_guest_active', 'true')
    setGuestActive(true)
  }

  function switchAccount() {
    localStorage.removeItem('localpulse_guest_active')
    setGuestActive(false)
  }

  if (loading) return null

  const hasAccess = isAuthority || isLoggedIn || guestActive

  if (!hasAccess) {
    return <AuthGate onGuestAccess={grantGuestAccess} />
  }

  return <AppContent onSwitchAccount={switchAccount} />
}

function AppContent({ onSwitchAccount }) {
  const { t } = useLanguage()

  return (
    <BrowserRouter>
      <div className="top-bar">
        <h1>{t('appName')}</h1>
        <NotificationBell />
        <LanguageSwitcher />
        <AccountStatus onSwitchAccount={onSwitchAccount} />
        <nav className="tab-nav">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>{t('feed')}</NavLink>
          <NavLink to="/report" className={({ isActive }) => (isActive ? 'active' : '')}>{t('report')}</NavLink>
          <NavLink to="/events" className={({ isActive }) => (isActive ? 'active' : '')}>{t('events')}</NavLink>
          <NavLink to="/directory" className={({ isActive }) => (isActive ? 'active' : '')}>{t('directory')}</NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')}>{t('profile')}</NavLink>
        </nav>
      </div>

      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <LanguageProvider>
      <AuthorityProvider>
        <Gate />
      </AuthorityProvider>
    </LanguageProvider>
  )
}

export default App