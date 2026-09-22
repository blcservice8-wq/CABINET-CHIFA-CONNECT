/* ================= JOURNAL D'ACTIVITÉ ================= */

async function view_logs(){
  if(!requirePerm('activity_logs.view')) return;
  const logs = (await DB.list("activityLogs")).slice().reverse();
  const notifications = (await DB.list("notifications")).slice().reverse();
  await Promise.all(notifications.filter(n=>!n.read).map(n=>DB.update("notifications", n.id, {read:true})));
  refreshNotifDot();

  document.getElementById("content").innerHTML = `
    <div class="card">
      <div class="card-head"><h3>Notifications</h3></div>
      <table class="tbl"><thead><tr><th>Titre</th><th>Message</th><th>Date</th></tr></thead>
      <tbody>${notifications.map(n=>`
        <tr><td>${esc(n.title)}</td><td>${esc(n.body)}</td><td>${fmtDate(n.date)}</td></tr>
      `).join("") || `<tr><td colspan="3" class="empty-state">Aucune notification.</td></tr>`}</tbody></table>
    </div>
    <div class="card">
      <div class="card-head"><h3>Journal d'activité</h3></div>
      <table class="tbl"><thead><tr><th>Utilisateur</th><th>Action</th><th>Module</th><th>Description</th><th>Date</th></tr></thead>
      <tbody>${logs.map(l=>`
        <tr><td>${esc(l.userName)}</td><td>${esc(l.action)}</td><td>${esc(l.module)}</td><td>${esc(l.description)}</td><td>${fmtDate(l.date)}</td></tr>
      `).join("") || `<tr><td colspan="5" class="empty-state">Aucune activité.</td></tr>`}</tbody></table>
    </div>`;
}

/* ================= RAPPORTS ================= */
async function view_reports(){
  if(!requirePerm('reports.view')) return;
  const [invoices, requests, patients] = await Promise.all([
    DB.list("invoices"), DB.list("analysisRequests"), DB.list("patients")
  ]);
  const ca = invoices.reduce((s,i)=>s+i.montantPaye,0);
  const parStatut = {};
  requests.forEach(r=>parStatut[r.statut]=(parStatut[r.statut]||0)+1);

  document.getElementById("content").innerHTML = `
    <div class="grid-stats">
      <div class="kpi"><div class="kpi-val">${patients.length}</div><div class="kpi-lbl">Patients totaux</div></div>
      <div class="kpi"><div class="kpi-val">${requests.length}</div><div class="kpi-lbl">Demandes d'analyses</div></div>
      <div class="kpi"><div class="kpi-val">${fmtMoney(ca)}</div><div class="kpi-lbl">Chiffre d'affaires encaissé</div></div>
      <div class="kpi"><div class="kpi-val">${invoices.filter(i=>i.statut==='Impayée').length}</div><div class="kpi-lbl">Factures impayées</div></div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Analyses par statut</h3></div>
      <table class="tbl"><thead><tr><th>Statut</th><th>Nombre</th></tr></thead>
      <tbody>${Object.entries(parStatut).map(([s,n])=>`<tr><td>${statusBadgeReq(s)}</td><td>${n}</td></tr>`).join("") || `<tr><td colspan="2" class="empty-state">Aucune donnée.</td></tr>`}</tbody></table>
    </div>`;
}
