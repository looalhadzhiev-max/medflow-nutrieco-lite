import { supabase } from '../js/supabaseClient.js'
import { loadProfile } from './profile.js'

let initialized = false

export async function initAuthBootstrap() {
  if (initialized) return
  initialized = true

  // 1) initial load
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) console.error('getSession error:', error)

  if (session) {
    await loadProfile()
  } else {
    window.dispatchEvent(new CustomEvent('profile:ready', { detail: null }))
  }

  // 2) auth changes
  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    if (newSession) {
      await loadProfile()
    } else {
      window.dispatchEvent(new CustomEvent('profile:ready', { detail: null }))
    }
  })
}