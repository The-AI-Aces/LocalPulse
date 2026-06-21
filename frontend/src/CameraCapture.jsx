import { useState, useRef, useEffect } from 'react'

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const [mode, setMode] = useState('photo')
  const [micOn, setMicOn] = useState(true)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  async function startCamera() {
    setError('')
    setReady(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true,
      })
      streamRef.current = stream
      stream.getAudioTracks().forEach((track) => (track.enabled = micOn))

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setReady(true)
    } catch (err) {
      setError(
        'Could not access camera/microphone: ' +
          err.message +
          '. Please allow camera access in your browser settings and try again.'
      )
      setReady(false)
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
  }

  function toggleMic() {
    const newValue = !micOn
    setMicOn(newValue)
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => (track.enabled = newValue))
    }
  }

  function takePhoto() {
    if (!streamRef.current) {
      setError('Camera is not ready yet.')
      return
    }
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
      onCapture(file)
    }, 'image/jpeg')
  }

  function startRecording() {
    if (!streamRef.current) {
      setError('Camera is not ready yet. Try reopening the camera.')
      return
    }
    try {
      chunksRef.current = []
      const recorder = new MediaRecorder(streamRef.current)
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const file = new File([blob], `video_${Date.now()}.webm`, { type: 'video/webm' })
        onCapture(file)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch (err) {
      setError('Could not start recording: ' + err.message)
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
  }

  return (
    <div className="camera-overlay">
      {error && (
        <div className="camera-error">
          <p>{error}</p>
          <button onClick={startCamera}>Try Again</button>
          <button onClick={onClose}>Close</button>
        </div>
      )}

      {!error && (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="camera-preview" />

          <div className="camera-controls">
            <div className="mode-toggle">
              <button
                className={mode === 'photo' ? 'active' : ''}
                onClick={() => setMode('photo')}
                disabled={recording}
              >
                Photo
              </button>
              <button
                className={mode === 'video' ? 'active' : ''}
                onClick={() => setMode('video')}
                disabled={recording}
              >
                Video
              </button>
            </div>

            {mode === 'video' && (
              <label className="mic-toggle">
                <input type="checkbox" checked={micOn} onChange={toggleMic} />
                Microphone {micOn ? 'On' : 'Off'}
              </label>
            )}

            <div className="capture-buttons">
              {mode === 'photo' ? (
                <button className="capture-btn" onClick={takePhoto} disabled={!ready}>
                  Capture Photo
                </button>
              ) : recording ? (
                <button className="capture-btn recording" onClick={stopRecording}>
                  Stop Recording
                </button>
              ) : (
                <button className="capture-btn" onClick={startRecording} disabled={!ready}>
                  Start Recording
                </button>
              )}

              <button className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default CameraCapture