import { Modal } from 'bootstrap'
import { supabase } from '../supabaseClient.js'
import { getCurrentProfile } from '../../lib/profile.js'

function el(html) {
  const t = document.createElement('template')
  t.innerHTML = html.trim()
  return t.content.firstElementChild
}

function shortId(id) {
  if (!id) return ''
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

function fmt(ts) {
  try {
    return new Date(ts).toLocaleString('bg-BG')
  } catch {
    return String(ts ?? '')
  }
}

async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) throw error
  return data ?? []
}

async function updateProfileName(userId, full_name) {
  const { error } = await supabase.from('profiles').update({ full_name }).eq('id', userId)
  if (error) throw error
}

export async function initAdminPage() {
  const content = document.getElementById('content')
  if (!content) return

  // ensure profile is ready
  let profile = getCurrentProfile()
  if (!profile) {
    await new Promise((resolve) => window.addEventListener('profile:ready', resolve, { once: true }))
    profile = getCurrentProfile()
  }

  if (profile?.role !== 'admin') {
    content.innerHTML = `<div class="alert alert-danger">Access denied.</div>`
    return
  }

  content.innerHTML = ''

  const wrap = el(`
    <div>
      <div class="card shadow-sm">
        <div class="card-body">
          <div class="d-flex align-items-start justify-content-between gap-2 flex-wrap">
            <div>
              <h2 class="h5 mb-1">Admin • Users</h2>
              <div class="text-muted small">Search users by name (not UUID).</div>
            </div>

            <div class="d-flex gap-2 flex-wrap">
              <input id="q" class="form-control form-control-sm" style="max-width:340px" placeholder="Search by full name…" />
              <button id="refresh" class="btn btn-outline-primary btn-sm">Refresh</button>
            </div>
          </div>

          <div class="table-responsive mt-3">
            <table class="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Full name</th>
                  <th class="text-muted">Role</th>
                  <th class="text-muted">Created</th>
                  <th class="text-muted">User ID</th>
                  <th class="text-end"></th>
                </tr>
              </thead>
              <tbody id="tbody">
                <tr><td colspan="5" class="text-muted">Loading…</td></tr>
              </tbody>
            </table>
          </div>

          <div id="count" class="text-muted small mt-2"></div>
        </div>
      </div>

      <!-- Modal -->
      <div class="modal fade" id="editNameModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Edit user name</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body">
              <div class="text-muted small mb-2">Update profile full name (shown in Owner selectors & tables).</div>

              <div class="mb-2">
                <label class="form-label" for="editFullName">Full name</label>
                <input class="form-control" id="editFullName" />
              </div>

              <div id="editErr" class="alert alert-danger d-none mb-0"></div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
              <button class="btn btn-primary" id="saveNameBtn">Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `)

  content.appendChild(wrap)

  // all refs are from wrap (no document.getElementById!)
  const q = wrap.querySelector('#q')
  const refresh = wrap.querySelector('#refresh')
  const tbody = wrap.querySelector('#tbody')
  const count = wrap.querySelector('#count')

  const editModalEl = wrap.querySelector('#editNameModal')
  const editFullName = wrap.querySelector('#editFullName')
  const saveNameBtn = wrap.querySelector('#saveNameBtn')
  const editErr = wrap.querySelector('#editErr')

  // guard: if any modal element is missing, disable editing (no crash)
  const canEdit =
    !!editModalEl && !!editFullName && !!saveNameBtn && !!editErr

  const editModal = canEdit ? new Modal(editModalEl) : null

  let list = []
  let targetUserId = null

  function showEditErr(msg) {
    if (!editErr) return
    editErr.textContent = msg
    editErr.classList.remove('d-none')
  }

  function clearEditErr() {
    if (!editErr) return
    editErr.textContent = ''
    editErr.classList.add('d-none')
  }

  function matches(u, query) {
    if (!query) return true
    const s = query.toLowerCase()
    return (u.full_name || '').toLowerCase().includes(s)
  }

  function render(rows) {
    if (!tbody) return
    tbody.innerHTML = ''

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-muted">No users.</td></tr>`
      if (count) count.textContent = '0 results'
      return
    }

    if (count) count.textContent = `${rows.length} result${rows.length === 1 ? '' : 's'}`

    for (const u of rows) {
      const tr = el(`
        <tr data-id="${u.id}">
          <td class="fw-semibold">${u.full_name || '<no name>'}</td>
          <td class="text-muted">${u.role || '—'}</td>
          <td class="text-muted">${fmt(u.created_at)}</td>
          <td class="text-muted"><code>${shortId(u.id)}</code></td>
          <td class="text-end">
            ${canEdit ? `<button class="btn btn-outline-primary btn-sm" data-action="edit-name">Edit name</button>` : ''}
          </td>
        </tr>
      `)
      tbody.appendChild(tr)
    }
  }

  function applyFilter() {
    const query = q?.value?.trim() || ''
    render(list.filter((u) => matches(u, query)))
  }

  async function load() {
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-muted">Loading…</td></tr>`
    if (count) count.textContent = ''
    try {
      list = await fetchProfiles()
      applyFilter()
    } catch (e) {
      console.error(e)
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-danger">Failed to load profiles.</td></tr>`
    }
  }

  // listeners (safe)
  q?.addEventListener('input', () => {
    clearTimeout(q._t)
    q._t = setTimeout(applyFilter, 120)
  })

  refresh?.addEventListener('click', load)

  tbody?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]')
    if (!btn) return
    const tr = btn.closest('tr')
    const userId = tr?.dataset?.id
    if (!userId) return

    if (btn.dataset.action === 'edit-name' && canEdit) {
      targetUserId = userId
      const u = list.find((x) => x.id === userId)
      editFullName.value = u?.full_name || ''
      clearEditErr()
      editModal?.show()
    }
  })

  saveNameBtn?.addEventListener('click', async () => {
    if (!canEdit) return
    if (!targetUserId) return

    clearEditErr()
    const name = editFullName.value.trim()
    if (!name) return showEditErr('Full name is required.')

    saveNameBtn.disabled = true
    saveNameBtn.textContent = 'Saving…'

    try {
      await updateProfileName(targetUserId, name)

      const idx = list.findIndex((x) => x.id === targetUserId)
      if (idx >= 0) list[idx] = { ...list[idx], full_name: name }

      editModal?.hide()
      applyFilter()
    } catch (err) {
      console.error(err)
      showEditErr(err?.message || 'Failed to update name.')
    } finally {
      saveNameBtn.disabled = false
      saveNameBtn.textContent = 'Save'
      targetUserId = null
    }
  })

  await load()
}