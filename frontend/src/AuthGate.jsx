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

  const [userType, setUserType] = useState('resident')
  const [residentMode, setResidentMode] = useState('login')

  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [showAuthPassword, setShowAuthPassword] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [locationMethod, setLocationMethod] = useState('current')
  const [manualAddress, setManualAddress] = useState('')
  const [homeLocation, setHomeLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

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
        setLocationError('Address not found.')
      } else {
        setHomeLocation({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) })
      }
    } catch {
      setLocationError('Search failed.')
    }
    setLocating(false)
  }

  async function handleAuthorityLogin(e) {
  e.preventDefault()
  setSubmitting(true)
  setMessage('')
  const err = await login(authEmail, authPassword, 'authority')
  setSubmitting(false)
  if (err) setMessage(err)
}

  async function handleResidentLogin(e) {
  e.preventDefault()
  setSubmitting(true)
  setMessage('')
  const err = await login(loginEmail, loginPassword, 'resident')
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
    if (error) setMessage('Failed to save: ' + error.message)
    else onGuestAccess()
  }

  return (
    <div className="auth-gate">
      <div className="auth-card">
        <h1 className="auth-logo">LocalPulse</h1>

        <div className="auth-tabs">
          <span
            className={userType === 'resident' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => { setUserType('resident'); setMessage('') }}
          >
            Resident
          </span>
          <span
            className={userType === 'authority' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => { setUserType('authority'); setMessage('') }}
          >
            Authority
          </span>
        </div>

        {userType === 'authority' && (
          <form className="auth-form" onSubmit={handleAuthorityLogin}>
            <input
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              required
            />
            <div className="auth-password-field">
              <input
                type={showAuthPassword ? 'text' : 'password'}
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
              <span className="auth-eye" onClick={() => setShowAuthPassword(!showAuthPassword)}>
                {showAuthPassword ? 'Hide' : 'Show'}
              </span>
            </div>
            <button type="submit" className="auth-primary-btn" disabled={submitting}>
              {submitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        )}

        {userType === 'resident' && (
          <>
            {residentMode === 'login' && (
              <form className="auth-form" onSubmit={handleResidentLogin}>
                <input
                  type="email"
                  placeholder="Email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
                <div className="auth-password-field">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <span className="auth-eye" onClick={() => setShowLoginPassword(!showLoginPassword)}>
                    {showLoginPassword ? 'Hide' : 'Show'}
                  </span>
                </div>
                <button type="submit" className="auth-primary-btn" disabled={submitting}>
                  {submitting ? 'Logging in...' : 'Log In'}
                </button>
              </form>
            )}

            {residentMode === 'signup' && (
              <form className="auth-form" onSubmit={handleSignup}>
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="auth-password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <span className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </span>
                </div>
                <div className="auth-password-field">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <span className="auth-eye" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </span>
                </div>

                <div className="auth-location-row">
                  <span
                    className={locationMethod === 'current' ? 'auth-tab active' : 'auth-tab'}
                    onClick={() => setLocationMethod('current')}
                  >
                    Use Current Location
                  </span>
                  <span
                    className={locationMethod === 'manual' ? 'auth-tab active' : 'auth-tab'}
                    onClick={() => setLocationMethod('manual')}
                  >
                    Enter Manually
                  </span>
                </div>

                {locationMethod === 'current' ? (
                  <button
                    type="button"
                    className="auth-secondary-btn"
                    onClick={useCurrentLocation}
                    disabled={locating}
                  >
                    {locating ? 'Detecting...' : 'Detect My Location'}
                  </button>
                ) : (
                  <div className="auth-password-field">
                    <input
                      type="text"
                      placeholder="Enter your address or area"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                    />
                    <span className="auth-eye" onClick={geocodeManualAddress}>
                      {locating ? '...' : 'Find'}
                    </span>
                  </div>
                )}

                {homeLocation && (
                  <p className="auth-hint">
                    ✓ Location set ({homeLocation.lat.toFixed(3)}, {homeLocation.lng.toFixed(3)})
                  </p>
                )}
                {locationError && <p className="auth-error">{locationError}</p>}

                <button type="submit" className="auth-primary-btn" disabled={submitting}>
                  {submitting ? 'Creating account...' : 'Sign Up'}
                </button>
              </form>
            )}

            {residentMode === 'guest' && (
              <form className="auth-form" onSubmit={handleGuestSave}>
                <input type="text" placeholder="Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                <input type="text" placeholder="Phone Number" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
                <input type="text" placeholder="Village / Town" value={guestVillage} onChange={(e) => setGuestVillage(e.target.value)} />
                <input type="text" placeholder="District" value={guestDistrict} onChange={(e) => setGuestDistrict(e.target.value)} />
                <input type="text" placeholder="State" value={guestState} onChange={(e) => setGuestState(e.target.value)} />
                <button type="submit" className="auth-primary-btn" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Continue as Guest'}
                </button>
              </form>
            )}

            <div className="auth-switch-links">
              {residentMode !== 'signup' && (
                <span onClick={() => { setResidentMode('signup'); setMessage('') }}>Sign up</span>
              )}
              {residentMode !== 'login' && (
                <span onClick={() => { setResidentMode('login'); setMessage('') }}>Log in</span>
              )}
              {residentMode !== 'guest' && (
                <span onClick={() => { setResidentMode('guest'); setMessage('') }}>Continue as guest</span>
              )}
            </div>
          </>
        )}

        {message && <p className="auth-error">{message}</p>}
      </div>
    </div>
  )
}

export default AuthGate