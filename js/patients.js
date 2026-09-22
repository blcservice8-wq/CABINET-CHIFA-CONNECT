/* ================= MODULE PATIENTS ================= */

let _patientsCache = [];
let _patientFilter = "all";
let _patientQuery = "";

async function view_patients(){
  _patientsCache = await DB.list("patients");
  document.getElementById("content").innerHTML = `
    <div class="card">
      <div class="card-head">
        <h3>Patients</h3>
        ${can('patients.create') ? `<button class="btn btn-primary" onclick="openPatientForm()">+ Nouveau patient</button>` : ""}
      </div>
      <div class="toolbar-row" style="margin-bottom:14px;">
        <input id="patSearch" placeholder="Rechercher nom, dossier, téléphone…" oninput="_patientQuery=this.value; renderPatientsTable();">
        <select onchange="_patientFilter=this.value; renderPatientsTable();">
          <option value="all">Tous</option>
          <option value="today">Aujourd'hui</option>
          <option value="active">Actifs</option>
          <option value="archived">Archivés</option>
        </select>
      </div>
      <div id="patTableWrap"></div>
    </div>`;
  renderPatientsTable();
}

function renderPatientsTable(){
  const q = _patientQuery.toLowerCase();
  const today = new Date().toDateString();
  let rows = _patientsCache.filter(p => `${p.nom} ${p.prenom} ${p.dossier} ${p.telephone}`.toLowerCase().includes(q));
  if(_patientFilter==="today") rows = rows.filter(p=>new Date(p.createdAt).toDateString()===today);
  if(_patientFilter==="active") rows = rows.filter(p=>p.statut==="Actif");
  if(_patientFilter==="archived") rows = rows.filter(p=>p.statut==="Archivé");

  document.getElementById("patTableWrap").innerHTML = `
    <table class="tbl"><thead><tr>
      <th>N° dossier</th><th>Nom</th><th>Prénom</th><th>Sexe</th><th>Naissance</th><th>Téléphone</th><th>Statut</th><th></th>
    </tr></thead><tbody>
      ${rows.map(p=>`
        <tr>
          <td>${esc(p.dossier)}</td><td>${esc(p.nom)}</td><td>${esc(p.prenom)}</td><td>${p.sexe}</td>
          <td>${fmtDateShort(p.dateNaissance)}</td><td>${esc(p.telephone)}</td>
          <td><span class="badge ${p.statut==='Actif'?'ok':'gray'}">${p.statut}</span></td>
          <td style="text-align:right; white-space:nowrap;">
            <button class="btn btn-sm" onclick="openPatientFiche('${p.id}')">Ouvrir</button>
            ${can('patients.edit') ? `<button class="btn btn-sm" onclick="openPatientForm('${p.id}')">Modifier</button>` : ""}
            ${can('patients.delete') ? `<button class="btn btn-sm btn-danger" onclick="archivePatient('${p.id}')">Archiver</button>` : ""}
          </td>
        </tr>`).join("") || `<tr><td colspan="8" class="empty-state">Aucun patient trouvé.</td></tr>`}
    </tbody></table>`;
}

function openPatientForm(id){
  if(!requirePerm(id ? 'patients.edit' : 'patients.create')) return;
  const p = id ? _patientsCache.find(x=>x.id===id) : {};
  openModal(id ? "Modifier le patient" : "Nouveau patient", `
    <div class="grid2">
      <div class="field"><label>Nom *</label><input id="pf_nom" value="${esc(p.nom)}"></div>
      <div class="field"><label>Prénom *</label><input id="pf_prenom" value="${esc(p.prenom)}"></div>
      <div class="field"><label>Sexe *</label><select id="pf_sexe">
        <option value="M" ${p.sexe==='M'?'selected':''}>Masculin</option>
        <option value="F" ${p.sexe==='F'?'selected':''}>Féminin</option></select></div>
      <div class="field"><label>Date de naissance *</label><input id="pf_dn" type="date" value="${p.dateNaissance||''}"></div>
      <div class="field"><label>Téléphone</label><input id="pf_tel" value="${esc(p.telephone)}"></div>
      <div class="field"><label>Email</label><input id="pf_email" value="${esc(p.email)}"></div>
      <div class="field"><label>Profession</label><input id="pf_prof" value="${esc(p.profession)}"></div>
      <div class="field"><label>Personne à contacter</label><input id="pf_contact" value="${esc(p.contact)}"></div>
    </div>
    <div class="field"><label>Adresse</label><input id="pf_adr" value="${esc(p.adresse)}"></div>
  `, `<button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="savePatient('${id||''}')">Enregistrer</button>`);
}

async function savePatient(id){
  const nom = document.getElementById("pf_nom").value.trim();
  const prenom = document.getElementById("pf_prenom").value.trim();
  const dn = document.getElementById("pf_dn").value;
  if(!nom || !prenom || !dn){ showToast("Nom, prénom et date de naissance sont requis.", "bad"); return; }
  const data = {
    nom, prenom, sexe: document.getElementById("pf_sexe").value,
    dateNaissance: dn, telephone: document.getElementById("pf_tel").value.trim(),
    email: document.getElementById("pf_email").value.trim(),
    profession: document.getElementById("pf_prof").value.trim(),
    contact: document.getElementById("pf_contact").value.trim(),
    adresse: document.getElementById("pf_adr").value.trim(),
    statut: "Actif"
  };
  if(id){
    await DB.update("patients", id, data);
    logActivity("Modification", "Patients", `Modification du patient ${data.nom} ${data.prenom}`);
    showToast("Patient mis à jour.");
  } else {
    const count = (await DB.list("patients")).length;
    data.dossier = "P-" + String(1000+count);
    const newId = await DB.add("patients", data);
    logActivity("Création", "Patients", `Création du patient ${data.dossier}`);
    pushNotification("Nouveau patient", `${data.nom} ${data.prenom} a été enregistré(e).`, "info");
    showToast("Patient créé.");
  }
  closeModal();
  view_patients();
}

function archivePatient(id){
  confirmDialog("Archiver ce patient ? Il n'apparaîtra plus dans la liste active.", async ()=>{
    await DB.update("patients", id, { statut:"Archivé" });
    logActivity("Archivage", "Patients", `Patient ${id} archivé`);
    showToast("Patient archivé.");
    view_patients();
  });
}

async function openPatientFiche(id){
  const p = await DB.get("patients", id);
  if(!p) return;
  const [requests, invoices] = await Promise.all([
    DB.list("analysisRequests", r=>r.patientId===id),
    DB.list("invoices", i=>i.patientId===id)
  ]);
  openModal(`${p.nom} ${p.prenom} — ${p.dossier}`, `
    <div class="tabbar">
      <button class="active" onclick="switchFicheTab(event,'info')">Informations</button>
      <button onclick="switchFicheTab(event,'hist')">Historique</button>
    </div>
    <div id="fiche_info">
      <div class="grid2">
        <div class="field"><label>Sexe</label><div>${p.sexe==='M'?'Masculin':'Féminin'}</div></div>
        <div class="field"><label>Date de naissance</label><div>${fmtDateShort(p.dateNaissance)}</div></div>
        <div class="field"><label>Téléphone</label><div>${esc(p.telephone)||'—'}</div></div>
        <div class="field"><label>Email</label><div>${esc(p.email)||'—'}</div></div>
        <div class="field"><label>Profession</label><div>${esc(p.profession)||'—'}</div></div>
        <div class="field"><label>Contact</label><div>${esc(p.contact)||'—'}</div></div>
      </div>
      <div class="field"><label>Adresse</label><div>${esc(p.adresse)||'—'}</div></div>
    </div>
    <div id="fiche_hist" class="hidden">
      <b style="font-size:12.5px;">Demandes d'analyses</b>
      <table class="tbl" style="margin:8px 0 16px;"><thead><tr><th>Date</th><th>Statut</th></tr></thead>
      <tbody>${requests.map(r=>`<tr><td>${fmtDateShort(r.date)}</td><td><span class="badge gray">${r.statut}</span></td></tr>`).join("") || `<tr><td colspan="2" class="empty-state">Aucune demande.</td></tr>`}</tbody></table>
      <b style="font-size:12.5px;">Factures</b>
      <table class="tbl" style="margin-top:8px;"><thead><tr><th>N°</th><th>Total</th><th>Statut</th></tr></thead>
      <tbody>${invoices.map(i=>`<tr><td>${i.numero}</td><td>${fmtMoney(i.total)}</td><td><span class="badge gray">${i.statut}</span></td></tr>`).join("") || `<tr><td colspan="3" class="empty-state">Aucune facture.</td></tr>`}</tbody></table>
    </div>
  `, `<button class="btn" onclick="closeModal()">Fermer</button>`, true);
}
function switchFicheTab(ev, name){
  document.querySelectorAll(".modal .tabbar button").forEach(b=>b.classList.remove("active"));
  ev.target.classList.add("active");
  document.getElementById("fiche_info").classList.toggle("hidden", name!=="info");
  document.getElementById("fiche_hist").classList.toggle("hidden", name!=="hist");
}
