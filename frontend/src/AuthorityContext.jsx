import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const AuthorityContext = createContext()

export function AuthorityProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) loadProfile(data.session.user.id)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) loadProfile(newSession.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  async function login(email, password, expectedRole) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return 'Invalid credentials.'

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profileData) {
    await supabase.auth.signOut()
    return 'Invalid credentials.'
  }

  if (expectedRole === 'authority' && !profileData.is_authority) {
    await supabase.auth.signOut()
    return 'Invalid credentials.'
  }

  if (expectedRole === 'resident' && profileData.is_authority) {
    await supabase.auth.signOut()
    return 'Invalid credentials.'
  }

  setProfile(profileData)
  return null
}

  async function signupResident(email, password, name, homeLat, homeLng) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return error.message

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        name,
        is_authority: false,
        home_lat: homeLat ?? null,
        home_lng: homeLng ?? null,
      })
      if (profileError) return profileError.message
      await loadProfile(data.user.id)
    }

    return null
  }

  async function logout() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const isAuthority = !!profile?.is_authority
  const isLoggedIn = !!profile

  return (
    <AuthorityContext.Provider
      value={{ isAuthority, isLoggedIn, profile, login, signupResident, logout, loading, setProfile }}
    >
      {children}
    </AuthorityContext.Provider>
  )
}

export function useAuthority() {
  return useContext(AuthorityContext)
}