import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from './supabaseClient'
import './App.css'

function LocationPicker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng)
    },
  })
  return null
}

// Helper to re-center the map whenever pinLocation changes via search
function RecenterMap({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], map.getZoom())
    }
  }, [position])
  return null
}

function App() {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [radius, setRadius] = useState(3)

  const [pinLocation, setPinLocation] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [category, setCategory] = useState('roads')
  const [description, setDescription] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setLocation(loc)
        setPinLocation(loc)
      },
      (err) => {
        setError('Could not get your location: ' + err.message)
      }
    )
  }, [])

  // Search a place name and move the pin there using free OpenStreetMap search
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
        setPinLocation({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) })
      }
    } catch {
      setSearchError('Search failed. Check your internet connection.')
    }

    setSearching(false)
  }

  function useMyCurrentLocation() {
    if (location) {
      setPinLocation(location)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pinLocation) {
      setSubmitMessage('Please pick a location first.')
      return
    }

    setSubmitting(true)
    setSubmitMessage('')

    let mediaUrl = null

    if (mediaFile) {
      const fileName = `${Date.now()}_${mediaFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('issue-photos')
        .upload(fileName, mediaFile)

      if (uploadError) {
        setSubmitMessage('Media upload failed: ' + uploadError.message)
        setSubmitting(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('issue-photos')
        .getPublicUrl(fileName)

      mediaUrl = urlData.publicUrl
    }

    const { error: insertError } = await supabase.from('issues').insert({
      category,
      description,
      photo_url: mediaUrl,
      lat: pinLocation.lat,
      lng: pinLocation.lng,
      is_anonymous: isAnonymous,
    })

    setSubmitting(false)

    if (insertError) {
      setSubmitMessage('Failed to submit: ' + insertError.message)
    } else {
      setSubmitMessage('Issue reported successfully!')
      setDescription('')
      setMediaFile(null)
    }
  }

  return (
    <div className="app-container">
      <h1>LocalPulse</h1>
      {error && <p className="error-text">{error}</p>}

      {location && (
        <div className="radius-control">
          <label htmlFor="radius">Show issues within: </label>
          <select
            id="radius"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          >
            <option value={1}>1 km</option>
            <option value={3}>3 km</option>
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
          </select>
        </div>
      )}

      {/* Location search bar */}
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
        <button type="button" onClick={useMyCurrentLocation}>
          Use My Location
        </button>
      </form>
      {searchError && <p className="error-text">{searchError}</p>}

      {location ? (
        <div className="map-wrapper">
          <MapContainer
            center={[location.lat, location.lng]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <Circle
              center={[location.lat, location.lng]}
              radius={radius * 1000}
              pathOptions={{ color: 'blue', fillOpacity: 0.1 }}
            />
            <LocationPicker onPick={setPinLocation} />
            <RecenterMap position={pinLocation} />
            {pinLocation && (
              <Marker position={[pinLocation.lat, pinLocation.lng]}>
                <Popup>Issue location (click map or search to move)</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      ) : (
        <p>Detecting your location...</p>
      )}

      <h2>Report an Issue</h2>
      <form className="report-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="roads">Roads</option>
            <option value="water">Water</option>
            <option value="electricity">Electricity</option>
            <option value="safety">Safety</option>
            <option value="sanitation">Sanitation</option>
          </select>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Add Photo or Video</label>
          <div className="media-buttons">
            <label className="media-btn">
              Take Photo / Video
              <input
                type="file"
                accept="image/*,video/*"
                capture="environment"
                onChange={(e) => setMediaFile(e.target.files[0])}
                hidden
              />
            </label>

            <label className="media-btn">
              Upload from Device
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setMediaFile(e.target.files[0])}
                hidden
              />
            </label>
          </div>
          {mediaFile && <p className="file-name">Selected: {mediaFile.name}</p>}
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            Post anonymously
          </label>
        </div>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Issue'}
        </button>

        {submitMessage && <p className="submit-message">{submitMessage}</p>}
      </form>
    </div>
  )
}

export default App