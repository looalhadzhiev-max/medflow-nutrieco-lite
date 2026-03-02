import { supabase } from '../js/supabaseClient.js'

const KEY_PREFIX = 'mf_profile_v1:'
let cachedProfile = null

function keyForUser(userId) {
  return `${KEY_PREFIX}${userId}`
}

function safeParse(json) {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

function clearAllProfileKeys() {
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const k = sessionStorage.key(i)
    if (k && k.startsWith(KEY_PREFIX)) sessionStorage.removeItem(k)
  }
}

/**
 * Hydrate cachedProfile from sessionStorage for the CURRENT user.
 * emit=false is used during bootstrap before layout render to avoid "late" UI changes.
 */
export async function hydrateProfileFromStorage({ emit = true } = {}) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) console.error('hydrateProfileFromStorage getUser error:', error)

  if (!user) {
    cachedProfile = null
    clearAllProfileKeys()
    if (emit) window.dispatchEvent(new CustomEvent('profile:ready', { detail: null }))
    return null
  }

  const raw = sessionStorage.getItem(keyForUser(user.id))
  cachedProfile = raw ? safeParse(raw) : null

  if (emit && cachedProfile) {
    window.dispatchEvent(new CustomEvent('profile:ready', { detail: cachedProfile }))
  }

  return cachedProfile
}

export async function loadProfile() {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError

    if (!user) {
      cachedProfile = null
      clearAllProfileKeys()
      window.dispatchEvent(new CustomEvent('profile:ready', { detail: null }))
      return null
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Profiles select error:', error)
      throw error
    }

    cachedProfile = data
    sessionStorage.setItem(keyForUser(user.id), JSON.stringify(cachedProfile))

    window.dispatchEvent(new CustomEvent('profile:ready', { detail: cachedProfile }))
    return cachedProfile
  } catch (error) {
    console.error('Failed to load profile:', error)
    // keep cachedProfile (if any) but notify UI
    window.dispatchEvent(new CustomEvent('profile:ready', { detail: cachedProfile }))
    return null
  }
}

export function clearProfileCache() {
  cachedProfile = null
  clearAllProfileKeys()
  window.dispatchEvent(new CustomEvent('profile:ready', { detail: null }))
}

export function getCurrentProfile() {
  return cachedProfile
}