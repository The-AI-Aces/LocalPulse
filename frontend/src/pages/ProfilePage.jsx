import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuthority } from '../AuthorityContext'

function getDeviceId() {
  let id = localStorage.getItem('localpulse_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('localpulse_device_id', id)
  }
  return id
}

function isValidPhone(phone) {
  if (!phone) return true
  const digitsOnly = phone.replace(/\D/g, '')
  return digitsOnly.length === 10
}

function ProfilePage() {
  const { isAuthority, isLoggedIn, profile, setProfile } = useAuthority()
  const deviceId = getDeviceId()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [village, setVillage] = useState('')
  const [district, setDistrict] = useState('')
  const [state, setState] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [phoneError, setPhoneError] = useState('')

  useEffect(() => {
    if (isLoggedIn && profile) {
      setName(profile.name || '')
      setPhone(profile.phone || '')
      setVillage(profile.village || '')
      setDistrict(profile.district || '')
      setState(profile.state || '')
    } else if (!isLoggedIn) {
      loadGuestProfile()
    }
  }, [isLoggedIn, isAuthority, profile])
  async function handleSaveAuthorityRegion(e) {
  e.preventDefault()
  setSaving(true)
  setMessage('')

  const { data, error } = await supabase
    .from('profiles')
    .update({ village, district, state })
    .eq('id', profile.id)
    .select()
    .single()

  setSaving(false)
  if (error) setMessage('Failed to save: ' + error.message)
  else {
    setProfile(data)
    setMessage('Profile saved!')
  }
}
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
    setPhoneError('')
    if (!isValidPhone(phone)) {
      setPhoneError('Please enter a valid 10-digit phone number.')
      return
    }

    setSaving(true)
    setMessage('')

    const { data, error } = await supabase
      .from('profiles')
      .update({ name, phone, village, district, state })
      .eq('id', profile.id)
      .select()
      .single()

    setSaving(false)
    if (error) setMessage('Failed to save: ' + error.message)
    else {
      setProfile(data)
      setMessage('Profile saved!')
    }
  }

  async function handleSaveGuest(e) {
    e.preventDefault()
    setPhoneError('')
    if (!isValidPhone(phone)) {
      setPhoneError('Please enter a valid 10-digit phone number.')
      return
    }

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

  if (isAuthority) {
  return (
    <div className="app-container">
      <h2>Authority Profile</h2>
      <form className="report-form" onSubmit={handleSaveAuthorityRegion}>
        <p><strong>Name:</strong> {profile.name}</p>
        <p><strong>Department:</strong> {profile.department}</p>
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

  const handleSave = isLoggedIn ? handleSaveLoggedInResident : handleSaveGuest

  return (
    <div className="app-container">
      <h2>My Profile</h2>
      <form className="report-form" onSubmit={handleSave}>
        <div className="form-group">
          <label>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {phoneError && <p className="error-text">{phoneError}</p>}
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