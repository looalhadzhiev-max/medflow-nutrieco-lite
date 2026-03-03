import { supabase } from "../supabaseClient.js";
import { getCurrentProfile } from "../../lib/profile.js";

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
  el("state").textContent = text;
}

function setBadge(text, kind) {
  const b = el("statusBadge");
  b.classList.remove("ok", "err");
  b.innerHTML = "";

  if (kind) b.classList.add(kind);

  // If loading → show spinner
  if (text === "Loading…" || text === "Saving…") {
    const spinner = document.createElement("span");
    spinner.classList.add("spinner");

    // If badge is not primary-colored, use dark spinner
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

function fmtDt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("bg-BG");
}

function fmtNum(n, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toFixed(digits);
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

  // Colored BMI badge
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

function setDatetimeNow() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const localIso =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  el("mTakenAt").value = localIso;
}

async function main() {
  setBadge("Loading…");
  setState("Loading…");

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
  let list = [];
  try {
    list = await fetchMeasurements(patientId);
    renderMeasurements(list);
    renderIndicesFromLatest(list[0] ?? null);
  } catch (e) {
    console.error("fetchMeasurements error:", e);
    setMeasurementMsg("Failed to load measurements.", true);
    renderIndicesFromLatest(null);
  }

  // Add measurement
  el("mForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    setMeasurementMsg("Saving…");

    const takenAtVal = el("mTakenAt").value;
    const takenAtIso = takenAtVal ? new Date(takenAtVal).toISOString() : null;

    const weightKg = el("mWeight").value ? Number(el("mWeight").value) : null;
    const heightCm = el("mHeight").value ? Number(el("mHeight").value) : null;
    const waistCm = el("mWaist").value ? Number(el("mWaist").value) : null;
    const notes = el("mNotes").value?.trim() || null;

    if (weightKg == null && heightCm == null && waistCm == null && !notes) {
      setMeasurementMsg("Please enter at least one value.", true);
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

      list = await fetchMeasurements(patientId);
      renderMeasurements(list);
      renderIndicesFromLatest(list[0] ?? null);

      setMeasurementMsg("Saved ✅");
      el("mNotes").value = "";
    } catch (e) {
      console.error("insertMeasurement error:", e);
      setMeasurementMsg(e?.message || "Failed to save measurement.", true);
    }
  });
}

main();