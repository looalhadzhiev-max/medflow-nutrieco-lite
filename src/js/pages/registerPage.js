import { supabase } from '../supabaseClient.js'

function el(html) {
  const t = document.createElement('template')
  t.innerHTML = html.trim()
  return t.content.firstElementChild
}

function setMsg(box, text, isError = false) {
  box.textContent = text
  box.classList.toggle('text-danger', !!isError)
  box.classList.toggle('text-success', !isError)
}

export function initRegisterPage() {
  const content = document.getElementById('content')
  if (!content) return

  content.innerHTML = ''

  const wrap = el(`
    <div class="row justify-content-center">
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card shadow-sm">
          <div class="card-body">
            <h2 class="h5 mb-3">Create account</h2>

            <form id="registerForm">
              <div class="mb-3">
                <label class="form-label">Full name</label>
                <input class="form-control" id="fullName" required />
              </div>

              <div class="mb-3">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" id="email" required />
              </div>

              <div class="mb-3">
                <label class="form-label">Password</label>
                <input type="password" class="form-control" id="password" required minlength="6" />
              </div>

              <button class="btn btn-primary w-100" type="submit">
                Register
              </button>
            </form>

            <div id="authMsg" class="small mt-3"></div>

            <div class="text-muted small mt-3">
              Already have an account?
              <a href="/login.html">Login</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `)

  content.appendChild(wrap)

  const form = wrap.querySelector('#registerForm')
  const msgBox = wrap.querySelector('#authMsg')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    setMsg(msgBox, 'Creating account…')

    const full_name = wrap.querySelector('#fullName').value.trim()
    const email = wrap.querySelector('#email').value.trim()
    const password = wrap.querySelector('#password').value

    if (!full_name) return setMsg(msgBox, 'Full name required.', true)

    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error

      if (data.user) {
        await supabase.from('profiles').upsert(
          [{
            id: data.user.id,
            full_name,
            role: 'user'
          }],
          { onConflict: 'id' }
        )
      }

      setMsg(msgBox, 'Account created ✅ Redirecting...')
      setTimeout(() => window.location.href = '/login.html', 900)

    } catch (err) {
      console.error(err)
      setMsg(msgBox, err.message || 'Registration failed.', true)
    }
  })
}