import { useState } from 'react'
import { useAuthority } from './AuthorityContext'

function ResidentAuth() {
  const { login, signupResident } = useAuthority()
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    const err =
      mode === 'login'
        ? await login(email, password)
        : await signupResident(email, password, name)

    setSubmitting(false)

    if (err) {
      setMessage(err)
    } else if (mode === 'signup') {
      setMessage('Account created! You are now logged in.')
    }
  }

  return (
    <div className="report-form">
      <div className="mode-toggle" style={{ marginBottom: '12px' }}>
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          onClick={() => setMode('login')}
        >
          Log In
        </button>
        <button
          type="button"
          className={mode === 'signup' ? 'active' : ''}
          onClick={() => setMode('signup')}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Sign Up'}
        </button>
        {message && <p className="submit-message">{message}</p>}
      </form>
    </div>
  )
}

export default ResidentAuth