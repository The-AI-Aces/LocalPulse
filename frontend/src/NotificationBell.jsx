import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuthority } from './AuthorityContext'

function getDeviceId() {
  let id = localStorage.getItem('localpulse_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('localpulse_device_id', id)
  }
  return id
}

function NotificationBell() {
  const { isAuthority, profile } = useAuthority()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)

  const myId = isAuthority && profile ? profile.id : getDeviceId()

  useEffect(() => {
    loadNotifications()

    const interval = setInterval(loadNotifications, 15000)
    return () => clearInterval(interval)
  }, [myId])

  async function loadNotifications() {
    if (!myId) return

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', myId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load notifications:', error.message)
      return
    }

    setNotifications(data || [])
  }

  async function markAllRead() {
    if (!myId) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', myId)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  function handleToggle() {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen) {
      loadNotifications().then(() => {
        setTimeout(markAllRead, 1000)
      })
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="notification-bell-wrapper">
      <button className="notification-bell" onClick={handleToggle}>
        🔔 {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
  <div className="notification-dropdown">
    {notifications.length === 0 ? (
      <p className="notif-empty">No notifications yet.</p>
    ) : (
      notifications.map((n) => (
        <div key={n.id} className="notif-item">
          <span>{n.message}</span>
          <button
            className="notif-dismiss"
            onClick={() => dismissNotification(n.id)}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      ))
    )}
  </div>
)}
    </div>
  )
}

export default NotificationBell