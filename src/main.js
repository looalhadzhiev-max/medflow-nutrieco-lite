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

// ----------------------------
// Bootstrap order (NO flicker)
// 1) hydrate profile from storage (emit:false) BEFORE layout render
// 2) render layout (navbar reads cached role instantly)
// 3) auth bootstrap (fetches true profile + emits profile:ready)
// ----------------------------
await hydrateProfileFromStorage({ emit: false })

await renderLayout()
window.dispatchEvent(new Event('layout:ready'))

await initAuthBootstrap()

// ----------------------------
// Simple Page Router
// ----------------------------
const page = window.location.pathname.split('/').pop() || 'index.html'

// ----------------------------
// Guards
// ----------------------------

// Guest-only pages
if (page === 'login.html' || page === 'register.html') {
  await redirectIfAuthed()
}

// Protected pages (добавяй/махай според реалните ти страници)
if (page === 'dashboard.html' || page === 'patients.html' || page === 'patient-details.html' || page === 'admin.html') {
  await requireAuth()
}

// ----------------------------
// Page Initializers (само тези, които реално съществуват)
// ----------------------------
if (page === 'login.html') {
  const mod = await import('./js/pages/loginPage.js')
  mod.initLoginPage?.()
}

if (page === 'register.html') {
  const mod = await import('./js/pages/registerPage.js')
  mod.initRegisterPage?.()
}

// Ако после създадеш patientsPage.js/adminPage.js и т.н. — добавяме ги тук.