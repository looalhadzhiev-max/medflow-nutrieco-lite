// src/js/pages/patient-details.js
import { supabase } from "../supabaseClient.js";
import { getCurrentProfile } from "../../lib/profile.js";

function el(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id} in patient-details.html`);
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
  el("state").textContent = text;
}

function setMeasurementMsg(text, isError = false) {
  const box = el("mMsg");
  box.textContent = text;
  box.style.color = isError ? "#b00020" : "inherit";
}

async function fetchPatient(patientId) {
  // RLS-only guard: ако няма достъп, ще върне null (maybeSingle)
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function renderPatient(p) {
  // леко нормализиране за debug
  const view = {
    id: p.id,
    full_name: p.full_name ?? p.name ?? null,
    email: p.email ?? null,
    phone: p.phone ?? null,
    notes: p.notes ?? null,
    nutritionist_id: p.nutritionist_id ?? null,
    created_at: p.created_at ?? null,
    updated_at: p.updated_at ?? null,
  };

  el("debug").textContent = JSON.stringify(view, null, 2);
}

async function fetchMeasurements(patientId) {
  const { data, error } = await supabase
    .from("patient_measurements")
    .select("id, taken_at, weight_kg, height_cm, waist_cm, notes, created_at")
    .eq("patient_id", patientId)
    .order("taken_at", { ascending: false })
    .limit(10);

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

function renderMeasurements(list) {
  const ul = el("mList");
  ul.innerHTML = "";

  if (!list.length) {
    const li = document.createElement("li");
    li.textContent = "No measurements yet.";
    ul.appendChild(li);
    return;
  }

  for (const m of list) {
    const li = document.createElement("li");
    const dt = m.taken_at ? new Date(m.taken_at).toLocaleString("bg-BG") : "—";
    li.textContent =
      `${dt} | ` +
      `W: ${m.weight_kg ?? "—"} kg, ` +
      `H: ${m.height_cm ?? "—"} cm, ` +
      `Waist: ${m.waist_cm ?? "—"} cm` +
      (m.notes ? ` | ${m.notes}` : "");
    ul.appendChild(li);
  }
}

function setDatetimeNow() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const localIso =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  el("mTakenAt").value = localIso;
}

async function main() {
  // 1) auth
  const user = await requireAuth();
  if (!user) return;

  // 2) ensure profile (needed for created_by and consistent app behavior)
  const myProfile = await getCurrentProfile({ ensure: true });
  if (!myProfile) {
    setState("Profile not available. Please re-login and try again.");
    return;
  }

  // 3) patientId
  const patientId = getPatientIdFromUrl();
  if (!patientId) {
    setState("Missing patient id in URL. Use ?id=<uuid>");
    el("debug").textContent = JSON.stringify({ patientId }, null, 2);
    return;
  }
  if (!isUuid(patientId)) {
    setState("Invalid patient id. Expected a UUID.");
    el("debug").textContent = JSON.stringify({ patientId }, null, 2);
    return;
  }

  // 4) fetch patient (RLS guarded)
  setState("Loading…");
  let patient;
  try {
    patient = await fetchPatient(patientId);
  } catch (e) {
    console.error("fetchPatient error:", e);
    setState("Failed to load patient.");
    return;
  }

  if (!patient) {
    setState("Patient not found or access denied.");
    el("debug").textContent = JSON.stringify({ patientId }, null, 2);
    return;
  }

  setState("Loaded ✅");
  renderPatient(patient);

  // 5) measurements: initial load
  setDatetimeNow();
  try {
    const list = await fetchMeasurements(patientId);
    renderMeasurements(list);
  } catch (e) {
    console.error("fetchMeasurements error:", e);
    setMeasurementMsg("Failed to load measurements.", true);
  }

  // 6) add measurement
  el("mForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    setMeasurementMsg("Saving…");

    const takenAtVal = el("mTakenAt").value;
    const takenAtIso = takenAtVal ? new Date(takenAtVal).toISOString() : null;

    const weightKg = el("mWeight").value ? Number(el("mWeight").value) : null;
    const heightCm = el("mHeight").value ? Number(el("mHeight").value) : null;
    const waistCm = el("mWaist").value ? Number(el("mWaist").value) : null;
    const notes = el("mNotes").value?.trim() || null;

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

      setMeasurementMsg("Saved ✅");
      el("mNotes").value = "";
    } catch (e) {
      console.error("insertMeasurement error:", e);
      setMeasurementMsg(e?.message || "Failed to save measurement.", true);
    }
  });
}

main();