import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuthority } from '../AuthorityContext'
import ResidentAuth from '../ResidentAuth'

function getDeviceId() {
  let id = localStorage.getItem('localpulse_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('localpulse_device_id', id)
  }
  return id
}

function ProfilePage() {
  const { isAuthority, isLoggedIn, profile, logout, setProfile } = useAuthority()
  const deviceId = getDeviceId()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [village, setVillage] = useState('')
  const [district, setDistrict] = useState('')
  const [state, setState] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isLoggedIn && !isAuthority && profile) {
      setName(profile.name || '')
      setPhone(profile.phone || '')
      setVillage(profile.village || '')
      setDistrict(profile.district || '')
      setState(profile.state || '')
    } else if (!isLoggedIn) {
      loadGuestProfile()
    }
  }, [isLoggedIn, isAuthority, profile])

  async function loadGuestProfile() {
    const { data } = await supabase
      .from('resident_profiles')
      .select('*')
      .eq('device_id', deviceId)
      .maybeSingle()

    if (data) {
      setName(data.name || '')
      setPhone(data.phone || '')
      setVillage(data.village || '')
      setDistrict(data.district || '')
      setState(data.state || '')
    }
  }

  async function handleSaveLoggedInResident(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { data, error } = await supabase
      .from('profiles')
      .update({ name, phone, village, district, state })
      .eq('id', profile.id)
      .select()
      .single()

    setSaving(false)

    if (error) {
      setMessage('Failed to save: ' + error.message)
    } else {
      setProfile(data)
      setMessage('Profile saved!')
    }
  }

  async function handleSaveGuest(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase.from('resident_profiles').upsert({
      device_id: deviceId,
      name,
      phone,
      village,
      district,
      state,
      updated_at: new Date().toISOString(),
    })

    setSaving(false)
    setMessage(error ? 'Failed to save: ' + error.message : 'Profile saved!')
  }

  // Authority view
  if (isAuthority) {
    return (
      <div className="app-container">
        <h2>Authority Profile</h2>
        <div className="report-form">
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>Department:</strong> {profile.department}</p>
          <p><strong>District:</strong> {profile.district || 'Not set'}</p>
          <p><strong>State:</strong> {profile.state || 'Not set'}</p>
          <p className="file-name">
            District/State are set by the system admin and cannot be edited here.
          </p>
        </div>
      </div>
    )
  }

  // Logged-in resident view
  if (isLoggedIn) {
    return (
      <div className="app-container">
        <h2>My Profile</h2>
        <form className="report-form" onSubmit={handleSaveLoggedInResident}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Village / Town</label>
            <input type="text" value={village} onChange={(e) => setVillage(e.target.value)} />
          </div>
          <div className="form-group">
            <label>District</label>
            <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} />
          </div>
          <div className="form-group">
            <label>State</label>
            <input type="text" value={state} onChange={(e) => setState(e.target.value)} />
          </div>
          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
          {message && <p className="submit-message">{message}</p>}
        </form>
        <button className="media-btn" style={{ marginTop: '12px' }} onClick={logout}>
          Log out
        </button>
      </div>
    )
  }

  // Guest view: show login/signup form AND allow continuing as guest below
  return (
    <div className="app-container">
      <h2>My Profile</h2>
      <p className="file-name">
        Log in or sign up to save your profile permanently across devices, or continue as a
        guest below.
      </p>
      <ResidentAuth />

      <h2>Continue as Guest</h2>
      <form className="report-form" onSubmit={handleSaveGuest}>
        <div className="form-group">
          <label>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Village / Town</label>
          <input type="text" value={village} onChange={(e) => setVillage(e.target.value)} />
        </div>
        <div className="form-group">
          <label>District</label>
          <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} />
        </div>
        <div className="form-group">
          <label>State</label>
          <input type="text" value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        <button type="submit" className="submit-btn" disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
        {message && <p className="submit-message">{message}</p>}
      </form>
    </div>
  )
}

export default ProfilePage