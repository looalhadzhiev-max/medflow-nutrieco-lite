// ----------------------------
// Global styles & libraries
// ----------------------------
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// ----------------------------
// Core app modules
// ----------------------------
import { renderLayout } from './js/layout.js'
import { initAuthBootstrap } from './lib/authBootstrap.js'
import { hydrateProfileFromStorage } from './lib/profile.js'

import { redirectIfAuthed } from './js/guestOnly.js'
import { requireAuth } from './js/guards.js'
import { requireAdmin } from './js/adminGuard.js'

// ----------------------------
// Determine current page
// ----------------------------
const page = window.location.pathname.split('/').pop() || 'index.html'

// ----------------------------
// Guards FIRST (redirect before rendering anything)
// ----------------------------

// Guest-only pages
if (page === 'login.html' || page === 'register.html') {
  await redirectIfAuthed()
}

// Protected pages
if (page === 'dashboard.html' || page === 'patients.html' || page === 'patient-details.html' || page === 'admin.html') {
  const ok = await requireAuth()
  if (ok === false) {
    // requireAuth should redirect to login
    // stop execution so we don't render/layout-init
    throw new Error('Redirecting to login...')
  }
}

// Admin page
if (page === 'admin.html') {
  const ok = await requireAdmin()
  if (ok === false) {
    // requireAdmin should redirect away
    throw new Error('Redirecting: not an admin...')
  }
}

// ----------------------------
// Bootstrap order (NO flicker)
// 1) hydrate profile from storage (emit:false) BEFORE layout render
// 2) render layout
// 3) auth bootstrap (fetch profile + emits profile:ready)
// ----------------------------
await hydrateProfileFromStorage({ emit: false })

await renderLayout()
window.dispatchEvent(new Event('layout:ready'))

await initAuthBootstrap()

// ----------------------------
// Page Initializers (only existing)
// ----------------------------
if (page === 'login.html') {
  const mod = await import('./js/pages/loginPage.js')
  mod.initLoginPage?.()
}

if (page === 'register.html') {
  const mod = await import('./js/pages/registerPage.js')
  mod.initRegisterPage?.()
}

if (page === 'admin.html') {
  const mod = await import('./js/pages/adminPage.js')
  mod.initAdminPage?.()
}