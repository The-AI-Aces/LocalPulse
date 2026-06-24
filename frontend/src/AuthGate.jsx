import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuthority } from './AuthorityContext'

function getDeviceId() {
  let id = localStorage.getItem('localpulse_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('localpulse_device_id', id)
  }
  return id
}

function AuthGate({ onGuestAccess }) {
  const { login, signupResident } = useAuthority()

  const [userType, setUserType] = useState('resident') // 'resident' or 'authority'
  const [residentMode, setResidentMode] = useState('signup') // 'signup' | 'login' | 'guest'

  // Authority fields
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [showAuthPassword, setShowAuthPassword] = useState(false)

  // Resident login fields
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Resident signup fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [locationMethod, setLocationMethod] = useState('current') // 'current' | 'manual'
  const [manualAddress, setManualAddress] = useState('')
  const [homeLocation, setHomeLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

  // Guest fields
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestVillage, setGuestVillage] = useState('')
  const [guestDistrict, setGuestDistrict] = useState('')
  const [guestState, setGuestState] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  function useCurrentLocation() {
    setLocating(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHomeLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
        setLocating(false)
      },
      (err) => {
        setLocationError('Could not get location: ' + err.message)
        setLocating(false)
      }
    )
  }

  async function geocodeManualAddress() {
    if (!manualAddress.trim()) return
    setLocating(true)
    setLocationError('')
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualAddress)}`
      )
      const results = await res.json()
      if (results.length === 0) {
        setLocationError('Address not found. Try a different search.')
      } else {
        setHomeLocation({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) })
      }
    } catch {
      setLocationError('Search failed. Check your internet connection.')
    }
    setLocating(false)
  }

  async function handleAuthorityLogin(e) {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')
    const err = await login(authEmail, authPassword)
    setSubmitting(false)
    if (err) setMessage(err)
  }

  async function handleResidentLogin(e) {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')
    const err = await login(loginEmail, loginPassword)
    setSubmitting(false)
    if (err) setMessage(err)
  }

  async function handleSignup(e) {
    e.preventDefault()

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }
    if (!homeLocation) {
      setMessage('Please set your location first.')
      return
    }

    setSubmitting(true)
    setMessage('')

    const err = await signupResident(email, password, name, homeLocation.lat, homeLocation.lng)

    setSubmitting(false)
    if (err) setMessage(err)
  }

  async function handleGuestSave(e) {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    const { error } = await supabase.from('resident_profiles').upsert({
      device_id: getDeviceId(),
      name: guestName,
      phone: guestPhone,
      village: guestVillage,
      district: guestDistrict,
      state: guestState,
      updated_at: new Date().toISOString(),
    })

    setSubmitting(false)

    if (error) {
      setMessage('Failed to save: ' + error.message)
    } else {
      onGuestAccess()
    }
  }

  return (
    <div className="auth-gate">
      <div className="auth-card">
        <h1>LocalPulse</h1>

        <div className="mode-toggle auth-usertype-toggle">
          <button
            className={userType === 'resident' ? 'active' : ''}
            onClick={() => { setUserType('resident'); setMessage('') }}
          >
            I'm a Resident
          </button>
          <button
            className={userType === 'authority' ? 'active' : ''}
            onClick={() => { setUserType('authority'); setMessage('') }}
          >
            I'm an Authority
          </button>
        </div>

        {userType === 'authority' && (
          <form className="report-form" onSubmit={handleAuthorityLogin}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="password-row">
                <input
                  type={showAuthPassword ? 'text' : 'password'}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                />
                <button type="button" className="password-toggle" onClick={() => setShowAuthPassword(!showAuthPassword)}>
                  {showAuthPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {userType === 'resident' && (
          <>
            <div className="mode-toggle">
              <button className={residentMode === 'signup' ? 'active' : ''} onClick={() => { setResidentMode('signup'); setMessage('') }}>
                Sign Up
              </button>
              <button className={residentMode === 'login' ? 'active' : ''} onClick={() => { setResidentMode('login'); setMessage('') }}>
                Login
              </button>
              <button className={residentMode === 'guest' ? 'active' : ''} onClick={() => { setResidentMode('guest'); setMessage('') }}>
                Login as Guest
              </button>
            </div>

            {residentMode === 'signup' && (
              <form className="report-form" onSubmit={handleSignup}>
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <div className="password-row">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <div className="password-row">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Your Location</label>
                  <div className="mode-toggle">
                    <button type="button" className={locationMethod === 'current' ? 'active' : ''} onClick={() => setLocationMethod('current')}>
                      Use Current Location
                    </button>
                    <button type="button" className={locationMethod === 'manual' ? 'active' : ''} onClick={() => setLocationMethod('manual')}>
                      Enter Manually
                    </button>
                  </div>

                  {locationMethod === 'current' ? (
                    <button type="button" className="media-btn" style={{ marginTop: '8px' }} onClick={useCurrentLocation} disabled={locating}>
                      {locating ? 'Detecting...' : 'Detect My Location'}
                    </button>
                  ) : (
                    <div className="search-bar" style={{ marginTop: '8px' }}>
                      <input
                        type="text"
                        placeholder="Enter your address or area"
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                      />
                      <button type="button" onClick={geocodeManualAddress} disabled={locating}>
                        {locating ? 'Searching...' : 'Find'}
                      </button>
                    </div>
                  )}

                  {homeLocation && (
                    <p className="file-name">
                      ✓ Location set: {homeLocation.lat.toFixed(4)}, {homeLocation.lng.toFixed(4)}
                    </p>
                  )}
                  {locationError && <p className="error-text">{locationError}</p>}
                </div>

                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? 'Creating account...' : 'Sign Up'}
                </button>
              </form>
            )}

            {residentMode === 'login' && (
              <form className="report-form" onSubmit={handleResidentLogin}>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <div className="password-row">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowLoginPassword(!showLoginPassword)}>
                      {showLoginPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? 'Logging in...' : 'Login'}
                </button>
              </form>
            )}

            {residentMode === 'guest' && (
              <form className="report-form" onSubmit={handleGuestSave}>
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="text" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Village / Town</label>
                  <input type="text" value={guestVillage} onChange={(e) => setGuestVillage(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>District</label>
                  <input type="text" value={guestDistrict} onChange={(e) => setGuestDistrict(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input type="text" value={guestState} onChange={(e) => setGuestState(e.target.value)} />
                </div>
                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Continue as Guest'}
                </button>
              </form>
            )}
          </>
        )}

        {message && <p className="submit-message">{message}</p>}
      </div>
    </div>
  )
}

export default AuthGate