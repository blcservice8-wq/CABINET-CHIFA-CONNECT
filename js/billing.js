/* ================= MODULE FACTURATION ================= */

let _invoicesCache = [];
let _invFilter = "all";

async function view_billing(){
  const [invoices, patients, analyses] = await Promise.all([
    DB.list("invoices"), DB.list("patients"), DB.list("analyses")
  ]);
  _invoicesCache = invoices.slice().reverse();
  window._patientsForInv = patients;
  window._analysesForInv = analyses;

  document.getElementById("content").innerHTML = `
    <div class="card">
      <div class="card-head">
        <h3>Factures</h3>
        ${can('billing.create') ? `<button class="btn btn-primary" onclick="openInvoiceForm()">+ Nouvelle facture</button>` : ""}
      </div>
      <div class="toolbar-row" style="margin-bottom:14px;">
        <select onchange="_invFilter=this.value; renderInvoicesTable();">
          <option value="all">Toutes</option>
          <option value="Payée">Payées</option>
          <option value="Partiellement payée">Partiellement payées</option>
          <option value="Impayée">Impayées</option>
        </select>
      </div>
      <div id="invTableWrap"></div>
    </div>`;
  renderInvoicesTable();
}

function renderInvoicesTable(){
  const rows = _invFilter==="all" ? _invoicesCache : _invoicesCache.filter(i=>i.statut===_invFilter);
  document.getElementById("invTableWrap").innerHTML = `
    <table class="tbl"><thead><tr><th>N°</th><th>Patient</th><th>Total</th><th>Payé</th><th>Reste</th><th>Statut</th><th>Date</th><th></th></tr></thead>
    <tbody>${rows.map(i=>`
      <tr>
        <td>${i.numero}</td><td>${esc(i.patientNom)}</td><td>${fmtMoney(i.total)}</td>
        <td>${fmtMoney(i.montantPaye)}</td><td>${fmtMoney(i.reste)}</td>
        <td><span class="badge ${i.statut==='Payée'?'ok':i.statut==='Impayée'?'bad':'warn'}">${i.statut}</span></td>
        <td>${fmtDateShort(i.date)}</td>
        <td style="text-align:right; white-space:nowrap;">
          <button class="btn btn-sm" onclick="viewInvoice('${i.id}')">Voir</button>
          ${can('payments.create') && i.reste>0 ? `<button class="btn btn-sm btn-primary" onclick="openPaymentForm('${i.id}')">Encaisser</button>` : ""}
        </td>
      </tr>`).join("") || `<tr><td colspan="8" class="empty-state">Aucune facture.</td></tr>`}
    </tbody></table>`;
}

function openInvoiceForm(){
  if(!requirePerm('billing.create')) return;
  const patients = window._patientsForInv||[], analyses = window._analysesForInv||[];
  openModal("Nouvelle facture", `
    <div class="field"><label>Patient *</label>
      <select id="if_patient">${patients.map(p=>`<option value="${p.id}">${esc(p.nom)} ${esc(p.prenom)} — ${p.dossier}</option>`).join("")}</select>
    </div>
    <div class="field"><label>Prestations *</label>
      <div class="check-row" style="border:1px solid var(--line); border-radius:8px; padding:10px; flex-direction:column; align-items:stretch;">
        ${analyses.map(a=>`<label style="justify-content:space-between;"><span><input type="checkbox" value="${a.id}" data-prix="${a.prix}" data-label="${esc(a.label)}" class="if-analyse"> ${esc(a.label)}</span><span>${fmtMoney(a.prix)}</span></label>`).join("")}
      </div>
    </div>
    <div class="field"><label>Remise globale (FCFA)</label><input id="if_remise" type="number" value="0"></div>
  `, `<button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveInvoice()">Créer la facture</button>`, true);
}

async function saveInvoice(){
  const patientId = document.getElementById("if_patient").value;
  const patients = window._patientsForInv||[];
  const p = patients.find(x=>x.id===patientId);
  const checked = Array.from(document.querySelectorAll(".if-analyse:checked"));
  if(!patientId || !checked.length){ showToast("Sélectionnez un patient et au moins une prestation.", "bad"); return; }
  const remise = parseFloat(document.getElementById("if_remise").value) || 0;
  const lignes = checked.map(c => ({ label: c.dataset.label, qte:1, prixUnitaire: parseFloat(c.dataset.prix)||0, remise:0 }));
  const total = Math.max(0, lignes.reduce((s,l)=>s+l.prixUnitaire*l.qte,0) - remise);
  const count = (await DB.list("invoices")).length;
  const data = {
    numero: `F-${new Date().getFullYear()}-${String(100+count)}`,
    patientId, patientNom: `${p.nom} ${p.prenom}`,
    lignes, total, montantPaye:0, reste: total, statut:"Impayée", date: new Date().toISOString()
  };
  const id = await DB.add("invoices", data);
  logActivity("Création", "Facturation", `Facture ${data.numero} créée pour ${data.patientNom}`);
  pushNotification("Nouvelle facture", `${data.numero} — ${fmtMoney(total)}`, "info");
  showToast("Facture créée.");
  closeModal();
  view_billing();
}

async function viewInvoice(id){
  const inv = await DB.get("invoices", id);
  const payments = await DB.list("payments", p=>p.invoiceId===id);
  openModal(`Facture ${inv.numero}`, `
    <p><b>${esc(inv.patientNom)}</b> — ${fmtDateShort(inv.date)}</p>
    <table class="tbl"><thead><tr><th>Prestation</th><th>Qté</th><th>P.U.</th></tr></thead>
    <tbody>${inv.lignes.map(l=>`<tr><td>${esc(l.label)}</td><td>${l.qte}</td><td>${fmtMoney(l.prixUnitaire)}</td></tr>`).join("")}</tbody></table>
    <p style="margin-top:10px;">Total : <b>${fmtMoney(inv.total)}</b> — Payé : ${fmtMoney(inv.montantPaye)} — Reste : <b>${fmtMoney(inv.reste)}</b></p>
    <b style="font-size:12.5px;">Paiements</b>
    <table class="tbl" style="margin-top:6px;"><thead><tr><th>Date</th><th>Mode</th><th>Montant</th></tr></thead>
    <tbody>${payments.map(p=>`<tr><td>${fmtDateShort(p.date)}</td><td>${p.mode}</td><td>${fmtMoney(p.montant)}</td></tr>`).join("") || `<tr><td colspan="3" class="empty-state">Aucun paiement.</td></tr>`}</tbody></table>
  `, `<button class="btn" onclick="window.print()">🖨 Imprimer</button><button class="btn btn-primary" onclick="closeModal()">Fermer</button>`, true);
}
