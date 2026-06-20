import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)

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
      {location ? (
        <p>Your location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
      ) : (
        <p>Detecting your location...</p>
      )}
    </div>
  )
}

export default App