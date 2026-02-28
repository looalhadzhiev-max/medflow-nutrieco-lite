import { login } from '../auth.js';

/**
 * Initialize the login page by rendering the form and wiring up
 * the submission logic.
 */
export function initLoginPage() {
  const content = document.getElementById('content');
  if (!content) {
    console.warn('loginPage: #content not found');
    return;
  }

  content.innerHTML = `
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-12 col-sm-10 col-md-6 col-lg-4">
        <div id="auth-error" class="alert alert-danger d-none" role="alert"></div>

        <form id="auth-form" class="card card-body shadow-sm" novalidate>
          <div class="mb-3">
            <label for="email" class="form-label">Email address</label>
            <input type="email" class="form-control" id="email" required />
          </div>
          <div class="mb-3">
            <label for="password" class="form-label">Password</label>
            <input type="password" class="form-control" id="password" required />
          </div>
          <button type="submit" class="btn btn-primary w-100">Login</button>
        </form>
      </div>
    </div>
  </div>
  `;
  const form = document.getElementById('auth-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const errorContainer = document.getElementById('auth-error');
  const submitBtn = form.querySelector('button[type=submit]');

  form.addEventListener('submit', async (evt) => {
    evt.preventDefault();

    errorContainer.classList.add('d-none');
    submitBtn.disabled = true;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const { data, error } = await login(email, password);
    submitBtn.disabled = false;

  if (error) {
  let message = 'Login failed';

  if (error.message.includes('Invalid login credentials')) {
    message = 'Invalid email or password.';
  } else if (error.message.includes('Email not confirmed')) {
    message = 'Please confirm your email before logging in.';
  } else {
    message = error.message || 'Login failed';
  }

  errorContainer.textContent = message;
  errorContainer.classList.remove('d-none');
  submitBtn.textContent = 'Login';
  return;
}

    // on success redirect to dashboard
    window.location.href = 'dashboard.html';
  });
}

// auto-run when module is included in a page
window.addEventListener('layout:ready', () => {
  initLoginPage()
}, { once: true })