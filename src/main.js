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
// Helpers
// ----------------------------
function setFallback(message) {
  const content = document.getElementById('content')
  if (!content) return
  content.innerHTML = `
    <div class="py-5">
      <div class="alert alert-warning shadow-sm">
        <div class="fw-bold mb-1">Page did not initialize</div>
        <div>${message}</div>
        <div class="mt-2 small text-muted">Current page: <code>${page}</code></div>
      </div>
    </div>
  `
}

async function safePageInit(label, importer, initName) {
  try {
    const mod = await importer()
    const fn = mod?.[initName]
    if (typeof fn !== 'function') {
      console.warn(`[INIT] ${label}: missing export ${initName}()`)
      setFallback(`Missing initializer <code>${initName}()</code> in <code>${label}</code>.`)
      return
    }
    await fn()
  } catch (e) {
    console.error(`[INIT] ${label} failed:`, e)
    setFallback(`Initializer crashed for <code>${label}</code>. Check Console.`)
  }
}

// ----------------------------
// Guards FIRST (redirect before rendering anything)
// ----------------------------

// Guest-only pages
if (page === 'login.html' || page === 'register.html') {
  await redirectIfAuthed()
}

// Protected pages
if (
  page === 'dashboard.html' ||
  page === 'patients.html' ||
  page === 'patient-details.html' ||
  page === 'admin.html'
) {
  const ok = await requireAuth()
  if (ok === false) {
    throw new Error('Redirecting to login...')
  }
}

// Admin page
if (page === 'admin.html') {
  const ok = await requireAdmin()
  if (ok === false) {
    throw new Error('Redirecting: not an admin...')
  }
}

// ----------------------------
// Bootstrap order (NO flicker)
// ----------------------------
await hydrateProfileFromStorage({ emit: false })

await renderLayout()
window.dispatchEvent(new Event('layout:ready'))

await initAuthBootstrap()

// ----------------------------
// Page Initializers
// ----------------------------
if (page === 'login.html') {
  await safePageInit('loginPage.js', () => import('./js/pages/loginPage.js'), 'initLoginPage')
}

if (page === 'register.html') {
  await safePageInit('registerPage.js', () => import('./js/pages/registerPage.js'), 'initRegisterPage')
}

if (page === 'admin.html') {
  await safePageInit('adminPage.js', () => import('./js/pages/adminPage.js'), 'initAdminPage')
}

if (page === 'patients.html') {
  await safePageInit('patientsPage.js', () => import('./js/pages/patientsPage.js'), 'initPatientsPage')
}

if (page === 'dashboard.html') {
  await safePageInit('dashboardPage.js', () => import('./js/pages/dashboardPage.js'), 'initDashboardPage')
}

if (page === 'patient-details.html') {
  await safePageInit(
    'patientDetailsPage.js',
    () => import('./js/pages/patient-details.js'),
    'initPatientDetailsPage'
  )
}

if (page === 'index.html') {
  await safePageInit('homePage.js', () => import('./js/pages/homePage.js'), 'initHomePage')
}