import { register, logout } from '../auth.js'

export function initRegisterPage() {
  const content = document.getElementById('content')
  if (!content) return

  content.innerHTML = `
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-12 col-sm-10 col-md-6 col-lg-4">
          <div id="auth-error" class="alert alert-danger d-none" role="alert"></div>
          <div id="auth-success" class="alert alert-success d-none" role="alert"></div>

          <form id="auth-form" class="card card-body shadow-sm" novalidate>
            <div class="mb-3">
              <label for="email" class="form-label">Email address</label>
              <input type="email" class="form-control" id="email" required />
            </div>
            <div class="mb-3">
              <label for="password" class="form-label">Password</label>
              <input type="password" class="form-control" id="password" required />
              <div class="form-text">Use at least 8 chars (demo).</div>
            </div>
            <button type="submit" class="btn btn-primary w-100">Create account</button>
          </form>
        </div>
      </div>
    </div>
  `

  const form = document.getElementById('auth-form')
  const emailInput = document.getElementById('email')
  const passwordInput = document.getElementById('password')
  const errorBox = document.getElementById('auth-error')
  const successBox = document.getElementById('auth-success')
  const submitBtn = form.querySelector('button[type=submit]')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorBox.classList.add('d-none')
    successBox.classList.add('d-none')
    submitBtn.disabled = true

    const email = emailInput.value.trim()
    const password = passwordInput.value

    const { data, error } = await register(email, password)

    submitBtn.disabled = false

    if (error) {
      errorBox.textContent = error.message || 'Registration failed'
      errorBox.classList.remove('d-none')
      return
    }

    // If Supabase created a session automatically, clear it so user can login explicitly
    if (data?.session) {
      await logout()
    }

    successBox.textContent = 'Account created. You can login now.'
    successBox.classList.remove('d-none')

    setTimeout(() => {
      window.location.href = 'login.html'
    }, 1200)
  })
}

window.addEventListener('layout:ready', initRegisterPage, { once: true })