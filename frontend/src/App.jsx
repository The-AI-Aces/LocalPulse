import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

function App() {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [radius, setRadius] = useState(3) // default radius in km

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
          zoom={13}
          style={{ height: '400px', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <Marker position={[location.lat, location.lng]}>
            <Popup>You are here</Popup>
          </Marker>
          <Circle
            center={[location.lat, location.lng]}
            radius={radius * 1000}
            pathOptions={{ color: 'blue', fillOpacity: 0.1 }}
          />
        </MapContainer>
      ) : (
        <p>Detecting your location...</p>
      )}
    </div>
  )
}

export default App