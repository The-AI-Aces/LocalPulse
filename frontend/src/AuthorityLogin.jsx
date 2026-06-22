import { useState } from 'react'
import { useAuthority } from './AuthorityContext'

function AuthorityLogin() {
  const { isAuthority, profile, login, logout, loading } = useAuthority()
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    const err = await login(email, password)
    setSubmitting(false)
    if (err) {
      setErrorMsg(err)
    } else {
      setShowForm(false)
      setEmail('')
      setPassword('')
    }
  }

  if (loading) return null

  if (isAuthority) {
    return (
      <div className="authority-bar">
        <span>
          Logged in as {profile.name} ({profile.department})
        </span>
        <button onClick={logout}>Log out</button>
      </div>
    )
  }

  return (
    <div className="authority-bar">
      {!showForm ? (
        <button className="authority-link" onClick={() => setShowForm(true)}>
          Authority Login
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="authority-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Checking...' : 'Login'}
          </button>
          {errorMsg && <span className="error-text">{errorMsg}</span>}
        </form>
      )}
    </div>
  )
}

export default AuthorityLogin