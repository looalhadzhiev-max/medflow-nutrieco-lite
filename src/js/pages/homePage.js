import { supabase } from "../supabaseClient.js";
import { getCurrentProfile } from "../../lib/profile.js";

function injectLocalStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .landing{
      padding: 18px 0 40px;
    }

    /* Full hero */
    .hero-wrap{
      border-radius: 26px;
      border: 1px solid rgba(15,23,42,.08);
      box-shadow: 0 18px 44px rgba(2,6,23,.10);
      background:
        radial-gradient(900px 520px at 18% 0%, rgba(37,99,235,.22), transparent 60%),
        radial-gradient(860px 520px at 85% 10%, rgba(34,197,94,.18), transparent 60%),
        radial-gradient(760px 520px at 50% 120%, rgba(168,85,247,.10), transparent 60%),
        linear-gradient(180deg, rgba(255,255,255,.92), rgba(255,255,255,.80));
      backdrop-filter: blur(10px);
      overflow: hidden;
    }
    .hero-inner{
      padding: 34px 28px;
      display:grid;
      grid-template-columns: 1.35fr 0.65fr;
      gap: 22px;
      align-items:center;
    }
    @media (max-width: 992px){
      .hero-inner{grid-template-columns:1fr; padding: 26px 18px;}
    }

    .brand-pill{
      display:inline-flex; align-items:center; gap:8px;
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(15,23,42,.10);
      background: rgba(255,255,255,.78);
      font-weight: 900;
      font-size: 13px;
      color:#0f172a;
      width: fit-content;
    }
    .status-pill{
      display:inline-flex; align-items:center; gap:8px;
      padding: 7px 12px;
      border-radius: 999px;
      border: 1px solid rgba(15,23,42,.10);
      background: rgba(255,255,255,.78);
      font-weight: 900;
      font-size: 12px;
      color:#334155;
      white-space:nowrap;
    }

    .hero-title{
      font-weight: 950;
      letter-spacing:-.035em;
      line-height: 1.05;
      margin: 14px 0 10px;
      font-size: clamp(36px, 4.6vw, 58px);
    }
    .hero-sub{
      color:#475569;
      font-weight: 650;
      font-size: 16px;
      line-height: 1.45;
      max-width: 62ch;
    }
    .hero-cta{
      display:flex; flex-wrap:wrap; gap:10px;
      margin-top: 18px;
    }

    /* Right hero card */
    .hero-card{
      border-radius: 18px;
      border: 1px solid rgba(15,23,42,.10);
      background: rgba(255,255,255,.70);
      padding: 16px;
    }
    .hero-card .k{
      color:#64748b;
      font-weight:900;
      font-size:12px;
      text-transform:uppercase;
      letter-spacing:.08em;
    }
    .hero-card .v{
      font-weight:950;
      font-size:16px;
      margin-top:4px;
    }
    .hero-card .mini{
      display:flex; align-items:center; justify-content:space-between;
      gap:12px;
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid rgba(15,23,42,.08);
      background: rgba(255,255,255,.75);
      text-decoration:none;
      color:#0f172a;
      font-weight: 900;
      margin-top: 10px;
      transition: transform .08s ease, box-shadow .08s ease, border-color .08s ease;
    }
    .hero-card .mini:hover{
      transform: translateY(-1px);
      box-shadow: 0 10px 20px rgba(2,6,23,.08);
      border-color: rgba(37,99,235,.22);
    }

    /* Below section */
    .section{
      margin-top: 18px;
      padding: 18px 0 0;
    }
    .section-title{
      font-weight: 950;
      letter-spacing:-.02em;
      margin: 0 0 10px;
      font-size: 18px;
      color:#0f172a;
    }
    .feature-grid{
      display:grid;
      grid-template-columns: repeat(3, minmax(0,1fr));
      gap: 12px;
    }
    @media (max-width: 992px){
      .feature-grid{grid-template-columns:1fr;}
    }
    .feature{
      border-radius: 18px;
      border: 1px solid rgba(15,23,42,.08);
      background: rgba(255,255,255,.92);
      box-shadow: 0 10px 22px rgba(2,6,23,.06);
      padding: 14px;
      display:flex;
      gap: 12px;
      align-items:flex-start;
    }
    .feature i{font-size:18px; margin-top:2px;}
    .feature .t{font-weight:950;}
    .feature .d{color:#64748b; font-weight:650; font-size:13px; margin-top:2px; line-height:1.35;}
  `;
  document.head.appendChild(style);
}

async function getRoleSafe() {
  const { data } = await supabase.auth.getSession();
  if (!data?.session) return { authed: false, role: null };

  let p = getCurrentProfile();
  if (!p) {
    await new Promise((resolve) => window.addEventListener("profile:ready", resolve, { once: true }));
    p = getCurrentProfile();
  }
  return { authed: true, role: p?.role ?? "user" };
}

function hideDefaultPageTitleIfAny() {
  // твоят layout явно рендерира "Home" като h1 някъде.
  // Скриваме го само за index.html.
  const h1s = Array.from(document.querySelectorAll("h1"));
  for (const h of h1s) {
    if ((h.textContent || "").trim().toLowerCase() === "home") {
      h.style.display = "none";
    }
  }
}

export async function initHomePage() {
  const content = document.getElementById("content");
  if (!content) return;

  injectLocalStyles();
  hideDefaultPageTitleIfAny();

  const { authed, role } = await getRoleSafe();
  const isAdmin = role === "admin";

  const statusPill = authed
    ? `<span class="status-pill"><i class="bi bi-shield-check"></i> Signed in • ${role}</span>`
    : `<span class="status-pill"><i class="bi bi-shield"></i> Guest mode</span>`;

  const primaryCta = authed
    ? `<a class="btn btn-primary" href="/dashboard.html"><i class="bi bi-speedometer2 me-2"></i>Open Dashboard</a>`
    : `<a class="btn btn-primary" href="/login.html"><i class="bi bi-box-arrow-in-right me-2"></i>Login</a>`;

  const secondaryCta = authed
    ? `<a class="btn btn-outline-primary" href="/patients.html"><i class="bi bi-people me-2"></i>Patients</a>`
    : `<a class="btn btn-outline-primary" href="/register.html"><i class="bi bi-person-plus me-2"></i>Create account</a>`;

  const adminCta = authed && isAdmin
    ? `<a class="btn btn-outline-secondary" href="/admin.html"><i class="bi bi-gear me-2"></i>Admin</a>`
    : ``;

  const rightCardTitle = authed ? "Quick actions" : "Why sign in?";
  const rightCardValue = authed ? "Jump back in" : "Unlock features";

  const quickLinks = authed
    ? `
      <a class="mini" href="/patients.html">
        <span><i class="bi bi-people me-2"></i>Open Patients</span>
        <i class="bi bi-chevron-right"></i>
      </a>
      <a class="mini" href="/dashboard.html">
        <span><i class="bi bi-graph-up me-2"></i>View KPIs</span>
        <i class="bi bi-chevron-right"></i>
      </a>
      ${isAdmin ? `
        <a class="mini" href="/admin.html">
          <span><i class="bi bi-gear me-2"></i>Admin Console</span>
          <i class="bi bi-chevron-right"></i>
        </a>` : ``}
    `
    : `
      <div class="k">Security</div>
      <div class="v">RLS + ownership access</div>
      <div class="k" style="margin-top:10px;">Productivity</div>
      <div class="v">Dashboard + patient records</div>
      <div class="k" style="margin-top:10px;">Documents</div>
      <div class="v">Uploads + preview</div>
    `;

  content.innerHTML = `
    <div class="container landing">
      <div class="hero-wrap">
        <div class="hero-inner">
          <div>
            <div class="d-flex align-items-center gap-2 mb-3">
                <img src="/src/brand-logo.svg" alt="MedFlow" style="height:42px; width:auto;" />
            </div>
            <div class="hero-title">Nutrition workflow,<br/> simplified.</div>
            <div class="hero-sub">
              Patient management, measurements, indices (BMI/WHtR) and secure lab document storage —
              built with role-based access.
            </div>

            <div class="hero-cta">
              ${primaryCta}
              ${secondaryCta}
              ${adminCta}
            </div>
          </div>

          <div class="hero-card">
            <div class="k">${rightCardTitle}</div>
            <div class="v">${rightCardValue}</div>
            ${quickLinks}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Highlights</div>

        <div class="feature-grid">
          <div class="feature">
            <i class="bi bi-people"></i>
            <div>
              <div class="t">Patients</div>
              <div class="d">Create patients, assign ownership and keep structured contact info.</div>
            </div>
          </div>

          <div class="feature">
            <i class="bi bi-graph-up-arrow"></i>
            <div>
              <div class="t">Indices</div>
              <div class="d">BMI + WHtR computed automatically from latest measurements.</div>
            </div>
          </div>

          <div class="feature">
            <i class="bi bi-paperclip"></i>
            <div>
              <div class="t">Lab documents</div>
              <div class="d">Upload PDFs/images per patient with preview & download.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}