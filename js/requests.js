/* ================= MODULE DEMANDES D'ANALYSES ================= */

const REQUEST_STATUSES = ["Demandée","Prélèvement effectué","En cours","Résultat disponible","À valider","Validée","Imprimée"];

let _requestsCache = [];
let _reqFilter = "all";

async function view_requests(){
  const [requests, patients, analyses] = await Promise.all([
    DB.list("analysisRequests"), DB.list("patients"), DB.list("analyses")
  ]);
  _requestsCache = requests.slice().reverse();
  window._patientsForReq = patients;
  window._analysesForReq = analyses;

  document.getElementById("content").innerHTML = `
    <div class="card">
      <div class="card-head">
        <h3>Demandes d'analyses</h3>
        ${can('requests.create') ? `<button class="btn btn-primary" onclick="openRequestForm()">+ Nouvelle demande</button>` : ""}
      </div>
      <div class="toolbar-row" style="margin-bottom:14px;">
        <select onchange="_reqFilter=this.value; renderRequestsTable();">
          <option value="all">Tous les statuts</option>
          ${REQUEST_STATUSES.map(s=>`<option value="${s}">${s}</option>`).join("")}
        </select>
      </div>
      <div id="reqTableWrap"></div>
    </div>`;
  renderRequestsTable();
}

function renderRequestsTable(){
  const rows = _reqFilter==="all" ? _requestsCache : _requestsCache.filter(r=>r.statut===_reqFilter);
  document.getElementById("reqTableWrap").innerHTML = `
    <table class="tbl"><thead><tr><th>Patient</th><th>Médecin</th><th>Analyses</th><th>Urgence</th><th>Statut</th><th>Date</th><th></th></tr></thead>
    <tbody>${rows.map(r=>`
      <tr>
        <td>${esc(r.patientNom)}</td><td>${esc(r.medecin)||'—'}</td>
        <td>${(r.analyseIds||[]).map(id=>(window._analysesForReq.find(a=>a.id===id)||{}).code||id).join(', ')}</td>
        <td>${r.urgence ? '<span class="badge bad">Urgent</span>' : '—'}</td>
        <td>${statusBadgeReq(r.statut)}</td>
        <td>${fmtDateShort(r.date)}</td>
        <td style="text-align:right; white-space:nowrap;">
          ${can('requests.edit') ? renderRequestActions(r) : ""}
        </td>
      </tr>`).join("") || `<tr><td colspan="7" class="empty-state">Aucune demande.</td></tr>`}
    </tbody></table>`;
}

function statusBadgeReq(s){
  const cls = s==="Validée"||s==="Imprimée" ? "ok" : s==="Demandée" ? "gray" : "warn";
  return `<span class="badge ${cls}">${s}</span>`;
}

function renderRequestActions(r){
  const idx = REQUEST_STATUSES.indexOf(r.statut);
  const next = REQUEST_STATUSES[idx+1];
  let btn = "";
  if(next && next!=="Résultat disponible" && next!=="Validée"){
    btn = `<button class="btn btn-sm" onclick="advanceRequest('${r.id}')">→ ${next}</button>`;
  }
  return `${btn} <button class="btn btn-sm" onclick="location.hash='results'">Voir dans Résultats</button>`;
}

async function advanceRequest(id){
  const r = _requestsCache.find(x=>x.id===id);
  const idx = REQUEST_STATUSES.indexOf(r.statut);
  const next = REQUEST_STATUSES[idx+1];
  if(!next) return;
  await DB.update("analysisRequests", id, { statut: next });
  logActivity("Mise à jour", "Analyses", `Demande ${id} → ${next}`);
  showToast("Statut mis à jour : " + next);
  view_requests();
}

function openRequestForm(){
  if(!requirePerm('requests.create')) return;
  const patients = window._patientsForReq || [];
  const analyses = window._analysesForReq || [];
  openModal("Nouvelle demande d'analyses", `
    <div class="field"><label>Patient *</label>
      <select id="rf_patient">${patients.map(p=>`<option value="${p.id}">${esc(p.nom)} ${esc(p.prenom)} — ${p.dossier}</option>`).join("")}</select>
    </div>
    <div class="field"><label>Médecin prescripteur</label><input id="rf_medecin"></div>
    <div class="field"><label>Analyses demandées *</label>
      <div class="check-row" style="border:1px solid var(--line); border-radius:8px; padding:10px;">
        ${analyses.map(a=>`<label><input type="checkbox" value="${a.id}" class="rf-analyse"> ${esc(a.code)} — ${esc(a.label)}</label>`).join("")}
      </div>
    </div>
    <div class="grid2">
      <div class="field"><label><input type="checkbox" id="rf_urgence"> Urgent</label></div>
    </div>
    <div class="field"><label>Observations</label><textarea id="rf_obs" rows="2"></textarea></div>
  `, `<button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveRequest()">Créer la demande</button>`, true);
}

async function saveRequest(){
  const patientId = document.getElementById("rf_patient").value;
  const patients = window._patientsForReq || [];
  const p = patients.find(x=>x.id===patientId);
  const analyseIds = Array.from(document.querySelectorAll(".rf-analyse:checked")).map(c=>c.value);
  if(!patientId || !analyseIds.length){ showToast("Sélectionnez un patient et au moins une analyse.", "bad"); return; }
  const data = {
    patientId, patientNom: `${p.nom} ${p.prenom}`,
    medecin: document.getElementById("rf_medecin").value.trim(),
    analyseIds, urgence: document.getElementById("rf_urgence").checked,
    observations: document.getElementById("rf_obs").value.trim(),
    statut: "Demandée", date: new Date().toISOString()
  };
  await DB.add("analysisRequests", data);
  logActivity("Création", "Analyses", `Nouvelle demande pour ${data.patientNom}`);
  pushNotification("Nouvelle demande d'analyses", `${data.patientNom} — ${analyseIds.length} analyse(s).`, "info");
  showToast("Demande créée.");
  closeModal();
  view_requests();
}
