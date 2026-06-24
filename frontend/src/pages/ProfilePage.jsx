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

function ProfilePage() {
  const { isAuthority, profile } = useAuthority()
  const deviceId = getDeviceId()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [village, setVillage] = useState('')
  const [district, setDistrict] = useState('')
  const [state, setState] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!isAuthority) loadResidentProfile()
  }, [isAuthority])

  async function loadResidentProfile() {
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

  async function handleSave(e) {
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