import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function EventsPage() {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [radiusValue, setRadiusValue] = useState(5)
  const [radiusUnit, setRadiusUnit] = useState('km')

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      (err) => setError('Could not get your location: ' + err.message)
    )
  }, [])

  const radiusInMeters =
    radiusUnit === 'km' ? Number(radiusValue) * 1000 : Number(radiusValue)

  useEffect(() => {
    if (location) fetchEvents(location)
  }, [location, radiusValue, radiusUnit])

  async function fetchEvents(center) {
    setLoading(true)
    setFetchError('')

    const { data, error } = await supabase.rpc('nearby_events', {
      center_lat: center.lat,
      center_lng: center.lng,
      radius_meters: radiusInMeters,
    })

    if (error) {
      setFetchError('Failed to load events: ' + error.message)
      setEvents([])
    } else {
      setEvents(data)
    }
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!location) {
      setSubmitMessage('Please allow location access to post an event.')
      return
    }

    setSubmitting(true)
    setSubmitMessage('')

    const { error } = await supabase.from('events').insert({
      org_name: orgName,
      title,
      description,
      event_date: eventDate,
      lat: location.lat,
      lng: location.lng,
    })

    setSubmitting(false)

    if (error) {
      setSubmitMessage('Failed to post event: ' + error.message)
    } else {
      setSubmitMessage('Event posted successfully!')
      setOrgName('')
      setTitle('')
      setDescription('')
      setEventDate('')
      fetchEvents(location)
    }
  }

  return (
    <div className="app-container">
      <h2>Local Events & Announcements</h2>
      {error && <p className="error-text">{error}</p>}

      <div className="radius-control">
        <label>Radius: </label>
        <input
          type="number"
          min="1"
          value={radiusValue}
          onChange={(e) => setRadiusValue(e.target.value)}
          className="radius-input"
        />
        <select value={radiusUnit} onChange={(e) => setRadiusUnit(e.target.value)}>
          <option value="m">meters</option>
          <option value="km">km</option>
        </select>
      </div>

      <button className="media-btn" onClick={() => setShowForm(!showForm)}>
        {showForm ? 'Cancel' : 'Post an Event'}
      </button>

      {showForm && (
        <form className="report-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Organization / Group Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Event Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Event Date</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Posting...' : 'Post Event'}
          </button>
          {submitMessage && <p className="submit-message">{submitMessage}</p>}
        </form>
      )}

      {loading && <p>Loading events...</p>}
      {fetchError && <p className="error-text">{fetchError}</p>}
      {!loading && events.length === 0 && !fetchError && (
        <p>No upcoming events in this area yet.</p>
      )}

      <div className="feed-list">
        {events.map((ev) => (
          <div key={ev.id} className="issue-card">
            <div className="issue-body">
              <div className="issue-header">
                <span className="issue-category">{ev.org_name}</span>
                <span className="issue-status">
                  {new Date(ev.event_date).toLocaleDateString()}
                </span>
              </div>
              <p className="event-title">{ev.title}</p>
              <p className="issue-description">{ev.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EventsPage