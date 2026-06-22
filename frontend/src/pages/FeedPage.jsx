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
  const [issues, setIssues] = useState([])
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
    if (location) {
      fetchIssues(location)
    }
  }, [location, radiusValue, radiusUnit, sortBy])

  async function fetchIssues(center) {
    setLoading(true)
    setFetchError('')

    const { data, error } = await supabase.rpc('nearby_issues', {
      center_lat: center.lat,
      center_lng: center.lng,
      radius_meters: radiusInMeters,
    })

    if (error) {
      setFetchError('Failed to load issues: ' + error.message)
      setIssues([])
      setLoading(false)
      return
    }

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
    setLoading(false)
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
  const { error } = await supabase
    .from('issues')
    .update({ status: newStatus })
    .eq('id', issueId)

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

  return (
    <div className="app-container">
      <h2>Community Feed</h2>
      {error && <p className="error-text">{error}</p>}

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

      <div className="sort-control">
        <label>Sort by: </label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="recent">Most recent</option>
          <option value="upvotes">Most upvoted</option>
        </select>
      </div>

      {loading && <p>Loading issues...</p>}
      {fetchError && <p className="error-text">{fetchError}</p>}

      {!loading && issues.length === 0 && !fetchError && (
        <p>No issues reported in this area yet.</p>
      )}

      <div className="feed-list">
        {issues.map((issue) => (
          <div key={issue.id} className="issue-card">
            {issue.photo_url && (
              issue.photo_url.endsWith('.webm') ? (
                <video src={issue.photo_url} controls className="issue-media" />
              ) : (
                <img src={issue.photo_url} alt={issue.category} className="issue-media" />
              )
            )}
            <div className="issue-body">
              <div className="issue-header">
                <span className="issue-category">{issue.category}</span>
                <span className="issue-status">{issue.status}</span>
              </div>
              <p className="issue-description">{issue.description}</p>
              <div className="issue-meta">
                <span>{issue.is_anonymous ? 'Anonymous' : 'Resident'}</span>
                <span>{timeAgo(issue.created_at)}</span>
              </div>

              <div className="issue-actions">
                <button
                  className={`upvote-btn ${myUpvotes.has(issue.id) ? 'voted' : ''}`}
                  onClick={() => toggleUpvote(issue.id)}
                >
                  ▲ {upvoteCounts[issue.id] || 0}
                </button>
                <button className="comment-toggle-btn" onClick={() => loadComments(issue.id)}>
                  💬 Comments
                </button>
              </div>

              {openComments === issue.id && (
                <div className="comments-section">
                  {(commentsByIssue[issue.id] || []).map((c) => (
                    <p key={c.id} className="comment-line">
                      {c.text}
                    </p>
                  ))}
                  {(commentsByIssue[issue.id] || []).length === 0 && (
                    <p className="comment-line empty">No comments yet.</p>
                  )}

                  <div className="comment-input-row">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <button onClick={() => postComment(issue.id)}>Post</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FeedPage