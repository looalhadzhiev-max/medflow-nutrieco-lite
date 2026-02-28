/**
 * Layout Module – Vanilla JavaScript Multi-Page App
 * Renders Bootstrap 5 navbar, main container, and footer
 */

/**
 * Map window.location.pathname to page titles
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
};

/**
 * Get the current page title based on pathname
 */
function getCurrentPageTitle() {
  const path = window.location.pathname;
  // Handle both full paths and relative paths
  const fileName = path.includes('/') ? '/' + path.split('/').pop() : '/';
  return pageTitle[fileName] || pageTitle['/'] || 'MedFlow NutriEco Lite';
}

/**
 * Render the layout (navbar, main, footer)
 */
export function renderLayout() {
  const app = document.querySelector('div#app');
  
  if (!app) {
    console.warn('Element "div#app" not found in the DOM.');
    return;
  }

  const currentTitle = getCurrentPageTitle();

  // Navbar
  const nav = document.createElement('nav');
  nav.className = 'navbar navbar-expand-lg navbar-dark bg-primary';
  nav.innerHTML = `
    <div class="container-fluid">
      <a class="navbar-brand fw-bold" href="/index.html">
        MedFlow NutriEco Lite
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <a class="nav-link" href="index.html">Home</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="login.html">Login</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="register.html">Register</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="dashboard.html">Dashboard</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="patients.html">Patients</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="admin.html">Admin</a>
          </li>
          <li class="nav-item">
            <button class="btn btn-outline-light ms-2" disabled>Logout</button>
          </li>
        </ul>
      </div>
    </div>
  `;

  // Main container
  const main = document.createElement('main');
  const year = new Date().getFullYear()
  main.className = 'flex-grow-1';
  main.innerHTML = `
    <div class="container-fluid py-4">
      <h1 class="mb-4">${currentTitle}</h1>
      <div id="content"></div>
    </div>
  `;

  // Footer
  const footer = document.createElement('footer');
  footer.className = 'bg-light text-center py-3 border-top mt-5';
  footer.innerHTML = `
    <div class="container-fluid">
      <p class="mb-0 text-muted">
        &copy; ${year} MedFlow NutriEco Lite. All rights reserved.
      </p>
    </div>
  `;

  // Wrapper to enable flexbox full-height layout
  app.innerHTML = '';
  app.style.display = 'flex';
  app.style.flexDirection = 'column';
  app.style.minHeight = '100vh';

  app.appendChild(nav);
  app.appendChild(main);
  app.appendChild(footer);
}
