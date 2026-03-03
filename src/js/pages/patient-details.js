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

function renderPatient(p) {
  // опитваме се да ползваме най-честите имена на полета
  const name = p.full_name ?? p.name ?? "—";
  const email = p.email ?? "—";
  const phone = p.phone ?? "—";
  const notes = p.notes ?? "—";
  const created = p.created_at ? new Date(p.created_at).toLocaleString("bg-BG") : "—";
  const updated = p.updated_at ? new Date(p.updated_at).toLocaleString("bg-BG") : "—";

  el("debug").textContent = JSON.stringify(
    {
      id: p.id,
      full_name: name,
      email,
      phone,
      notes,
      created_at: created,
      updated_at: updated,
    },
    null,
    2
  );
}

async function fetchPatient(patientId) {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .maybeSingle();

  if (error) throw error;
  return data; // ако е null => not found OR access denied (RLS)
}

async function main() {
  // 1) auth
  const user = await requireAuth();
  if (!user) return;

  // 2) ensure profile cache (за да имаш role-based navbar/UX consistency)
  // не е задължително за RLS-only guard, но е полезно
  await getCurrentProfile({ ensure: true });

  // 3) validate id
  const patientId = getPatientIdFromUrl();
  if (!patientId) {
    setState("Missing patient id in URL. Use ?id=<uuid>");
    return;
  }
  if (!isUuid(patientId)) {
    setState("Invalid patient id. Expected a UUID.");
    el("debug").textContent = JSON.stringify({ patientId }, null, 2);
    return;
  }

  // 4) fetch (RLS guard)
  setState("Loading…");
  let patient = null;

  try {
    patient = await fetchPatient(patientId);
  } catch (e) {
    console.error("fetchPatient error:", e);
    setState("Failed to load patient.");
    return;
  }

  if (!patient) {
    // RLS ще се прояви като null тук
    setState("Patient not found or access denied.");
    el("debug").textContent = JSON.stringify({ patientId }, null, 2);
    return;
  }

  // 5) render
  setState("Loaded ✅");
  renderPatient(patient);
}

main();