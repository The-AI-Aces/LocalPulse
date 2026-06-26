import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuthority } from '../AuthorityContext'

function getDeviceId() {
  let id = localStorage.getItem('localpulse_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('localpulse_device_id', id)
  }
  return id
}

function FeedPage() {
  const { isAuthority, profile } = useAuthority()
  const [statusHistory, setStatusHistory] = useState({})
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)

  const [radiusValue, setRadiusValue] = useState(3)
  const [radiusUnit, setRadiusUnit] = useState('km')

  const [searchText, setSearchText] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [sortBy, setSortBy] = useState('recent')
  const [scope, setScope] = useState('near')
  const [myRegion, setMyRegion] = useState({ village: '', district: '', state: '' })

  const [issues, setIssues] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const [upvoteCounts, setUpvoteCounts] = useState({})
  const [myUpvotes, setMyUpvotes] = useState(new Set())

  const [commentsByIssue, setCommentsByIssue] = useState({})
  const [openComments, setOpenComments] = useState(null)
  const [newComment, setNewComment] = useState('')

  const deviceId = getDeviceId()

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

  const radiusInMeters =
    radiusUnit === 'km' ? Number(radiusValue) * 1000 : Number(radiusValue)

  useEffect(() => {
    loadMyRegion()
  }, [isAuthority, profile])

  async function loadMyRegion() {
    if (isAuthority && profile) {
      setMyRegion({ village: '', district: profile.district, state: profile.state })
      return
    }
    const { data } = await supabase
      .from('resident_profiles')
      .select('village, district, state')
      .eq('device_id', deviceId)
      .maybeSingle()
    if (data) setMyRegion(data)
  }

  useEffect(() => {
    if (scope === 'near' && location) {
      fetchAll(location)
      saveAreaSubscription(location)
    } else if (scope !== 'near') {
      fetchAllByRegion()
    }
  }, [location, radiusValue, radiusUnit, sortBy, scope, myRegion])

  async function saveAreaSubscription(center) {
    await supabase.from('area_subscriptions').upsert({
      device_id: deviceId,
      lat: center.lat,
      lng: center.lng,
      radius_meters: radiusInMeters,
      updated_at: new Date().toISOString(),
    })
  }

  async function fetchAll(center) {
    setLoading(true)
    setFetchError('')

    const { data: issueData, error: issueError } = await supabase.rpc('nearby_issues', {
      center_lat: center.lat,
      center_lng: center.lng,
      radius_meters: radiusInMeters,
    })

    const { data: eventData, error: eventError } = await supabase.rpc('nearby_events', {
      center_lat: center.lat,
      center_lng: center.lng,
      radius_meters: radiusInMeters,
    })

    if (issueError) {
      setFetchError('Failed to load issues: ' + issueError.message)
      setLoading(false)
      return
    }

    setEvents(eventError ? [] : eventData)
    await applyVotesAndSort(issueData || [])
  }

  async function fetchAllByRegion() {
    setLoading(true)
    setFetchError('')

    let issueQuery = supabase.from('issues').select('*')
    let eventQuery = supabase.from('events').select('*')

    if (scope === 'village' && myRegion.village) {
      issueQuery = issueQuery.eq('village', myRegion.village)
    }
    if (scope === 'district' && myRegion.district) {
      issueQuery = issueQuery.eq('district', myRegion.district)
    }
    if (scope === 'state' && myRegion.state) {
      issueQuery = issueQuery.eq('state', myRegion.state)
    }
    // Events don't have village/district/state columns, so for 'all' and region
    // scopes we just show all events (radius doesn't apply outside 'near' mode)

    const { data: issueData, error: issueError } = await issueQuery
    const { data: eventData } = await eventQuery

    if (issueError) {
      setFetchError('Failed to load issues: ' + issueError.message)
      setLoading(false)
      return
    }

    setEvents(eventData || [])
    await applyVotesAndSort(issueData || [])
  }

  async function applyVotesAndSort(data) {
    let list = [...data]
    const ids = list.map((i) => i.id)

    if (ids.length > 0) {
      const { data: votes } = await supabase
        .from('upvotes')
        .select('issue_id, user_id')
        .in('issue_id', ids)

      const counts = {}
      const mine = new Set()
      votes?.forEach((v) => {
        counts[v.issue_id] = (counts[v.issue_id] || 0) + 1
        if (v.user_id === deviceId) mine.add(v.issue_id)
      })
      setUpvoteCounts(counts)
      setMyUpvotes(mine)

      if (sortBy === 'upvotes') {
        list.sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
      } else {
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      }
    }

    setIssues(list)
    list.forEach((issue) => loadStatusHistory(issue.id))
    setLoading(false)
  }

  // Merge issues + events into one timeline, sorted by recency (upvote sort only reorders issues, events stay date-sorted within the merge)
  function getMergedFeed() {
    const taggedIssues = issues.map((i) => ({ ...i, _type: 'issue' }))
    const taggedEvents = events.map((e) => ({ ...e, _type: 'event' }))
    const merged = [...taggedIssues, ...taggedEvents]

    if (sortBy === 'upvotes') {
      // Keep issues sorted by upvotes among themselves, events sorted by date, but interleave by date for a natural read
      return merged.sort((a, b) => {
        const aDate = a._type === 'event' ? new Date(a.event_date) : new Date(a.created_at)
        const bDate = b._type === 'event' ? new Date(b.event_date) : new Date(b.created_at)
        if (a._type === 'issue' && b._type === 'issue') {
          return (upvoteCounts[b.id] || 0) - (upvoteCounts[a.id] || 0)
        }
        return bDate - aDate
      })
    }

    return merged.sort((a, b) => {
      const aDate = a._type === 'event' ? new Date(a.event_date) : new Date(a.created_at)
      const bDate = b._type === 'event' ? new Date(b.event_date) : new Date(b.created_at)
      return bDate - aDate
    })
  }

  async function toggleUpvote(issueId) {
    const alreadyVoted = myUpvotes.has(issueId)

    if (alreadyVoted) {
      await supabase
        .from('upvotes')
        .delete()
        .eq('issue_id', issueId)
        .eq('user_id', deviceId)

      setMyUpvotes((prev) => {
        const next = new Set(prev)
        next.delete(issueId)
        return next
      })
      setUpvoteCounts((prev) => ({ ...prev, [issueId]: (prev[issueId] || 1) - 1 }))
    } else {
      await supabase.from('upvotes').insert({ issue_id: issueId, user_id: deviceId })

      setMyUpvotes((prev) => new Set(prev).add(issueId))
      setUpvoteCounts((prev) => ({ ...prev, [issueId]: (prev[issueId] || 0) + 1 }))
    }
  }

  async function loadComments(issueId) {
    if (openComments === issueId) {
      setOpenComments(null)
      return
    }

    setOpenComments(issueId)

    if (!commentsByIssue[issueId]) {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true })

      setCommentsByIssue((prev) => ({ ...prev, [issueId]: data || [] }))
    }
  }

  async function updateStatus(issueId, newStatus) {
    const { data: issueData, error } = await supabase
      .from('issues')
      .update({ status: newStatus })
      .eq('id', issueId)
      .select()
      .single()

    if (error) {
      alert('Failed to update status: ' + error.message)
      return
    }

    await supabase.from('status_history').insert({
      issue_id: issueId,
      changed_by: profile.id,
      authority_name: profile.name,
      department: profile.department,
      new_status: newStatus,
    })

    const { data: voters } = await supabase
      .from('upvotes')
      .select('user_id')
      .eq('issue_id', issueId)

    const notifyIds = new Set((voters || []).map((v) => v.user_id))

    if (issueData.reporter_device_id) {
      notifyIds.add(issueData.reporter_device_id)
    }

    await supabase.from('notifications').delete().eq('issue_id', issueId)

    const notifications = Array.from(notifyIds).map((userId) => ({
      user_id: userId,
      issue_id: issueId,
      message: `An issue you reported or upvoted is now "${newStatus}"`,
    }))

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }

    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
    )

    loadStatusHistory(issueId)
  }

  async function loadStatusHistory(issueId) {
    const { data } = await supabase
      .from('status_history')
      .select('*')
      .eq('issue_id', issueId)
      .order('changed_at', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      setStatusHistory((prev) => ({ ...prev, [issueId]: data[0] }))
    }
  }

  async function postComment(issueId) {
    if (!newComment.trim()) return

    const { data, error } = await supabase
      .from('comments')
      .insert({ issue_id: issueId, user_id: deviceId, text: newComment.trim() })
      .select()

    if (!error && data) {
      setCommentsByIssue((prev) => ({
        ...prev,
        [issueId]: [...(prev[issueId] || []), data[0]],
      }))
      setNewComment('')
    }
  }

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
        setLocation({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) })
      }
    } catch {
      setSearchError('Search failed. Check your internet connection.')
    }

    setSearching(false)
  }

  function timeAgo(dateString) {
    const utcDate = dateString.includes('Z') || dateString.includes('+')
      ? dateString
      : dateString + 'Z'
    const seconds = Math.floor((new Date() - new Date(utcDate)) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const mergedFeed = getMergedFeed()

  return (
    <div className="app-container">
      <h2>Community Feed</h2>
      {error && <p className="error-text">{error}</p>}

      <div className="radius-control">
        <label>Filter by: </label>
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="near">Near Me (radius)</option>
          <option value="village">My Village</option>
          <option value="district">My District</option>
          <option value="state">My State</option>
          <option value="all">All India</option>
        </select>
      </div>

      {scope === 'near' && (
        <>
          <div className="radius-control">
            <label>Radius: </label>
            <input
              type="number"
              min="1"
              value={radiusValue}
              onChange={(e) => setRadiusValue(e.target.value)}
              className="radius-input"
            />
            <select value={radiusUnit} onChange={(e) => setRadiusUnit(e.target.value)}>
              <option value="m">meters</option>
              <option value="km">km</option>
            </select>
          </div>

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
          </form>
          {searchError && <p className="error-text">{searchError}</p>}
        </>
      )}

      {(scope === 'village' || scope === 'district' || scope === 'state') &&
        !myRegion[scope] && (
          <p className="error-text">
            Your {scope} isn't set yet. Add it in your Profile page to use this filter.
          </p>
        )}

      <div className="sort-control">
        <label>Sort by: </label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="recent">Most recent</option>
          <option value="upvotes">Most upvoted</option>
        </select>
      </div>

      {loading && <p>Loading...</p>}
      {fetchError && <p className="error-text">{fetchError}</p>}

      {!loading && mergedFeed.length === 0 && !fetchError && (
        <p>No issues or events reported in this area yet.</p>
      )}

      <div className="feed-list">
        {mergedFeed.map((item) =>
          item._type === 'event' ? (
            <div key={`event-${item.id}`} className="issue-card event-card">
              <div className="issue-body">
                <div className="issue-header">
                  <span className="issue-category">📅 {item.org_name}</span>
                  <span className="issue-status">Event</span>
                </div>
                <p className="event-title">{item.title}</p>
                <p className="issue-description">{item.description}</p>
                <div className="issue-meta">
                  <span>{new Date(item.event_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div key={`issue-${item.id}`} className="issue-card">
              {item.photo_url && (
                item.photo_url.endsWith('.webm') ? (
                  <video src={item.photo_url} controls className="issue-media" />
                ) : (
                  <img src={item.photo_url} alt={item.category} className="issue-media" />
                )
              )}
              <div className="issue-body">
                <div className="issue-header">
                  <span className="issue-category">{item.category}</span>
                  {isAuthority ? (
                    <select
                      className="status-dropdown"
                      value={item.status}
                      onChange={(e) => updateStatus(item.id, e.target.value)}
                    >
                      <option value="Open">Open</option>
                      <option value="Under Review">Under Review</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  ) : (
                    <span className="issue-status">{item.status}</span>
                  )}
                </div>
                <p className="issue-description">{item.description}</p>
                <div className="issue-meta">
                  <span>{item.is_anonymous ? 'Anonymous' : 'Resident'}</span>
                  <span>{timeAgo(item.created_at)}</span>
                </div>

                {(item.village || item.district || item.state) && (
                  <p className="file-name">
                    📍 {[item.village, item.district, item.state].filter(Boolean).join(', ')}
                  </p>
                )}

                {statusHistory[item.id] && (
                  <p className="status-update-note">
                    Updated to "{statusHistory[item.id].new_status}" by{' '}
                    {statusHistory[item.id].authority_name} ({statusHistory[item.id].department}) ·{' '}
                    {timeAgo(statusHistory[item.id].changed_at)}
                  </p>
                )}

                <div className="issue-actions">
                  <button
                    className={`upvote-btn ${myUpvotes.has(item.id) ? 'voted' : ''}`}
                    onClick={() => toggleUpvote(item.id)}
                  >
                    ▲ {upvoteCounts[item.id] || 0}
                  </button>
                  <button className="comment-toggle-btn" onClick={() => loadComments(item.id)}>
                    💬 Comments
                  </button>
                </div>

                {openComments === item.id && (
                  <div className="comments-section">
                    {(commentsByIssue[item.id] || []).map((c) => (
                      <p key={c.id} className="comment-line">
                        {c.text}
                      </p>
                    ))}
                    {(commentsByIssue[item.id] || []).length === 0 && (
                      <p className="comment-line empty">No comments yet.</p>
                    )}

                    <div className="comment-input-row">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                      <button onClick={() => postComment(item.id)}>Post</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default FeedPage