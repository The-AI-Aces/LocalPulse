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
function FeedPage() {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)

  const [radiusValue, setRadiusValue] = useState(3)
  const [radiusUnit, setRadiusUnit] = useState('km')

  const [searchText, setSearchText] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [sortBy, setSortBy] = useState('recent') // 'recent' or 'upvotes'
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')

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
      (err) => {
        setError('Could not get your location: ' + err.message)
      }
    )
  }, [])

  const radiusInMeters =
    radiusUnit === 'km' ? Number(radiusValue) * 1000 : Number(radiusValue)

  useEffect(() => {
    if (location) {
      fetchIssues(location)
    }
  }, [location, radiusValue, radiusUnit, sortBy])

  async function fetchIssues(center) {
    setLoading(true)
    setFetchError('')

    const { data, error } = await supabase.rpc('nearby_issues', {
      center_lat: center.lat,
      center_lng: center.lng,
      radius_meters: radiusInMeters,
    })

    if (error) {
      setFetchError('Failed to load issues: ' + error.message)
      setIssues([])
    } else {
      let sorted = [...data]
      if (sortBy === 'recent') {
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      }
      setIssues(sorted)
    }

    setLoading(false)
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchText.trim()) return

    setSearching(true)
    setSearchError('')

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}`
      )
      const results = await res.json()

      if (results.length === 0) {
        setSearchError('Place not found. Try a different search.')
      } else {
        const place = results[0]
        setLocation({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) })
      }
    } catch {
      setSearchError('Search failed. Check your internet connection.')
    }

    setSearching(false)
  }

  function timeAgo(dateString) {
  // Ensure we're comparing against UTC properly by explicitly parsing as UTC if needed
    const utcDate = dateString.includes('Z') || dateString.includes('+')
      ? dateString
      : dateString + 'Z'
    const seconds = Math.floor((new Date() - new Date(utcDate)) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="app-container">
      <h2>Community Feed</h2>
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

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search a place, street, or area..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <button type="submit" disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>
      {searchError && <p className="error-text">{searchError}</p>}

      <div className="sort-control">
        <label>Sort by: </label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="recent">Most recent</option>
          <option value="upvotes">Most upvoted</option>
        </select>
      </div>

      {loading && <p>Loading issues...</p>}
      {fetchError && <p className="error-text">{fetchError}</p>}

      {!loading && issues.length === 0 && !fetchError && (
        <p>No issues reported in this area yet.</p>
      )}

      <div className="feed-list">
        {issues.map((issue) => (
          <div key={issue.id} className="issue-card">
            {issue.photo_url && (
              issue.photo_url.endsWith('.webm') ? (
                <video src={issue.photo_url} controls className="issue-media" />
              ) : (
                <img src={issue.photo_url} alt={issue.category} className="issue-media" />
              )
            )}
            <div className="issue-body">
              <div className="issue-header">
                <span className="issue-category">{issue.category}</span>
                <span className="issue-status">{issue.status}</span>
              </div>
              <p className="issue-description">{issue.description}</p>
              <div className="issue-meta">
                <span>{issue.is_anonymous ? 'Anonymous' : 'Resident'}</span>
                <span>{timeAgo(issue.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FeedPage