import { Modal } from 'bootstrap'
import { supabase } from '../supabaseClient.js'
import { getCurrentProfile } from '../../lib/profile.js'

function el(html) {
  const t = document.createElement('template')
  t.innerHTML = html.trim()
  return t.content.firstElementChild
}

function fmt(ts) {
  try {
    return new Date(ts).toLocaleString('bg-BG')
  } catch {
    return String(ts ?? '')
  }
}

function shortId(id) {
  if (!id) return ''
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

async function getUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data?.user?.id ?? null
}

function injectPatientsUiStylesOnce() {
  if (document.getElementById('mf-patients-ui')) return
  const s = document.createElement('style')
  s.id = 'mf-patients-ui'
  s.textContent = `
    .owner-pill{
      display:inline-flex; align-items:center; gap:8px;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid rgba(15,23,42,.10);
      background: rgba(255,255,255,.75);
      font-weight: 900;
      font-size: 12px;
      color: #334155;
      max-width: 260px;
    }
    .owner-pill .name{
      max-width: 190px;
      overflow:hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .owner-pill .role{
      font-weight: 900;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(15,23,42,.10);
      background: rgba(15,23,42,.04);
      color: #0f172a;
      text-transform: lowercase;
    }

    .btn-chip{
      border-radius: 999px !important;
      padding: 6px 10px !important;
      font-weight: 900 !important;
    }
    .actions{
      display:flex;
      justify-content:flex-end;
      gap:8px;
      flex-wrap:wrap;
    }
    @media (max-width: 520px){
      .actions{ justify-content:flex-start; }
    }

    .patient-sub{
      color:#64748b;
      font-size: 12px;
      margin-top: 2px;
      display:flex;
      gap:10px;
      flex-wrap:wrap;
    }
    .patient-sub span{ display:inline-flex; align-items:center; gap:6px; }

    .search-row{
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
    }
    .search-row .form-control{ max-width: 340px; }
  `
  document.head.appendChild(s)
}

async function fetchPatients() {
  const { data, error } = await supabase
    .from('patients')
    .select('id, owner_id, full_name, email, phone, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) throw error
  return data ?? []
}

async function fetchUsersForAdmin() {
  // ✅ full_name is used to show owner name everywhere
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, created_at')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) throw error
  return data ?? []
}

async function createPatient({ owner_id, full_name, email, phone, notes }) {
  const { error } = await supabase.from('patients').insert([{
    owner_id,
    full_name,
    email: email || null,
    phone: phone || null,
    notes: notes || null,
  }])
  if (error) throw error
}

async function deletePatient(id) {
  const { error } = await supabase.from('patients').delete().eq('id', id)
  if (error) throw error
}

async function reassignPatientOwner(patientId, newOwnerId) {
  const { error } = await supabase
    .from('patients')
    .update({ owner_id: newOwnerId })
    .eq('id', patientId)

  if (error) throw error
}

export async function initPatientsPage() {
  injectPatientsUiStylesOnce()

  const content = document.getElementById('content')
  if (!content) return

  // Wait for profile (prevents admin/non-admin races)
  let profile = getCurrentProfile()
  if (!profile) {
    await new Promise((resolve) => {
      window.addEventListener('profile:ready', () => resolve(), { once: true })
    })
    profile = getCurrentProfile()
  }

  const isAdmin = profile?.role === 'admin'
  content.innerHTML = ''

  const wrap = el(`
    <div>
      <div class="row g-3">
        <div class="col-12 col-lg-5">
          <div class="card shadow-sm">
            <div class="card-body">
              <h2 class="h5 mb-3">Add patient</h2>

              <div id="patients-alert" class="alert alert-danger d-none" role="alert"></div>

              <form id="patient-form" novalidate>
                ${isAdmin ? `
                  <div class="mb-3">
                    <label class="form-label" for="owner_select">Owner</label>
                    <select class="form-select" id="owner_select"></select>
                    <div class="form-text">Admin can create patients for any user.</div>
                  </div>
                ` : ''}

                <div class="mb-3">
                  <label class="form-label" for="full_name">Full name</label>
                  <input class="form-control" id="full_name" required />
                </div>

                <div class="mb-3">
                  <label class="form-label" for="email">Email</label>
                  <input class="form-control" id="email" type="email" />
                </div>

                <div class="mb-3">
                  <label class="form-label" for="phone">Phone</label>
                  <input class="form-control" id="phone" />
                </div>

                <div class="mb-3">
                  <label class="form-label" for="notes">Notes</label>
                  <textarea class="form-control" id="notes" rows="3"></textarea>
                </div>

                <button class="btn btn-primary w-100" type="submit">Create</button>
              </form>
            </div>
          </div>
        </div>

        <div class="col-12 col-lg-7">
          <div class="card shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-start justify-content-between gap-2 flex-wrap">
                <div>
                  <h2 class="h5 mb-1">Patients</h2>
                  <div class="text-muted small">${isAdmin ? 'Admin sees all patients.' : 'You can see only your patients.'}</div>
                </div>

                <div class="search-row">
                  <input id="searchName" class="form-control form-control-sm" placeholder="Search by name / email / phone…" />
                  <button id="patients-refresh" class="btn btn-outline-primary btn-sm btn-chip">
                    <i class="bi bi-arrow-repeat me-1"></i>Refresh
                  </button>
                </div>
              </div>

              <div class="table-responsive mt-3">
                <table class="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      ${isAdmin ? `<th class="text-muted">Owner</th>` : ''}
                      <th class="text-muted">Created</th>
                      <th class="text-end"></th>
                    </tr>
                  </thead>
                  <tbody id="patients-tbody">
                    <tr><td colspan="${isAdmin ? 4 : 3}" class="text-muted">Loading…</td></tr>
                  </tbody>
                </table>
              </div>

              <div class="text-muted small mt-2" id="patients-count"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="reassignModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Reassign patient owner</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body">
              <div class="mb-2 text-muted small">Select the new owner for this patient.</div>

              <div class="mb-3">
                <label class="form-label" for="reassignOwnerSelect">New owner</label>
                <select class="form-select" id="reassignOwnerSelect"></select>
              </div>

              <div id="reassignAlert" class="alert alert-danger d-none" role="alert"></div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="reassignConfirmBtn">Confirm</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `)

  content.appendChild(wrap)

  const alertBox = wrap.querySelector('#patients-alert')
  const form = wrap.querySelector('#patient-form')
  const fullNameInput = wrap.querySelector('#full_name')
  const emailInput = wrap.querySelector('#email')
  const phoneInput = wrap.querySelector('#phone')
  const notesInput = wrap.querySelector('#notes')

  const refreshBtn = wrap.querySelector('#patients-refresh')
  const searchInput = wrap.querySelector('#searchName')
  const tbody = wrap.querySelector('#patients-tbody')
  const countEl = wrap.querySelector('#patients-count')

  const ownerSelect = wrap.querySelector('#owner_select') // admin only

  const reassignModalEl = wrap.querySelector('#reassignModal')
  const reassignOwnerSelect = wrap.querySelector('#reassignOwnerSelect')
  const reassignConfirmBtn = wrap.querySelector('#reassignConfirmBtn')
  const reassignAlert = wrap.querySelector('#reassignAlert')

  const reassignModal = new Modal(reassignModalEl)

  let targetPatientId = null
  let usersCache = []
  let patientsCache = []

  // owner mapping
  const ownerById = new Map() // id -> { name, role }
  function ownerName(id) {
    const o = ownerById.get(id)
    return (o?.name && o.name.trim()) ? o.name : shortId(id)
  }
  function ownerRole(id) {
    return ownerById.get(id)?.role || ''
  }

  function showError(msg) {
    alertBox.textContent = msg
    alertBox.classList.remove('d-none')
  }
  function clearError() {
    alertBox.classList.add('d-none')
    alertBox.textContent = ''
  }

  function showReassignError(msg) {
    reassignAlert.textContent = msg
    reassignAlert.classList.remove('d-none')
  }
  function clearReassignError() {
    reassignAlert.classList.add('d-none')
    reassignAlert.textContent = ''
  }

  reassignModalEl.addEventListener('hidden.bs.modal', () => {
    targetPatientId = null
    clearReassignError()
    reassignConfirmBtn.disabled = false
    reassignConfirmBtn.textContent = 'Confirm'
  })

  // Admin: load users and fill selects with full_name
  if (isAdmin) {
    try {
      usersCache = await fetchUsersForAdmin()

      // map
      for (const u of usersCache) {
        ownerById.set(u.id, {
          name: u.full_name || '',
          role: u.role || '',
        })
      }

      // admins first
      usersCache.sort((a, b) => {
        const ar = a.role === 'admin' ? 0 : 1
        const br = b.role === 'admin' ? 0 : 1
        return ar - br
      })

      const fillSelect = (selectEl) => {
        if (!selectEl) return
        selectEl.innerHTML = ''
        for (const u of usersCache) {
          const name = (u.full_name && u.full_name.trim()) ? u.full_name : shortId(u.id)
          const opt = document.createElement('option')
          opt.value = u.id
          opt.textContent = `${name} (${u.role})`
          selectEl.appendChild(opt)
        }
      }

      fillSelect(ownerSelect)
      fillSelect(reassignOwnerSelect)

      const myId = await getUserId()
      if (myId && ownerSelect) ownerSelect.value = myId
    } catch (e) {
      console.error(e)
      showError(e?.message || 'Failed to load users for owner picker.')
    }
  } else {
    reassignOwnerSelect.innerHTML = ''
  }

  reassignConfirmBtn.addEventListener('click', async () => {
    if (!isAdmin) return
    if (!targetPatientId) return

    const newOwnerId = reassignOwnerSelect.value
    if (!newOwnerId) return

    clearReassignError()
    reassignConfirmBtn.disabled = true
    reassignConfirmBtn.textContent = 'Saving...'

    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout. Check RLS / network.')), 8000)
      )

      await Promise.race([
        reassignPatientOwner(targetPatientId, newOwnerId),
        timeout,
      ])

      reassignModal.hide()
      targetPatientId = null
      await loadAndRender()
    } catch (e) {
      console.error(e)
      showReassignError(e?.message || 'Failed to reassign owner.')
    } finally {
      reassignConfirmBtn.disabled = false
      reassignConfirmBtn.textContent = 'Confirm'
    }
  })

  function matchesQuery(p, q) {
    if (!q) return true
    const s = q.toLowerCase()
    return (
      (p.full_name || '').toLowerCase().includes(s) ||
      (p.email || '').toLowerCase().includes(s) ||
      (p.phone || '').toLowerCase().includes(s) ||
      (p.notes || '').toLowerCase().includes(s)
    )
  }

  function renderTable(list) {
    tbody.innerHTML = ''

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="${isAdmin ? 4 : 3}" class="text-muted">No patients found.</td></tr>`
      countEl.textContent = '0 results'
      return
    }

    countEl.textContent = `${list.length} result${list.length === 1 ? '' : 's'}`

    for (const p of list) {
      const detailsHref = `/patient-details.html?id=${encodeURIComponent(p.id)}`

      const subParts = []
      if (p.email) subParts.push(`<span><i class="bi bi-envelope"></i>${p.email}</span>`)
      if (p.phone) subParts.push(`<span><i class="bi bi-telephone"></i>${p.phone}</span>`)

      const tr = el(`
        <tr data-id="${p.id}" data-owner="${p.owner_id}">
          <td>
            <a href="${detailsHref}" class="fw-semibold text-decoration-none">
              ${p.full_name || '—'}
            </a>

            ${subParts.length ? `<div class="patient-sub">${subParts.join('')}</div>` : ''}

            ${p.notes ? `<div class="text-muted small mt-1">${p.notes}</div>` : ''}
          </td>

          ${isAdmin ? `
            <td class="text-muted small">
              <span class="owner-pill">
                <span class="name">${ownerName(p.owner_id)}</span>
                <span class="role">${ownerRole(p.owner_id)}</span>
              </span>
            </td>
          ` : ''}

          <td class="text-muted small">${fmt(p.created_at)}</td>

          <td class="text-end">
            <div class="actions">
              <a class="btn btn-outline-primary btn-sm btn-chip" href="${detailsHref}">
                <i class="bi bi-box-arrow-up-right me-1"></i>View
              </a>
              ${isAdmin ? `
                <button class="btn btn-outline-secondary btn-sm btn-chip" data-action="reassign">
                  <i class="bi bi-person-gear me-1"></i>Reassign
                </button>
              ` : ''}
              <button class="btn btn-outline-danger btn-sm btn-chip" data-action="delete">
                <i class="bi bi-trash me-1"></i>Delete
              </button>
            </div>
          </td>
        </tr>
      `)

      tbody.appendChild(tr)
    }
  }

  async function loadAndRender() {
    clearError()
    tbody.innerHTML = `<tr><td colspan="${isAdmin ? 4 : 3}" class="text-muted">Loading…</td></tr>`
    countEl.textContent = ''

    try {
      patientsCache = await fetchPatients()
      const q = searchInput.value.trim()
      const filtered = patientsCache.filter(p => matchesQuery(p, q))
      renderTable(filtered)
    } catch (e) {
      console.error(e)
      tbody.innerHTML = `<tr><td colspan="${isAdmin ? 4 : 3}" class="text-muted">Failed.</td></tr>`
      showError(e?.message || 'Failed to load patients.')
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    clearError()

    const full_name = fullNameInput.value.trim()
    const email = emailInput.value.trim()
    const phone = phoneInput.value.trim()
    const notes = notesInput.value.trim()

    if (!full_name) {
      showError('Full name is required.')
      return
    }

    const btn = form.querySelector('button[type="submit"]')
    btn.disabled = true

    try {
      let owner_id
      if (isAdmin && ownerSelect?.value) owner_id = ownerSelect.value
      else owner_id = await getUserId()

      if (!owner_id) throw new Error('Not authenticated.')

      await createPatient({ owner_id, full_name, email, phone, notes })

      fullNameInput.value = ''
      emailInput.value = ''
      phoneInput.value = ''
      notesInput.value = ''

      await loadAndRender()
    } catch (e2) {
      console.error(e2)
      showError(e2?.message || 'Failed to create patient.')
    } finally {
      btn.disabled = false
    }
  })

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]')
    if (!btn) return

    const tr = btn.closest('tr')
    const id = tr?.dataset?.id
    if (!id) return

    clearError()

    if (btn.dataset.action === 'delete') {
      btn.disabled = true
      try {
        await deletePatient(id)
        await loadAndRender()
      } catch (e2) {
        console.error(e2)
        showError(e2?.message || 'Failed to delete patient.')
      } finally {
        btn.disabled = false
      }
      return
    }

    if (btn.dataset.action === 'reassign') {
      if (!isAdmin) return
      targetPatientId = id

      const currentOwner = tr.dataset.owner
      if (currentOwner) reassignOwnerSelect.value = currentOwner

      clearReassignError()
      reassignModal.show()
    }
  })

  refreshBtn.addEventListener('click', loadAndRender)

  let searchT
  searchInput.addEventListener('input', () => {
    clearTimeout(searchT)
    searchT = setTimeout(() => {
      const q = searchInput.value.trim()
      const filtered = patientsCache.filter(p => matchesQuery(p, q))
      renderTable(filtered)
    }, 120)
  })

  await loadAndRender()
}