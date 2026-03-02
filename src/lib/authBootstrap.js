import { supabase } from '../js/supabaseClient.js'
import { loadProfile, clearProfileCache } from './profile.js'

let initialized = false
let inFlight = null

async function ensureProfileLoaded() {
  if (inFlight) return inFlight
  inFlight = loadProfile().finally(() => {
    inFlight = null
  })
  return inFlight
}

export async function initAuthBootstrap() {
  if (initialized) return
  initialized = true

  // 1) Initial session (one-time)
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) console.error('getSession error:', error)

  if (session) {
    await ensureProfileLoaded()
  }

  // 2) React to auth changes (avoid duplicate/early null states)
  supabase.auth.onAuthStateChange(async (event, newSession) => {
    // Ignore INITIAL_SESSION to prevent duplicate profile loads/flicker
    if (event === 'INITIAL_SESSION') return

    if (event === 'SIGNED_OUT') {
      clearProfileCache()
      return
    }

    // Only load profile when we actually have a session
    if (newSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
      await ensureProfileLoaded()
    }
  })
}