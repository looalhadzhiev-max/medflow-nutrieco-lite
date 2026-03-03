import { supabase } from "../supabaseClient.js";
import { getCurrentProfile } from "../../lib/profile.js";

const FILE_BUCKET = "patient-files";
const SIGNED_URL_SECONDS = 600; // 10 minutes

function el(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v ?? ""
  );
}

function getPatientIdFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get("id");
}

async function requireAuth() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    window.location.href = "/login.html";
    return null;
  }
  return data.session.user;
}

function setState(text) {
  // state only for errors
  el("state").textContent = text || "";
}

function setBadge(text, kind) {
  const b = el("statusBadge");
  b.classList.remove("ok", "err");
  b.innerHTML = "";
  if (kind) b.classList.add(kind);

  if (text === "Loading…" || text === "Saving…" || text === "Uploading…") {
    const spinner = document.createElement("span");
    spinner.classList.add("spinner");
    if (!kind) spinner.classList.add("spinner-dark");
    b.appendChild(spinner);

    const label = document.createElement("span");
    label.textContent = text;
    b.appendChild(label);
  } else {
    b.textContent = text;
  }
}

function setMeasurementMsg(text, isError = false) {
  const box = el("mMsg");
  box.textContent = text;
  box.classList.toggle("err", !!isError);
}

function setFileMsg(text, isError = false) {
  const box = el("fMsg");
  box.textContent = text;
  box.classList.toggle("err", !!isError);
}

function fmtDt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("bg-BG");
}

function fmtNum(n, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toFixed(digits);
}

function fmtBytes(bytes) {
  if (bytes == null || Number.isNaN(Number(bytes))) return "—";
  const b = Number(bytes);
  if (b < 1024) return `${b} B`;
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function bmiCategory(bmi) {
  if (bmi === null || bmi === undefined || Number.isNaN(bmi)) return "—";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function computeIndices(latest) {
  if (!latest) return { bmi: null, bmiCat: "—", whtr: null };

  const w = latest.weight_kg !== null ? Number(latest.weight_kg) : null;
  const hCm = latest.height_cm !== null ? Number(latest.height_cm) : null;
  const waistCm = latest.waist_cm !== null ? Number(latest.waist_cm) : null;

  let bmi = null;
  if (w != null && hCm != null && hCm > 0) {
    const hM = hCm / 100;
    bmi = w / (hM * hM);
  }

  let whtr = null;
  if (waistCm != null && hCm != null && hCm > 0) {
    whtr = waistCm / hCm;
  }

  return { bmi, bmiCat: bmiCategory(bmi), whtr };
}

function safeFilename(name) {
  // keep it simple: remove slashes and weird control chars
  return String(name ?? "file")
    .replaceAll("/", "_")
    .replaceAll("\\", "_")
    .replace(/[^\w.\- ()]+/g, "_");
}

function randomId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// -------------------- DB fetchers --------------------

async function fetchPatient(patientId) {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchMeasurements(patientId) {
  const { data, error } = await supabase
    .from("patient_measurements")
    .select("id, taken_at, weight_kg, height_cm, waist_cm, notes, created_at")
    .eq("patient_id", patientId)
    .order("taken_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

async function insertMeasurement({
  patientId,
  takenAtIso,
  weightKg,
  heightCm,
  waistCm,
  notes,
  createdBy,
}) {
  const payload = {
    patient_id: patientId,
    taken_at: takenAtIso ?? undefined,
    weight_kg: weightKg ?? null,
    height_cm: heightCm ?? null,
    waist_cm: waistCm ?? null,
    notes: notes ?? null,
    created_by: createdBy,
  };

  const { error } = await supabase.from("patient_measurements").insert(payload);
  if (error) throw error;
}

async function fetchFiles(patientId) {
  const { data, error } = await supabase
    .from("patient_files")
    .select("id, storage_path, original_name, mime_type, size_bytes, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

async function insertFileRow({
  patientId,
  storagePath,
  originalName,
  mimeType,
  sizeBytes,
  uploadedBy,
}) {
  const { error } = await supabase.from("patient_files").insert({
    patient_id: patientId,
    bucket_id: FILE_BUCKET,
    storage_path: storagePath,
    original_name: originalName,
    mime_type: mimeType ?? null,
    size_bytes: sizeBytes ?? null,
    uploaded_by: uploadedBy,
  });

  if (error) throw error;
}

async function deleteFileRow(fileId) {
  const { error } = await supabase.from("patient_files").delete().eq("id", fileId);
  if (error) throw error;
}

// -------------------- Storage helpers --------------------

async function uploadToStorage(storagePath, file) {
  const { error } = await supabase.storage
    .from(FILE_BUCKET)
    .upload(storagePath, file, { upsert: false });

  if (error) throw error;
}

async function removeFromStorage(storagePath) {
  const { error } = await supabase.storage.from(FILE_BUCKET).remove([storagePath]);
  if (error) throw error;
}

async function createSignedUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from(FILE_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS);

  if (error) throw error;
  return data.signedUrl;
}

// -------------------- Render --------------------

function renderPatient(p) {
  const name = p.full_name ?? p.name ?? "—";
  el("title").textContent = name;

  el("dName").textContent = name;
  el("dEmail").textContent = p.email ?? "—";
  el("dPhone").textContent = p.phone ?? "—";
  el("dNotes").textContent = p.notes ?? "—";
  el("dCreated").textContent = fmtDt(p.created_at);
}

function renderMeasurements(list) {
  const tbody = el("mTbody");
  tbody.innerHTML = "";

  if (!list.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" style="color:var(--muted);">No measurements yet.</td>`;
    tbody.appendChild(tr);
    return;
  }

  for (const m of list) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fmtDt(m.taken_at)}</td>
      <td>${m.weight_kg ?? "—"}</td>
      <td>${m.height_cm ?? "—"}</td>
      <td>${m.waist_cm ?? "—"}</td>
      <td>${m.notes ?? ""}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderIndicesFromLatest(latest) {
  el("iDate").textContent = latest ? fmtDt(latest.taken_at) : "—";
  el("iWeight").textContent = latest?.weight_kg != null ? `${latest.weight_kg} kg` : "—";
  el("iHeight").textContent = latest?.height_cm != null ? `${latest.height_cm} cm` : "—";
  el("iWaist").textContent = latest?.waist_cm != null ? `${latest.waist_cm} cm` : "—";

  const { bmi, bmiCat, whtr } = computeIndices(latest);

  el("iBmi").textContent = bmi != null ? fmtNum(bmi, 2) : "—";

  const bmiCatEl = el("iBmiCat");
  bmiCatEl.innerHTML = "";

  if (!bmiCat || bmiCat === "—") {
    bmiCatEl.textContent = "—";
  } else {
    const span = document.createElement("span");
    span.classList.add("bmi-badge");
    if (bmiCat === "Underweight") span.classList.add("bmi-underweight");
    else if (bmiCat === "Normal") span.classList.add("bmi-normal");
    else if (bmiCat === "Overweight") span.classList.add("bmi-overweight");
    else span.classList.add("bmi-obese");
    span.textContent = bmiCat;
    bmiCatEl.appendChild(span);
  }

  el("iWhtr").textContent = whtr != null ? fmtNum(whtr, 2) : "—";
}

function renderFiles(list) {
  const tbody = el("fTbody");
  tbody.innerHTML = "";

  if (!list.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" style="color:var(--muted);">No files yet.</td>`;
    tbody.appendChild(tr);
    return;
  }

  for (const f of list) {
    const tr = document.createElement("tr");
    tr.dataset.fileId = f.id;
    tr.dataset.path = f.storage_path;
    tr.dataset.mime = f.mime_type ?? "";
    tr.dataset.name = f.original_name ?? "";

    tr.innerHTML = `
      <td>${f.original_name ?? "—"}</td>
      <td>${f.mime_type ?? "—"}</td>
      <td>${fmtBytes(f.size_bytes)}</td>
      <td>${fmtDt(f.created_at)}</td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="btn-file" data-action="preview" type="button">Preview</button>
        <button class="btn-file" data-action="download" type="button">Download</button>
        <button class="btn-file danger" data-action="delete" type="button">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function clearPreview() {
  el("fPreview").innerHTML = "";
}

function showPreviewHtml(html) {
  const box = el("fPreview");
  box.innerHTML = html;
}

// -------------------- Form helpers --------------------

function setDatetimeNow() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const localIso =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  el("mTakenAt").value = localIso;
}

// -------------------- Main --------------------

async function main() {
  setBadge("Loading…");
  setState("");

  const user = await requireAuth();
  if (!user) return;

  const myProfile = await getCurrentProfile({ ensure: true });
  if (!myProfile) {
    setBadge("No profile", "err");
    setState("Profile not available. Please re-login.");
    return;
  }

  const patientId = getPatientIdFromUrl();
  if (!patientId) {
    setBadge("Bad URL", "err");
    setState("Missing patient id in URL. Use ?id=<uuid>");
    return;
  }
  if (!isUuid(patientId)) {
    setBadge("Bad id", "err");
    setState("Invalid patient id. Expected a UUID.");
    return;
  }

  let patient;
  try {
    patient = await fetchPatient(patientId);
  } catch (e) {
    console.error("fetchPatient error:", e);
    setBadge("Error", "err");
    setState("Failed to load patient.");
    return;
  }

  if (!patient) {
    setBadge("Denied", "err");
    setState("Patient not found or access denied.");
    return;
  }

  renderPatient(patient);
  setBadge("Loaded", "ok");
  setState("");

  setDatetimeNow();

  // Load measurements + indices
  try {
    const list = await fetchMeasurements(patientId);
    renderMeasurements(list);
    renderIndicesFromLatest(list[0] ?? null);
  } catch (e) {
    console.error("fetchMeasurements error:", e);
    setMeasurementMsg("Failed to load measurements.", true);
    renderIndicesFromLatest(null);
  }

  // Load files
  try {
    const files = await fetchFiles(patientId);
    renderFiles(files);
    clearPreview();
  } catch (e) {
    console.error("fetchFiles error:", e);
    setFileMsg("Failed to load files.", true);
  }

  // Add measurement
  el("mForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    setMeasurementMsg("Saving…");
    setBadge("Saving…");

    const takenAtVal = el("mTakenAt").value;
    const takenAtIso = takenAtVal ? new Date(takenAtVal).toISOString() : null;

    const weightKg = el("mWeight").value ? Number(el("mWeight").value) : null;
    const heightCm = el("mHeight").value ? Number(el("mHeight").value) : null;
    const waistCm = el("mWaist").value ? Number(el("mWaist").value) : null;
    const notes = el("mNotes").value?.trim() || null;

    if (weightKg == null && heightCm == null && waistCm == null && !notes) {
      setMeasurementMsg("Please enter at least one value.", true);
      setBadge("Loaded", "ok");
      return;
    }

    try {
      await insertMeasurement({
        patientId,
        takenAtIso,
        weightKg,
        heightCm,
        waistCm,
        notes,
        createdBy: myProfile.id,
      });

      const list = await fetchMeasurements(patientId);
      renderMeasurements(list);
      renderIndicesFromLatest(list[0] ?? null);

      setMeasurementMsg("Saved ✅");
      el("mNotes").value = "";
    } catch (e) {
      console.error("insertMeasurement error:", e);
      setMeasurementMsg(e?.message || "Failed to save measurement.", true);
    } finally {
      setBadge("Loaded", "ok");
    }
  });

  // Upload file
  el("fForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    setFileMsg("Uploading…");
    setBadge("Uploading…");

    const input = el("fInput");
    const file = input.files?.[0];
    if (!file) {
      setFileMsg("Please choose a file.", true);
      setBadge("Loaded", "ok");
      return;
    }

    const originalName = safeFilename(file.name);
    const storagePath = `${patientId}/${randomId()}_${originalName}`;

    try {
      await uploadToStorage(storagePath, file);
      await insertFileRow({
        patientId,
        storagePath,
        originalName,
        mimeType: file.type || null,
        sizeBytes: file.size ?? null,
        uploadedBy: myProfile.id,
      });

      const files = await fetchFiles(patientId);
      renderFiles(files);
      input.value = "";
      setFileMsg("Uploaded ✅");
    } catch (e) {
      console.error("upload error:", e);
      setFileMsg(e?.message || "Failed to upload file.", true);
    } finally {
      setBadge("Loaded", "ok");
    }
  });

  // File actions: preview/download/delete
  el("fTbody").addEventListener("click", async (ev) => {
    const btn = ev.target.closest("button[data-action]");
    if (!btn) return;

    const tr = btn.closest("tr");
    const fileId = tr?.dataset?.fileId;
    const path = tr?.dataset?.path;
    const mime = tr?.dataset?.mime || "";
    const name = tr?.dataset?.name || "file";

    if (!fileId || !path) return;

    const action = btn.dataset.action;

    try {
      if (action === "download") {
        setFileMsg("Preparing download…");
        const url = await createSignedUrl(path);
        window.open(url, "_blank", "noopener,noreferrer");
        setFileMsg("");
        return;
      }

      if (action === "preview") {
        setFileMsg("Preparing preview…");
        const url = await createSignedUrl(path);

        // Simple preview container with close button
        if (mime.startsWith("image/")) {
          showPreviewHtml(`
            <div class="card" style="box-shadow:none; background:rgba(255,255,255,.6);">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                <div style="font-weight:800;">Preview: ${name}</div>
                <button type="button" id="closePreview">Close</button>
              </div>
              <div style="margin-top:12px;">
                <img src="${url}" alt="preview" style="max-width:100%; border-radius:12px; border:1px solid var(--border);" />
              </div>
            </div>
          `);
        } else if (mime === "application/pdf") {
          showPreviewHtml(`
            <div class="card" style="box-shadow:none; background:rgba(255,255,255,.6);">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                <div style="font-weight:800;">Preview: ${name}</div>
                <button type="button" id="closePreview">Close</button>
              </div>
              <div style="margin-top:12px;">
                <iframe src="${url}" style="width:100%; height:520px; border:1px solid var(--border); border-radius:12px; background:white;"></iframe>
              </div>
            </div>
          `);
        } else {
          showPreviewHtml(`
            <div class="card" style="box-shadow:none; background:rgba(255,255,255,.6);">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                <div style="font-weight:800;">No inline preview for this file type.</div>
                <button type="button" id="closePreview">Close</button>
              </div>
              <div style="margin-top:10px;">
                <a class="btnlike" href="${url}" target="_blank" rel="noopener noreferrer">Open / Download</a>
              </div>
            </div>
          `);
        }

        // Close handler (after HTML injected)
        const closeBtn = document.getElementById("closePreview");
        if (closeBtn) closeBtn.addEventListener("click", () => clearPreview(), { once: true });

        setFileMsg("");
        return;
      }

      if (action === "delete") {
        const ok = confirm(`Delete file "${name}"?`);
        if (!ok) return;

        setFileMsg("Deleting…");
        // delete DB row first (so UI won't show it even if storage fails)
        await deleteFileRow(fileId);

        try {
          await removeFromStorage(path);
        } catch (storageErr) {
          console.warn("Storage remove failed (orphan possible):", storageErr);
        }

        const files = await fetchFiles(patientId);
        renderFiles(files);
        clearPreview();
        setFileMsg("Deleted ✅");
        return;
      }
    } catch (e) {
      console.error("file action error:", e);
      setFileMsg(e?.message || "File action failed.", true);
    }
  });
}

main();