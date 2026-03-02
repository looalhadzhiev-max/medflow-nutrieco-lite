import { getCurrentProfile, loadProfile } from '../lib/profile.js'

export async function requireAdmin() {
  // If profile isn't loaded yet (e.g. direct open /admin.html)
  let profile = getCurrentProfile()
  if (!profile) {
    await loadProfile()
    profile = getCurrentProfile()
  }

  if (profile?.role !== 'admin') {
    // Use replace to avoid back-button loops and stop current flow cleanly
    window.location.replace('index.html') // смени на 'dashboard.html' ако имаш реален dashboard
    return false
  }

  return true
}