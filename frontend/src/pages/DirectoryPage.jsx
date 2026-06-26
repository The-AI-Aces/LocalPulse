import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function getDeviceId() {
  let id = localStorage.getItem('localpulse_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('localpulse_device_id', id)
  }
  return id
}

function DirectoryPage() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('plumber')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const [myRatings, setMyRatings] = useState({})
  const deviceId = getDeviceId()

  useEffect(() => {
    fetchProviders()
  }, [])

  async function fetchProviders() {
    setLoading(true)
    setFetchError('')

    const { data: providerData, error } = await supabase
      .from('service_providers')
      .select('*')

    if (error) {
      setFetchError('Failed to load providers: ' + error.message)
      setProviders([])
      setLoading(false)
      return
    }

    const ids = providerData.map((p) => p.id)
    let avgMap = {}
    let myMap = {}

    if (ids.length > 0) {
      const { data: ratings } = await supabase
        .from('provider_ratings')
        .select('provider_id, rating, user_id')
        .in('provider_id', ids)

      const sums = {}
      const counts = {}
      ratings?.forEach((r) => {
        sums[r.provider_id] = (sums[r.provider_id] || 0) + r.rating
        counts[r.provider_id] = (counts[r.provider_id] || 0) + 1
        if (r.user_id === deviceId) myMap[r.provider_id] = r.rating
      })
      ids.forEach((id) => {
        avgMap[id] = counts[id] ? (sums[id] / counts[id]).toFixed(1) : null
      })
    }

    const merged = providerData.map((p) => ({ ...p, avgRating: avgMap[p.id] }))
    setProviders(merged)
    setMyRatings(myMap)
    setLoading(false)
  }

  async function submitRating(providerId, ratingValue) {
    const { error } = await supabase.from('provider_ratings').upsert({
      provider_id: providerId,
      user_id: deviceId,
      rating: ratingValue,
    })

    if (!error) {
      setMyRatings((prev) => ({ ...prev, [providerId]: ratingValue }))
      fetchProviders()
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setSubmitting(true)
        setSubmitMessage('')

        const { error } = await supabase.from('service_providers').insert({
          name,
          category,
          contact,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })

        setSubmitting(false)

        if (error) {
          setSubmitMessage('Failed to add listing: ' + error.message)
        } else {
          setSubmitMessage('Listing added successfully!')
          setName('')
          setContact('')
          fetchProviders()
        }
      },
      () => {
        setSubmitMessage('Location access is needed to add a listing.')
      }
    )
  }

  const filteredProviders =
    filterCategory === 'all'
      ? providers
      : providers.filter((p) => p.category === filterCategory)

  return (
    <div className="app-container">
      <h2>Local Service Providers</h2>

      <div className="radius-control">
        <label>Filter: </label>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="all">All categories</option>
          <option value="plumber">Plumber</option>
          <option value="electrician">Electrician</option>
          <option value="carpenter">Carpenter</option>
          <option value="tutor">Tutor</option>
          <option value="other">Other</option>
        </select>
      </div>

      <button className="media-btn" onClick={() => setShowForm(!showForm)}>
        {showForm ? 'Cancel' : 'Add a Listing'}
      </button>

      {showForm && (
        <form className="report-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="plumber">Plumber</option>
              <option value="electrician">Electrician</option>
              <option value="carpenter">Carpenter</option>
              <option value="tutor">Tutor</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Contact Number</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Listing'}
          </button>
          {submitMessage && <p className="submit-message">{submitMessage}</p>}
        </form>
      )}

      {loading && <p>Loading providers...</p>}
      {fetchError && <p className="error-text">{fetchError}</p>}
      {!loading && filteredProviders.length === 0 && !fetchError && (
        <p>No service providers listed yet.</p>
      )}

      <div className="feed-list">
        {filteredProviders.map((p) => (
          <div key={p.id} className="issue-card">
            <div className="issue-body">
              <div className="issue-header">
                <span className="issue-category">{p.name}</span>
                <span className="issue-status">{p.category}</span>
              </div>
              <p className="issue-description">📞 {p.contact}</p>
              <p className="issue-description">
                ⭐ {p.avgRating ? `${p.avgRating} average` : 'No ratings yet'}
              </p>

              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${myRatings[p.id] >= star ? 'filled' : ''}`}
                    onClick={() => submitRating(p.id, star)}
                  >
                    ★
                  </span>
                ))}
              </div>
              {myRatings[p.id] && (
                <p className="file-name">You rated this {myRatings[p.id]} star(s)</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DirectoryPage