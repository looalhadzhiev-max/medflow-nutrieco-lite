import { supabase } from '../supabaseClient.js'

function el(html) {
  const t = document.createElement('template')
  t.innerHTML = html.trim()
  return t.content.firstElementChild
}

async function fetchProfiles(search = '') {
  let q = supabase
    .from('profiles')
    .select('id,role,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(200)

  // simple "search by id contains"
  if (search) q = q.ilike('id', `%${search}%`)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

async function updateRole(userId, newRole) {
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) throw error
}

export function initAdminPage() {
  const content = document.getElementById('content')
  if (!content) return

  content.innerHTML = ''
  const wrap = el(`
    <div class="card shadow-sm">
      <div class="card-body">
        <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <div>
            <h2 class="h5 mb-1">Admin • Profiles</h2>
            <div class="text-muted small">Manage roles (admin/user).</div>
          </div>

          <div class="d-flex gap-2">
            <input id="admin-search" class="form-control" style="max-width: 360px" placeholder="Search by user id..." />
            <button id="admin-refresh" class="btn btn-outline-primary">Refresh</button>
          </div>
        </div>

        <div id="admin-alert" class="alert alert-danger d-none mt-3" role="alert"></div>

        <div class="table-responsive mt-3">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>User ID</th>
                <th style="max-width: 160px">Role</th>
                <th class="text-muted">Created</th>
                <th class="text-muted">Updated</th>
              </tr>
            </thead>
            <tbody id="admin-tbody">
              <tr><td colspan="4" class="text-muted">Loading…</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `)

  content.appendChild(wrap)

  const searchInput = wrap.querySelector('#admin-search')
  const refreshBtn = wrap.querySelector('#admin-refresh')
  const alertBox = wrap.querySelector('#admin-alert')
  const tbody = wrap.querySelector('#admin-tbody')

  let debounceTimer = null

  function showError(msg) {
    alertBox.textContent = msg
    alertBox.classList.remove('d-none')
  }
  function clearError() {
    alertBox.classList.add('d-none')
    alertBox.textContent = ''
  }

  function fmt(ts) {
    if (!ts) return ''
    try {
      return new Date(ts).toLocaleString()
    } catch {
      return String(ts)
    }
  }

  function rowTemplate(p) {
    return el(`
      <tr data-id="${p.id}">
        <td class="small"><code>${p.id}</code></td>
        <td>
          <select class="form-select form-select-sm admin-role">
            <option value="user" ${p.role === 'user' ? 'selected' : ''}>user</option>
            <option value="admin" ${p.role === 'admin' ? 'selected' : ''}>admin</option>
          </select>
        </td>
        <td class="text-muted small">${fmt(p.created_at)}</td>
        <td class="text-muted small">${fmt(p.updated_at)}</td>
      </tr>
    `)
  }

  async function render() {
    clearError()
    tbody.innerHTML = `<tr><td colspan="4" class="text-muted">Loading…</td></tr>`

    try {
      const list = await fetchProfiles(searchInput.value.trim())
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-muted">No profiles found.</td></tr>`
        return
      }

      tbody.innerHTML = ''
      for (const p of list) tbody.appendChild(rowTemplate(p))
    } catch (e) {
      console.error(e)
      tbody.innerHTML = `<tr><td colspan="4" class="text-muted">Failed.</td></tr>`
      showError(e?.message || 'Failed to load profiles.')
    }
  }

  // role change (event delegation)
  tbody.addEventListener('change', async (ev) => {
    const sel = ev.target.closest('.admin-role')
    if (!sel) return

    const tr = sel.closest('tr')
    const userId = tr?.dataset?.id
    const newRole = sel.value
    if (!userId) return

    sel.disabled = true
    clearError()

    try {
      await updateRole(userId, newRole)
    } catch (e) {
      console.error(e)
      showError(e?.message || 'Failed to update role.')
      // revert by re-rendering
      await render()
    } finally {
      sel.disabled = false
    }
  })

  refreshBtn.addEventListener('click', render)

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(render, 250)
  })

  render()
}