import { useAuthority } from './AuthorityContext'

function AccountStatus({ onSwitchAccount }) {
  const { isAuthority, isLoggedIn, profile, logout } = useAuthority()

  function handleLogout() {
    logout()
    onSwitchAccount()
  }

  if (isAuthority) {
    return (
      <div className="authority-bar">
        <span>{profile.name} ({profile.department})</span>
        <button onClick={handleLogout}>Log out</button>
      </div>
    )
  }

  if (isLoggedIn) {
    return (
      <div className="authority-bar">
        <span>{profile.name}</span>
        <button onClick={handleLogout}>Log out</button>
      </div>
    )
  }

  return (
    <div className="authority-bar">
      <span>Guest</span>
      <button onClick={onSwitchAccount}>Switch Account</button>
    </div>
  )
}

export default AccountStatus