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
    return new Date(ts).toLocaleString()
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

async function fetchPatients() {
  const { data, error } = await supabase
    .from('patients')
    .select('id, owner_id, full_name, email, phone, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw error
  return data ?? []
}

async function fetchUsersForAdmin() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw error
  return data ?? []
}

async function createPatient({ owner_id, full_name, email, phone, notes }) {
  const { error } = await supabase.from('patients').insert([
    {
      owner_id,
      full_name,
      email: email || null,
      phone: phone || null,
      notes,
    },
  ])
  if (error) throw error
}

async function deletePatient(id) {
  const { error } = await supabase.from('patients').delete().eq('id', id)
  if (error) throw error
}

async function reassignPatientOwner(patientId, newOwnerId) {
  const { error } = await supabase.from('patients').update({ owner_id: newOwnerId }).eq('id', patientId)
  if (error) throw error
}

export async function initPatientsPage() {
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

  // IMPORTANT: single root wrapper (modal included inside)
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
                  <input class="form-control" id="phone" type="text" />
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
              <div class="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <h2 class="h5 mb-1">Patients</h2>
                  <div class="text-muted small">${isAdmin ? 'Admin sees all patients.' : 'You can see only your patients.'}</div>
                </div>
                <button id="patients-refresh" class="btn btn-outline-primary btn-sm">Refresh</button>
              </div>

              <div class="table-responsive mt-3">
                <table class="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      ${isAdmin ? `<th class="text-muted">Owner</th>` : ''}
                      <th class="text-muted">Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody id="patients-tbody">
                    <tr><td colspan="${isAdmin ? 4 : 3}" class="text-muted">Loading…</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal is inside the same root wrapper -->
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
  const tbody = wrap.querySelector('#patients-tbody')

  const ownerSelect = wrap.querySelector('#owner_select') // admin only

  // modal refs (always exist)
  const reassignModalEl = wrap.querySelector('#reassignModal')
  const reassignOwnerSelect = wrap.querySelector('#reassignOwnerSelect')
  const reassignConfirmBtn = wrap.querySelector('#reassignConfirmBtn')
  const reassignAlert = wrap.querySelector('#reassignAlert')

  // Guard (should never fail now)
  if (!reassignModalEl) {
    console.error('reassignModalEl missing - template root issue')
    return
  }

  const reassignModal = new Modal(reassignModalEl)

  let targetPatientId = null
  let usersCache = []

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

  // Admin: load users and fill selects
  if (isAdmin) {
    try {
      usersCache = await fetchUsersForAdmin()

      usersCache.sort((a, b) => {
        const ar = a.role === 'admin' ? 0 : 1
        const br = b.role === 'admin' ? 0 : 1
        return ar - br
      })

      const fillSelect = (selectEl) => {
        if (!selectEl) return
        selectEl.innerHTML = ''
        for (const u of usersCache) {
          const opt = document.createElement('option')
          opt.value = u.id
          opt.textContent = `${shortId(u.id)} (${u.role})`
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

  // Confirm reassign (admin only) + timeout
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

      await Promise.race([reassignPatientOwner(targetPatientId, newOwnerId), timeout])

      reassignModal.hide()
      targetPatientId = null
      await render()
    } catch (e) {
      console.error(e)
      showReassignError(e?.message || 'Failed to reassign owner.')
    } finally {
      reassignConfirmBtn.disabled = false
      reassignConfirmBtn.textContent = 'Confirm'
    }
  })

  async function render() {
    clearError()
    tbody.innerHTML = `<tr><td colspan="${isAdmin ? 4 : 3}" class="text-muted">Loading…</td></tr>`

    try {
      const list = await fetchPatients()

      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 4 : 3}" class="text-muted">No patients yet.</td></tr>`
        return
      }

      tbody.innerHTML = ''
      for (const p of list) {
        const detailsHref = `/patient-details.html?id=${encodeURIComponent(p.id)}`

        const tr = el(`
          <tr data-id="${p.id}" data-owner="${p.owner_id}">
            <td>
              <a href="${detailsHref}" class="fw-semibold text-decoration-none">
                ${p.full_name}
              </a>

              ${p.email ? `<div class="text-muted small">${p.email}</div>` : ''}
              ${p.phone ? `<div class="text-muted small">${p.phone}</div>` : ''}
              ${p.notes ? `<div class="text-muted small">${p.notes}</div>` : ''}
            </td>

            ${isAdmin ? `<td class="text-muted small"><code>${shortId(p.owner_id)}</code></td>` : ''}

            <td class="text-muted small">${fmt(p.created_at)}</td>

            <td class="text-end">
              <a class="btn btn-outline-primary btn-sm me-2" href="${detailsHref}">View</a>

              ${isAdmin ? `<button class="btn btn-outline-secondary btn-sm me-2" data-action="reassign">Reassign</button>` : ''}
              <button class="btn btn-outline-danger btn-sm" data-action="delete">Delete</button>
            </td>
          </tr>
        `)

        tbody.appendChild(tr)
      }
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
    const email = emailInput?.value.trim() || null
    const phone = phoneInput?.value.trim() || null
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

      await createPatient({
        owner_id,
        full_name,
        email,
        phone,
        notes: notes || null,
      })

      fullNameInput.value = ''
      if (emailInput) emailInput.value = ''
      if (phoneInput) phoneInput.value = ''
      notesInput.value = ''
      await render()
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
        await render()
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

  refreshBtn.addEventListener('click', render)

  await render()
}