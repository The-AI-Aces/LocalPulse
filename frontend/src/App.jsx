import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet'
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

function App() {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [radius, setRadius] = useState(3)

  const [pinLocation, setPinLocation] = useState(null)
  const [category, setCategory] = useState('roads')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState(null)
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
        setPinLocation(loc) // default pin = user's current location
      },
      (err) => {
        setError('Could not get your location: ' + err.message)
      }
    )
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pinLocation) {
      setSubmitMessage('Please pick a location on the map first.')
      return
    }

    setSubmitting(true)
    setSubmitMessage('')

    let photoUrl = null

    if (photo) {
      const fileName = `${Date.now()}_${photo.name}`
      const { error: uploadError } = await supabase.storage
        .from('issue-photos')
        .upload(fileName, photo)

      if (uploadError) {
        setSubmitMessage('Photo upload failed: ' + uploadError.message)
        setSubmitting(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('issue-photos')
        .getPublicUrl(fileName)

      photoUrl = urlData.publicUrl
    }

    const { error: insertError } = await supabase.from('issues').insert({
      category,
      description,
      photo_url: photoUrl,
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
      setPhoto(null)
    }
  }

  return (
    <div>
      <h1>LocalPulse</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {location && (
        <div style={{ margin: '10px 0' }}>
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

      {location ? (
        <MapContainer
          center={[location.lat, location.lng]}
          zoom={14}
          style={{ height: '400px', width: '100%' }}
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
          {pinLocation && (
            <Marker position={[pinLocation.lat, pinLocation.lng]}>
              <Popup>Issue location (click map to move)</Popup>
            </Marker>
          )}
        </MapContainer>
      ) : (
        <p>Detecting your location...</p>
      )}

      <h2>Report an Issue</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Category: </label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="roads">Roads</option>
            <option value="water">Water</option>
            <option value="electricity">Electricity</option>
            <option value="safety">Safety</option>
            <option value="sanitation">Sanitation</option>
          </select>
        </div>

        <div>
          <label>Description: </label>
          <br />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label>Photo: </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0])}
          />
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            Post anonymously
          </label>
        </div>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Issue'}
        </button>

        {submitMessage && <p>{submitMessage}</p>}
      </form>
    </div>
  )
}

export default App