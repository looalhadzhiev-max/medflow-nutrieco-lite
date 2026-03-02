import { getSession, logout } from './auth.js'
import { getCurrentProfile, clearProfileCache } from '../lib/profile.js'

/**
 * Layout Module – Vanilla JavaScript Multi-Page App
 * Renders Bootstrap 5 navbar, main container, and footer (session-aware + role-aware)
 */

const pageTitle = {
  '/index.html': 'Home',
  '/': 'Home',
  '/login.html': 'Login',
  '/register.html': 'Register',
  '/dashboard.html': 'Dashboard',
  '/patients.html': 'Patients',
  '/patient-details.html': 'Patient Details',
  '/admin.html': 'Admin',
}

function getCurrentPageTitle() {
  const path = window.location.pathname
  const fileName = path.includes('/') ? '/' + path.split('/').pop() : '/'
  return pageTitle[fileName] || pageTitle['/'] || 'MedFlow NutriEco Lite'
}

function createNavItem(text, href) {
  const li = document.createElement('li')
  li.className = 'nav-item'

  const a = document.createElement('a')
  a.className = 'nav-link'
  a.href = href
  a.textContent = text

  li.appendChild(a)
  return li
}

/**
 * Role-based UI applier
 * - Adds Admin nav item only when role === 'admin'
 * - Removes it otherwise
 */
function applyRoleNav(profile) {
  const ul = document.querySelector('#nav-items')
  if (!ul) return

  let adminItem = document.querySelector('#admin-item')

  if (profile?.role === 'admin') {
    if (!adminItem) {
      adminItem = createNavItem('Admin', 'admin.html')
      adminItem.id = 'admin-item'

      const logoutBtn = ul.querySelector('button')
      const logoutLi = logoutBtn?.closest('li.nav-item')

      if (logoutLi) ul.insertBefore(adminItem, logoutLi)
      else ul.appendChild(adminItem)
    }
  } else {
    if (adminItem) adminItem.remove()
  }
}

function buildNav(session) {
  const nav = document.createElement('nav')
  nav.className = 'navbar navbar-expand-lg navbar-dark bg-primary'

  nav.innerHTML = `
    <div class="container-fluid">
      <a class="navbar-brand fw-bold" href="index.html">MedFlow NutriEco Lite</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
        aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto" id="nav-items"></ul>
      </div>
    </div>
  `

  const ul = nav.querySelector('#nav-items')

  ul.appendChild(createNavItem('Home', 'index.html'))

  if (!session) {
    ul.appendChild(createNavItem('Login', 'login.html'))
    ul.appendChild(createNavItem('Register', 'register.html'))
  } else {
    ul.appendChild(createNavItem('Dashboard', 'dashboard.html'))
    ul.appendChild(createNavItem('Patients', 'patients.html'))

    // Render Admin immediately if cached profile says admin (prevents flicker)
    const profile = getCurrentProfile()
    if (profile?.role === 'admin') {
      const adminItem = createNavItem('Admin', 'admin.html')
      adminItem.id = 'admin-item'
      ul.appendChild(adminItem)
    }

    const logoutLi = document.createElement('li')
    logoutLi.className = 'nav-item'

    const btn = document.createElement('button')
    btn.className = 'btn btn-outline-light ms-2'
    btn.type = 'button'
    btn.textContent = 'Logout'

    btn.addEventListener('click', async () => {
      // 1) instant UI feedback
      btn.disabled = true
      btn.textContent = 'Logging out...'
      clearProfileCache()

      // Optional: immediately swap navbar to guest to feel instant
      const existing = document.querySelector('nav.navbar')
      const updated = buildNav(null)
      if (existing?.parentNode) existing.parentNode.replaceChild(updated, existing)

      // 2) real logout (must finish BEFORE redirect)
      try {
        await logout()
      } catch (e) {
        console.warn('Logout failed:', e)
      }

      // 3) redirect
      window.location.href = 'login.html'
    })

    logoutLi.appendChild(btn)
    ul.appendChild(logoutLi)
  }

  return nav
}

// Avoid registering duplicate listeners if renderLayout is called multiple times
let roleListenerRegistered = false

export async function renderLayout() {
  const app = document.querySelector('#app')
  if (!app) {
    console.warn('Element "#app" not found.')
    return
  }

  const currentTitle = getCurrentPageTitle()
  const year = new Date().getFullYear()

  app.innerHTML = ''
  app.style.display = 'flex'
  app.style.flexDirection = 'column'
  app.style.minHeight = '100vh'

  const session = await getSession()
  const nav = buildNav(session)

  const main = document.createElement('main')
  main.className = 'flex-grow-1'
  main.innerHTML = `
    <div class="container-fluid py-4">
      <h1 class="mb-4">${currentTitle}</h1>
      <div id="content"></div>
    </div>
  `

  const footer = document.createElement('footer')
  footer.className = 'bg-light text-center py-3 border-top mt-5'
  footer.innerHTML = `
    <div class="container-fluid">
      <p class="mb-0 text-muted">&copy; ${year} MedFlow NutriEco Lite. All rights reserved.</p>
    </div>
  `

  app.appendChild(nav)
  app.appendChild(main)
  app.appendChild(footer)

  // Load profile and apply role-based UI
  if (session) {
    const profile = await getCurrentProfile()
    applyRoleNav(profile)
  }
}