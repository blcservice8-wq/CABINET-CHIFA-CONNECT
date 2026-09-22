/* ======================================================================
   APPLICATION — routeur, sidebar, topbar, dashboard, utilitaires UI
   ====================================================================== */

let SESSION = null;

const ROUTES = [
  { hash:"dashboard", label:"Tableau de bord", ico:"◆", perm:"dashboard.view" },
  { hash:"patients", label:"Patients", ico:"👤", perm:"patients.view" },
  { hash:"analyses", label:"Catalogue analyses", ico:"🧪", perm:"analyses.view" },
  { hash:"requests", label:"Demandes d'analyses", ico:"📋", perm:"requests.view" },
  { hash:"results", label:"Résultats & Bulletins", ico:"📄", perm:"bulletins.view" },
  { hash:"billing", label:"Facturation", ico:"🧾", perm:"billing.view" },
  { hash:"payments", label:"Paiements", ico:"💳", perm:"payments.view" },
  { hash:"reports", label:"Rapports", ico:"📊", perm:"reports.view" },
  { hash:"users", label:"Utilisateurs", ico:"👥", perm:"users.view" },
  { hash:"logs", label:"Journal d'activité", ico:"🕘", perm:"activity_logs.view" },
  { hash:"settings", label:"Paramètres", ico:"⚙️", perm:"settings.view" }
];

/* ---------------- Boot ---------------- */
function bootApp(){
  SESSION = Auth.requireAuth();
  if(!SESSION) return;
  renderSidebar();
  renderTopbar();
  window.addEventListener("hashchange", route);
  route();
}

function renderSidebar(){
  const el = document.getElementById("sidebar");
  const items = ROUTES.filter(r => can(r.perm));
  el.innerHTML = `
    <div class="brand"><span class="logo-dot">⚕</span> MEDICAL LAB SaaS</div>
    <nav>${items.map(r => `
      <div class="nav-item" data-hash="${r.hash}" onclick="location.hash='${r.hash}'">
        <span class="ico">${r.ico}</span><span>${r.label}</span>
      </div>`).join("")}
    </nav>
    <div class="user-box">
      <div class="uname">${SESSION.name}</div>
      <div class="urole">${ROLE_LABELS[SESSION.role]}</div>
      <button class="logout" onclick="Auth.logout()">↩ Déconnexion</button>
    </div>`;
}

function renderTopbar(){
  const el = document.getElementById("topbar");
  el.innerHTML = `
    <button class="menu-btn" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button>
    <div class="search">
      <span class="ic">🔎</span>
      <input id="globalSearch" placeholder="Rechercher patient, dossier, facture, bulletin…" oninput="onGlobalSearch(this.value)">
      <div id="searchResults"></div>
    </div>
    <div class="spacer"></div>
    <div class="tb-date">${new Date().toLocaleDateString('fr-FR',{weekday:'long', day:'numeric', month:'long', year:'numeric'})}</div>
    <div class="tb-item" onclick="location.hash='#logs'" title="Notifications">🔔<span class="badge-dot" id="notifDot"></span></div>
  `;
  refreshNotifDot();
}

async function refreshNotifDot(){
  const list = await DB.list("notifications", n => !n.read);
  const dot = document.getElementById("notifDot");
  if(dot) dot.style.display = list.length ? "block" : "none";
}

async function onGlobalSearch(q){
  const box = document.getElementById("searchResults");
  if(!q || q.length<2){ box.innerHTML=""; box.style.display="none"; return; }
  const ql = q.toLowerCase();
  const [patients, invoices, requests] = await Promise.all([
    DB.list("patients"), DB.list("invoices"), DB.list("analysisRequests")
  ]);
  const rows = [];
  patients.filter(p => `${p.nom} ${p.prenom} ${p.dossier}`.toLowerCase().includes(ql)).slice(0,4)
    .forEach(p => rows.push({label:`${p.nom} ${p.prenom} — ${p.dossier}`, sub:"Patient", go:`patients`}));
  invoices.filter(i => `${i.numero} ${i.patientNom}`.toLowerCase().includes(ql)).slice(0,4)
    .forEach(i => rows.push({label:`${i.numero} — ${i.patientNom}`, sub:"Facture", go:`billing`}));
  requests.filter(r => `${r.patientNom}`.toLowerCase().includes(ql)).slice(0,4)
    .forEach(r => rows.push({label:`Demande — ${r.patientNom}`, sub:"Analyse", go:`requests`}));
  box.style.display = rows.length ? "block" : "none";
  box.innerHTML = rows.map(r => `<div class="sr-item" onclick="location.hash='${r.go}'; document.getElementById('searchResults').style.display='none';">
      <b>${r.label}</b><span>${r.sub}</span></div>`).join("") ||
      `<div class="sr-item"><span>Aucun résultat</span></div>`;
}

/* ---------------- Router ---------------- */
function route(){
  const hash = (location.hash || "#dashboard").replace("#","");
  document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.hash===hash));
  const routeDef = ROUTES.find(r => r.hash===hash);
  if(routeDef && !can(routeDef.perm)){
    document.getElementById("content").innerHTML = `<div class="empty-state">Accès non autorisé pour votre rôle.</div>`;
    return;
  }
  const fn = window["view_" + hash] || view_notfound;
  fn();
  document.getElementById("sidebar").classList.remove("open");
}

function view_notfound(){
  document.getElementById("content").innerHTML = `<div class="empty-state">Page introuvable.</div>`;
}

/* ================= DASHBOARD ================= */
async function view_dashboard(){
  const role = SESSION.role;
  const [patients, requests, results, invoices, payments, users] = await Promise.all([
    DB.list("patients"), DB.list("analysisRequests"), DB.list("results"),
    DB.list("invoices"), DB.list("payments"), DB.list("users")
  ]);
  const today = new Date().toDateString();
  const isToday = d => new Date(d).toDateString()===today;

  let kpis = [];
  if(role==="admin"){
    const ca = invoices.reduce((s,i)=>s+i.montantPaye,0);
    kpis = [
      ["Patients", patients.length, "👤"],
      ["Patients du jour", patients.filter(p=>isToday(p.createdAt)).length, "🆕"],
      ["Analyses en attente", requests.filter(r=>!["Validée","Imprimée"].includes(r.statut)).length, "⏳"],
      ["Résultats à valider", results.filter(r=>!r.valide).length, "🔬"],
      ["Chiffre d'affaires", fmtMoney(ca), "💰"],
      ["Factures impayées", invoices.filter(i=>i.statut==="Impayée").length, "🧾"],
      ["Paiements du jour", payments.filter(p=>isToday(p.date)).length, "💳"],
      ["Utilisateurs", users.length, "👥"]
    ];
  } else if(role==="laboratoire"){
    kpis = [
      ["Prélèvements du jour", requests.filter(r=>isToday(r.date)).length, "🩸"],
      ["Analyses en attente", requests.filter(r=>r.statut==="Demandée").length, "⏳"],
      ["Analyses en cours", requests.filter(r=>r.statut==="En cours").length, "🧪"],
      ["Résultats à saisir", requests.filter(r=>r.statut==="Prélèvement effectué").length, "📝"],
      ["Résultats à valider", results.filter(r=>!r.valide).length, "✅"],
      ["Bulletins récents", requests.filter(r=>r.statut==="Imprimée").length, "📄"]
    ];
  } else {
    const caJour = payments.filter(p=>isToday(p.date)).reduce((s,p)=>s+p.montant,0);
    const caMois = payments.reduce((s,p)=>s+p.montant,0);
    kpis = [
      ["Factures du jour", invoices.filter(i=>isToday(i.date)).length, "🧾"],
      ["Montant encaissé", fmtMoney(caJour), "💵"],
      ["Factures impayées", invoices.filter(i=>i.statut==="Impayée").length, "⚠️"],
      ["Paiements récents", payments.length, "💳"],
      ["CA journalier", fmtMoney(caJour), "📈"],
      ["CA mensuel", fmtMoney(caMois), "📊"]
    ];
  }

  const recentLogs = (await DB.list("activityLogs")).slice(-6).reverse();

  document.getElementById("content").innerHTML = `
    <h2>Bonjour, ${SESSION.name.split(' ')[0]} 👋</h2>
    <p style="color:var(--sub); margin-bottom:18px;">${ROLE_LABELS[role]} — voici votre activité.</p>
    <div class="grid-stats">
      ${kpis.map(([lbl,val,ico])=>`
        <div class="kpi"><div class="kpi-top"><div class="kpi-ico">${ico}</div></div>
          <div class="kpi-val">${val}</div><div class="kpi-lbl">${lbl}</div></div>`).join("")}
    </div>
    <div class="card">
      <div class="card-head"><h3>Activité récente</h3></div>
      <table class="tbl"><thead><tr><th>Utilisateur</th><th>Action</th><th>Module</th><th>Description</th><th>Date</th></tr></thead>
      <tbody>${recentLogs.map(l=>`<tr><td>${l.userName}</td><td>${l.action}</td><td>${l.module}</td><td>${l.description}</td><td>${fmtDate(l.date)}</td></tr>`).join("") ||
        `<tr><td colspan="5" class="empty-state">Aucune activité récente.</td></tr>`}</tbody></table>
    </div>`;
}

/* ================= UI HELPERS ================= */
function fmtMoney(n){ return Number(n||0).toLocaleString('fr-FR') + " FCFA"; }
function fmtDate(d){ return d ? new Date(d).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : "—"; }
function fmtDateShort(d){ return d ? new Date(d).toLocaleDateString('fr-FR') : "—"; }

function showToast(msg, type){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.background = type==="bad" ? "var(--bad)" : type==="ok" ? "var(--ok)" : "#16232f";
  t.style.display = "block";
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.style.display="none", 2600);
}

function openModal(title, bodyHtml, footHtml, wide){
  const overlay = document.getElementById("modalOverlay");
  overlay.innerHTML = `
    <div class="modal ${wide?'wide':''}">
      <div class="modal-head"><h3>${title}</h3><button onclick="closeModal()">✕</button></div>
      <div class="modal-body">${bodyHtml}</div>
      ${footHtml ? `<div class="modal-foot">${footHtml}</div>` : ""}
    </div>`;
  overlay.classList.add("open");
}
function closeModal(){ document.getElementById("modalOverlay").classList.remove("open"); }

let _pendingConfirm = null;
function confirmDialog(msg, onYes){
  _pendingConfirm = onYes;
  openModal("Confirmation", `<div class="confirm-box"><p>${msg}</p></div>`,
    `<button class="btn" onclick="closeModal()">Annuler</button>
     <button class="btn btn-danger" onclick="runConfirm()">Confirmer</button>`);
}
function runConfirm(){
  closeModal();
  if(typeof _pendingConfirm === "function") _pendingConfirm();
  _pendingConfirm = null;
}

function esc(s){ return (s==null?"":String(s)).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
