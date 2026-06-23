import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function getDeviceId() {
  return localStorage.getItem('localpulse_device_id')
}

function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    const deviceId = getDeviceId()
    if (!deviceId) return

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', deviceId)
      .order('created_at', { ascending: false })

    setNotifications(data || [])
  }

  async function markAllRead() {
    const deviceId = getDeviceId()
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', deviceId)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="notification-bell-wrapper">
      <button
        className="notification-bell"
        onClick={() => {
          setOpen(!open)
          if (!open) markAllRead()
        }}
      >
        🔔 {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          {notifications.length === 0 ? (
            <p className="notif-empty">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <p key={n.id} className="notif-item">
                {n.message}
              </p>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell