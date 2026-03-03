import { supabase } from "../supabaseClient.js";
import { getCurrentProfile } from "../../lib/profile.js";

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function fmtDt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("bg-BG");
  } catch {
    return String(iso);
  }
}

function fmtNum(n, digits = 2) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toFixed(digits);
}

function bmiFrom(wKg, hCm) {
  if (wKg == null || hCm == null) return null;
  const w = Number(wKg);
  const h = Number(hCm);
  if (!Number.isFinite(w) || !Number.isFinite(h) || h <= 0) return null;
  const hm = h / 100;
  return w / (hm * hm);
}

function bmiCat(bmi) {
  if (bmi == null) return null;
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function whtrFrom(waistCm, hCm) {
  if (waistCm == null || hCm == null) return null;
  const w = Number(waistCm);
  const h = Number(hCm);
  if (!Number.isFinite(w) || !Number.isFinite(h) || h <= 0) return null;
  return w / h;
}

function whtrRisk(whtr) {
  if (whtr == null) return null;
  if (whtr < 0.5) return "OK";
  if (whtr < 0.6) return "Moderate";
  return "High";
}

function injectLocalStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .kpi-grid{display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px;}
    @media (max-width: 992px){ .kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr));} }
    @media (max-width: 520px){ .kpi-grid{grid-template-columns:1fr;} }

    .chart-grid{display:grid; grid-template-columns:1fr 1fr; gap:14px;}
    @media (max-width: 992px){ .chart-grid{grid-template-columns:1fr;} }

    .sf-card{
      border: 1px solid rgba(15,23,42,.08);
      border-radius: 16px;
      box-shadow: 0 10px 26px rgba(2,6,23,.06);
      background: linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,.85));
      backdrop-filter: blur(8px);
    }
    .sf-card .card-header{
      background: transparent;
      border-bottom: 1px solid rgba(15,23,42,.06);
      font-weight: 800;
      letter-spacing: -0.01em;
    }
    .kpi{
      display:flex; align-items:center; justify-content:space-between; gap:12px;
    }
    .kpi .label{color:#64748b; font-weight:700; font-size:12px; text-transform:uppercase; letter-spacing:.06em;}
    .kpi .value{font-size:28px; font-weight:900; letter-spacing:-0.02em;}
    .kpi .hint{color:#64748b; font-size:12px; margin-top:4px;}
    .chip{
      display:inline-flex; align-items:center; gap:8px;
      padding: 6px 10px; border-radius: 999px;
      border: 1px solid rgba(15,23,42,.10);
      background: rgba(255,255,255,.75);
      font-weight: 800; font-size: 12px; color:#334155;
    }
    .legend{display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;}
    .dot{width:10px; height:10px; border-radius:50%;}
    .bar-row{display:flex; align-items:center; justify-content:space-between; gap:12px; margin:8px 0;}
    .bar{flex:1; height:10px; border-radius:999px; background: rgba(15,23,42,.06); overflow:hidden;}
    .bar > div{height:100%;}
    .mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;}
    .table thead th{color:#64748b;}
    .row-hover tbody tr:hover{background: rgba(37,99,235,.04);}
  `;
  document.head.appendChild(style);
}

/**
 * Donut chart SVG.
 * IMPORTANT: total is allowed to be 0 (no more `|| 1`).
 */
function donutSvg(segments, { size = 140, thickness = 18 } = {}) {
  const total = segments.reduce((a, s) => a + (s.value || 0), 0); // ✅ allow 0
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;

  // if total is 0 -> show only base ring + center text (0)
  if (total === 0) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Donut chart">
        <circle cx="${c}" cy="${c}" r="${r}" fill="transparent" stroke="rgba(15,23,42,.06)" stroke-width="${thickness}" />
        <text x="${c}" y="${c - 2}" text-anchor="middle" font-size="22" font-weight="900" fill="#0f172a">0</text>
        <text x="${c}" y="${c + 18}" text-anchor="middle" font-size="11" font-weight="800" fill="#64748b">patients</text>
      </svg>
    `;
  }

  let offset = 0;
  const rings = segments
    .filter((s) => (s.value || 0) > 0)
    .map((s) => {
      const v = s.value || 0;
      const frac = v / total;
      const dash = circumference * frac;
      const gap = circumference - dash;

      const el = `
        <circle
          cx="${c}" cy="${c}" r="${r}"
          fill="transparent"
          stroke="${s.color}"
          stroke-width="${thickness}"
          stroke-dasharray="${dash} ${gap}"
          stroke-dashoffset="${-offset}"
          stroke-linecap="round"
        />`;

      offset += dash;
      return el;
    })
    .join("");

  const center = `
    <text x="${c}" y="${c - 2}" text-anchor="middle" font-size="22" font-weight="900" fill="#0f172a">${total}</text>
    <text x="${c}" y="${c + 18}" text-anchor="middle" font-size="11" font-weight="800" fill="#64748b">patients</text>
  `;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Donut chart">
      <circle cx="${c}" cy="${c}" r="${r}" fill="transparent" stroke="rgba(15,23,42,.06)" stroke-width="${thickness}" />
      <g transform="rotate(-90 ${c} ${c})">
        ${rings}
      </g>
      ${center}
    </svg>
  `;
}

async function countExact(table) {
  const { error, count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

async function fetchRecent() {
  const { data: mData, error: mErr } = await supabase
    .from("patient_measurements")
    .select("taken_at, weight_kg, height_cm, waist_cm, patients(full_name)")
    .order("taken_at", { ascending: false })
    .limit(5);

  if (mErr) throw mErr;

  const { data: fData, error: fErr } = await supabase
    .from("patient_files")
    .select("created_at, original_name, mime_type, size_bytes, patients(full_name)")
    .order("created_at", { ascending: false })
    .limit(5);

  if (fErr) throw fErr;

  return { measurements: mData ?? [], files: fData ?? [] };
}

/**
 * Latest measurement per patient for charts.
 * ✅ Filter out "empty" rows (all metrics null), so charts don't show phantom patients.
 */
async function fetchLatestByPatientForCharts() {
  const { data, error } = await supabase
    .from("patient_measurements")
    .select("patient_id, taken_at, weight_kg, height_cm, waist_cm")
    .or("weight_kg.not.is.null,height_cm.not.is.null,waist_cm.not.is.null") // ✅ at least one value
    .order("taken_at", { ascending: false })
    .limit(2000);

  if (error) throw error;

  const latest = new Map(); // patient_id -> row
  for (const row of data ?? []) {
    if (!latest.has(row.patient_id)) latest.set(row.patient_id, row);
  }
  return Array.from(latest.values());
}

async function getLatestPatientId() {
  const { data, error } = await supabase
    .from("patients")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

function renderDashboardSkeleton(content, profile) {
  content.innerHTML = `
    <div class="container py-2">
      <div class="d-flex align-items-center justify-content-between gap-3 mb-3">
        <div>
          <div class="text-muted fw-bold" style="letter-spacing:.06em; text-transform:uppercase; font-size:12px;">Dashboard</div>
          <h1 class="m-0" style="font-weight:900; letter-spacing:-.02em;">Overview</h1>
          <div class="text-muted mt-1">Signed in as <span class="mono">${profile?.role ?? "user"}</span></div>
        </div>

        <div class="d-flex gap-2">
          <a class="btn btn-primary" href="/patients.html"><i class="bi bi-people me-2"></i>Patients</a>

          <!-- smart button (default = Find patient) -->
          <a class="btn btn-outline-primary" id="btnOpenDetails" href="/patients.html">
            <i class="bi bi-search me-2"></i>Find patient
          </a>
        </div>
      </div>

      <div class="kpi-grid mb-3">
        <div class="card sf-card">
          <div class="card-body">
            <div class="kpi">
              <div>
                <div class="label">Patients</div>
                <div class="value" id="kPatients">—</div>
                <div class="hint">Total visible to you</div>
              </div>
              <div class="chip"><i class="bi bi-people"></i></div>
            </div>
          </div>
        </div>

        <div class="card sf-card">
          <div class="card-body">
            <div class="kpi">
              <div>
                <div class="label">Measurements</div>
                <div class="value" id="kMeasurements">—</div>
                <div class="hint">Total records</div>
              </div>
              <div class="chip"><i class="bi bi-rulers"></i></div>
            </div>
          </div>
        </div>

        <div class="card sf-card">
          <div class="card-body">
            <div class="kpi">
              <div>
                <div class="label">Files</div>
                <div class="value" id="kFiles">—</div>
                <div class="hint">Uploads / lab docs</div>
              </div>
              <div class="chip"><i class="bi bi-paperclip"></i></div>
            </div>
          </div>
        </div>

        <div class="card sf-card">
          <div class="card-body">
            <div class="kpi">
              <div>
                <div class="label">Last activity</div>
                <div class="value" style="font-size:16px; font-weight:900;" id="kLast">—</div>
                <div class="hint">Latest measurement or file</div>
              </div>
              <div class="chip"><i class="bi bi-activity"></i></div>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-grid mb-3">
        <div class="card sf-card">
          <div class="card-header">BMI distribution (latest per patient)</div>
          <div class="card-body d-flex flex-wrap align-items-center gap-3">
            <div id="bmiDonut">Loading…</div>
            <div style="min-width:220px;">
              <div class="legend" id="bmiLegend"></div>
              <div class="text-muted mt-2" style="font-size:12px;">Based on latest measurement per patient (BMI = kg / m²).</div>
            </div>
          </div>
        </div>

        <div class="card sf-card">
          <div class="card-header">WHtR risk (latest per patient)</div>
          <div class="card-body">
            <div id="whtrBars">Loading…</div>
            <div class="text-muted mt-2" style="font-size:12px;">WHtR = waist(cm) / height(cm). OK &lt; 0.50, Moderate 0.50–0.60, High &gt; 0.60.</div>
          </div>
        </div>
      </div>

      <div class="chart-grid">
        <div class="card sf-card">
          <div class="card-header">Recent measurements</div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm row-hover">
                <thead><tr><th>When</th><th>Patient</th><th>W/H/Waist</th><th>BMI</th></tr></thead>
                <tbody id="recentM"><tr><td colspan="4" class="text-muted">Loading…</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card sf-card">
          <div class="card-header">Recent uploads</div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm row-hover">
                <thead><tr><th>When</th><th>Patient</th><th>File</th><th>Type</th></tr></thead>
                <tbody id="recentF"><tr><td colspan="4" class="text-muted">Loading…</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;
}

export async function initDashboardPage() {
  const content = document.getElementById("content");
  if (!content) return;

  injectLocalStyles();

  // ensure profile
  let profile = getCurrentProfile();
  if (!profile) {
    await new Promise((resolve) =>
      window.addEventListener("profile:ready", resolve, { once: true })
    );
    profile = getCurrentProfile();
  }

  renderDashboardSkeleton(content, profile);

  // KPI counts
  try {
    const [patients, measurements, files] = await Promise.all([
      countExact("patients"),
      countExact("patient_measurements"),
      countExact("patient_files"),
    ]);

    qs("#kPatients").textContent = String(patients);
    qs("#kMeasurements").textContent = String(measurements);
    qs("#kFiles").textContent = String(files);
  } catch (e) {
    console.error("KPI error:", e);
  }

  // Charts
  try {
    const latest = await fetchLatestByPatientForCharts();

    const bmiCounts = { Underweight: 0, Normal: 0, Overweight: 0, Obese: 0, Unknown: 0 };
    const whtrCounts = { OK: 0, Moderate: 0, High: 0, Unknown: 0 };

    for (const r of latest) {
      const bmi = bmiFrom(r.weight_kg, r.height_cm);
      const bc = bmiCat(bmi) ?? "Unknown";
      bmiCounts[bc]++;

      const whtr = whtrFrom(r.waist_cm, r.height_cm);
      const wr = whtrRisk(whtr) ?? "Unknown";
      whtrCounts[wr]++;
    }

    const bmiSegments = [
      { label: "Underweight", value: bmiCounts.Underweight, color: "#3b82f6" },
      { label: "Normal", value: bmiCounts.Normal, color: "#22c55e" },
      { label: "Overweight", value: bmiCounts.Overweight, color: "#f59e0b" },
      { label: "Obese", value: bmiCounts.Obese, color: "#ef4444" },
      { label: "Unknown", value: bmiCounts.Unknown, color: "#94a3b8" },
    ];

    qs("#bmiDonut").innerHTML = donutSvg(bmiSegments);

    const legend = qs("#bmiLegend");
    const nonZero = bmiSegments.filter((s) => s.value > 0);

    legend.innerHTML = nonZero.length
      ? nonZero
          .map(
            (s) => `
              <span class="chip">
                <span class="dot" style="background:${s.color}"></span>
                ${s.label}: ${s.value}
              </span>
            `
          )
          .join("")
      : `<span class="text-muted">No data yet.</span>`;

    const total = Object.values(whtrCounts).reduce((a, b) => a + b, 0);
    const bars = [
      { label: "OK", value: whtrCounts.OK, color: "#22c55e" },
      { label: "Moderate", value: whtrCounts.Moderate, color: "#f59e0b" },
      { label: "High", value: whtrCounts.High, color: "#ef4444" },
      { label: "Unknown", value: whtrCounts.Unknown, color: "#94a3b8" },
    ];

    if (!total) {
      qs("#whtrBars").innerHTML = `<div class="text-muted">No data yet.</div>`;
    } else {
      qs("#whtrBars").innerHTML = bars
        .map((b) => {
          const pct = total ? Math.round((b.value / total) * 100) : 0;
          return `
            <div class="bar-row">
              <div class="mono" style="width:90px; font-weight:800;">${b.label}</div>
              <div class="bar"><div style="width:${pct}%; background:${b.color};"></div></div>
              <div class="mono" style="width:70px; text-align:right; font-weight:800;">${b.value} (${pct}%)</div>
            </div>
          `;
        })
        .join("");
    }
  } catch (e) {
    console.error("Charts error:", e);
    qs("#bmiDonut").textContent = "Failed to load chart.";
    qs("#whtrBars").textContent = "Failed to load chart.";
  }

  // Recent + Last activity
  try {
    const { measurements, files } = await fetchRecent();

    const lastM = measurements?.[0]?.taken_at ?? null;
    const lastF = files?.[0]?.created_at ?? null;
    const last =
      [lastM, lastF]
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a))[0] ?? null;

    qs("#kLast").textContent = last ? fmtDt(last) : "—";

    const mT = qs("#recentM");
    if (!measurements.length) {
      mT.innerHTML = `<tr><td colspan="4" class="text-muted">No measurements yet.</td></tr>`;
    } else {
      mT.innerHTML = measurements
        .map((m) => {
          const name = m?.patients?.full_name ?? "—";
          const bmi = bmiFrom(m.weight_kg, m.height_cm);
          return `
            <tr>
              <td class="text-muted">${fmtDt(m.taken_at)}</td>
              <td>${name}</td>
              <td class="mono">${m.weight_kg ?? "—"} / ${m.height_cm ?? "—"} / ${m.waist_cm ?? "—"}</td>
              <td class="mono">${bmi != null ? fmtNum(bmi, 2) : "—"}</td>
            </tr>
          `;
        })
        .join("");
    }

    const fT = qs("#recentF");
    if (!files.length) {
      fT.innerHTML = `<tr><td colspan="4" class="text-muted">No uploads yet.</td></tr>`;
    } else {
      fT.innerHTML = files
        .map((f) => {
          const name = f?.patients?.full_name ?? "—";
          return `
            <tr>
              <td class="text-muted">${fmtDt(f.created_at)}</td>
              <td>${name}</td>
              <td>${f.original_name ?? "—"}</td>
              <td class="mono">${f.mime_type ?? "—"}</td>
            </tr>
          `;
        })
        .join("");
    }
  } catch (e) {
    console.error("Recent error:", e);
    qs("#recentM").innerHTML = `<tr><td colspan="4" class="text-muted">Failed to load.</td></tr>`;
    qs("#recentF").innerHTML = `<tr><td colspan="4" class="text-muted">Failed to load.</td></tr>`;
  }

  // Smart Open Details button (latest patient if exists)
  try {
    const btn = document.getElementById("btnOpenDetails");
    if (btn) {
      const latestId = await getLatestPatientId();
      if (latestId) {
        btn.href = `/patient-details.html?id=${encodeURIComponent(latestId)}`;
        btn.innerHTML = `<i class="bi bi-box-arrow-up-right me-2"></i>Open latest patient`;
      } else {
        btn.href = "/patients.html";
        btn.innerHTML = `<i class="bi bi-search me-2"></i>Find patient`;
      }
    }
  } catch (e) {
    console.error("Latest patient button error:", e);
  }
}