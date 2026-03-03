// src/js/layout.js
import { supabase } from './supabaseClient.js'
import { getCurrentProfile } from '../lib/profile.js'

function pageName() {
  return window.location.pathname.split('/').pop() || 'index.html'
}

function navLink(href, label, current, icon = '') {
  const active = current === href
  return `
    <li class="nav-item">
      <a class="nav-link ${active ? 'active' : ''}" href="/${href}">
        ${icon ? `<i class="bi ${icon} me-1"></i>` : ''}${label}
      </a>
    </li>
  `
}

function renderBrand() {
  // Mini inline icon (A+B: medical + SaaS)
  return `
    <a class="navbar-brand d-flex align-items-center gap-2" href="/index.html" aria-label="MedFlow Home">
      <span class="brand-icon" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="mf_g2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#2563eb"/>
              <stop offset="1" stop-color="#22c55e"/>
            </linearGradient>
          </defs>
          <rect x="8" y="8" width="80" height="80" rx="18" fill="url(#mf_g2)"/>
          <rect x="20" y="20" width="56" height="56" rx="14" fill="rgba(255,255,255,0.92)"/>
          <path d="M26 52h12l7-16 12 32 9-20h20"
                fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M66 32v12M60 38h12" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
        </svg>
      </span>

      <span class="brand-text text-white fw-bold">MedFlow</span>
      <span class="badge text-bg-light ms-1" style="font-weight:800;">Lite</span>
    </a>
  `
}

function injectStylesOnce() {
  if (document.getElementById('mf-layout-styles')) return
  const style = document.createElement('style')
  style.id = 'mf-layout-styles'
  style.textContent = `
    :root{
      --brand: #2563eb;
      --brand-dark: #1e40af;
      --accent: #22c55e;
      --bg: #f7fafc;
      --text: #0f172a;
      --muted: #64748b;
      --cardBorder: rgba(15,23,42,.08);
    }

    body{
      background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
      color: var(--text);
    }

    .navbar-custom{
      background: rgba(37, 99, 235, 0.96);
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 24px rgba(2,6,23,.10);
    }

    .navbar-custom .nav-link{
      opacity: .88;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .navbar-custom .nav-link:hover{ opacity: 1; }
    .navbar-custom .nav-link.active{
      opacity: 1;
      position: relative;
    }
    .navbar-custom .nav-link.active::after{
      content:"";
      position:absolute;
      left: .55rem;
      right: .55rem;
      bottom: .25rem;
      height: 2px;
      background: rgba(255,255,255,.9);
      border-radius: 999px;
    }

    .brand-text{ letter-spacing: -0.02em; }
    .page-wrap{ padding: 18px 0; }
    @media (max-width: 576px){
      .page-wrap{ padding: 10px 0; }
    }

    .btn{
      border-radius: 12px;
      font-weight: 700;
    }
    .btn-primary{
      background: var(--brand);
      border-color: var(--brand);
    }
    .btn-primary:hover{
      background: var(--brand-dark);
      border-color: var(--brand-dark);
    }
    .btn-outline-light{
      border-radius: 12px;
      font-weight: 800;
    }
    .btn-cta{
      background: rgba(255,255,255,.14);
      border: 1px solid rgba(255,255,255,.26);
      color: #fff;
    }
    .btn-cta:hover{
      background: rgba(255,255,255,.22);
      color: #fff;
    }
  `
  document.head.appendChild(style)
}

function buildNav(profile) {
  const current = pageName()

  const role = profile?.role || null
  const authed = !!profile // treat profile presence as logged in

  // Right side action button:
  // - guest: Login (single)
  // - authed: Logout
  const actionBtn = authed
    ? `<button id="btnLogout" class="btn btn-outline-light btn-sm ms-lg-2">Logout</button>`
    : `<a class="btn btn-outline-light btn-sm ms-lg-2" href="/login.html">Login</a>`

  // ✅ Guest links: remove "Login" to avoid duplicates.
  // Keep Register in nav (like CTA), and Login only as right button.
  const linksGuest = [
    navLink('index.html', 'Home', current, 'bi-house'),
    navLink('register.html', 'Register', current, 'bi-person-plus'),
  ].join('')

  const linksUser = [
    navLink('index.html', 'Home', current, 'bi-house'),
    navLink('dashboard.html', 'Dashboard', current, 'bi-speedometer2'),
    navLink('patients.html', 'Patients', current, 'bi-people'),
  ].join('')

  const linksAdmin = [
    navLink('index.html', 'Home', current, 'bi-house'),
    navLink('dashboard.html', 'Dashboard', current, 'bi-speedometer2'),
    navLink('patients.html', 'Patients', current, 'bi-people'),
    navLink('admin.html', 'Admin', current, 'bi-shield-lock'),
  ].join('')

  const navLinks = !authed ? linksGuest : role === 'admin' ? linksAdmin : linksUser

  return `
    <nav class="navbar navbar-expand-lg navbar-dark navbar-custom">
      <div class="container">
        ${renderBrand()}

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMain" aria-controls="navMain" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navMain">
          <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-2">
            ${navLinks}
          </ul>

          <div class="d-flex align-items-center mt-3 mt-lg-0">
            ${actionBtn}
          </div>
        </div>
      </div>
    </nav>
  `
}

function buildShell() {
  return `
    <div id="layoutRoot">
      <header id="navbarHost"></header>

      <main class="page-wrap">
        <div class="container">
          <div id="content"></div>
        </div>
      </main>
    </div>
  `
}

function wireLogout() {
  const btn = document.getElementById('btnLogout')
  if (!btn) return

  btn.addEventListener('click', async () => {
    btn.disabled = true
    try {
      await supabase.auth.signOut()
      window.location.href = '/index.html'
    } catch (e) {
      console.error('signOut error', e)
      btn.disabled = false
    }
  })
}

export async function renderLayout() {
  injectStylesOnce()

  const app = document.getElementById('app')
  if (!app) return

  // Render shell once
  app.innerHTML = buildShell()

  const navbarHost = document.getElementById('navbarHost')
  if (!navbarHost) return

  // Initial render
  let profile = getCurrentProfile()
  navbarHost.innerHTML = buildNav(profile)
  wireLogout()

  // Re-render on profile changes
  window.addEventListener('profile:ready', (ev) => {
    const p = ev?.detail ?? getCurrentProfile()
    navbarHost.innerHTML = buildNav(p)
    wireLogout()
  })
}