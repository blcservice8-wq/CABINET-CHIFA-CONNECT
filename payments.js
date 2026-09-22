/* ================= MODULE PAIEMENTS ================= */

async function view_payments(){
  const payments = (await DB.list("payments")).slice().reverse();
  document.getElementById("content").innerHTML = `
    <div class="card">
      <div class="card-head"><h3>Paiements</h3></div>
      <table class="tbl"><thead><tr><th>Facture</th><th>Patient</th><th>Montant</th><th>Mode</th><th>Référence</th><th>Date</th><th></th></tr></thead>
      <tbody>${payments.map(p=>`
        <tr>
          <td>${p.invoiceNumero}</td><td>${esc(p.patientNom)}</td><td>${fmtMoney(p.montant)}</td>
          <td><span class="badge gray">${p.mode}</span></td><td>${p.reference||'—'}</td><td>${fmtDateShort(p.date)}</td>
          <td style="text-align:right;"><button class="btn btn-sm" onclick="printReceipt('${p.id}')">🧾 Reçu</button></td>
        </tr>`).join("") || `<tr><td colspan="7" class="empty-state">Aucun paiement enregistré.</td></tr>`}
      </tbody></table>
    </div>`;
}

function openPaymentForm(invoiceId){
  if(!requirePerm('payments.create')) return;
  DB.get("invoices", invoiceId).then(inv=>{
    openModal(`Encaisser — ${inv.numero}`, `
      <p>Reste à payer : <b>${fmtMoney(inv.reste)}</b></p>
      <div class="grid2">
        <div class="field"><label>Montant *</label><input id="pmf_montant" type="number" value="${inv.reste}"></div>
        <div class="field"><label>Mode de paiement</label>
          <select id="pmf_mode">
            <option>Espèces</option><option>Carte bancaire</option><option>Virement</option>
            <option>Mobile Money</option><option>Chèque</option><option>Autre</option>
          </select>
        </div>
      </div>
      <div class="field"><label>Référence</label><input id="pmf_ref"></div>
    `, `<button class="btn" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" onclick="savePayment('${invoiceId}')">Enregistrer le paiement</button>`);
  });
}

async function savePayment(invoiceId){
  const montant = parseFloat(document.getElementById("pmf_montant").value) || 0;
  const inv = await DB.get("invoices", invoiceId);
  if(montant<=0 || montant>inv.reste+0.001){ showToast("Montant invalide.", "bad"); return; }
  const data = {
    invoiceId, invoiceNumero: inv.numero, patientNom: inv.patientNom, montant,
    mode: document.getElementById("pmf_mode").value,
    reference: document.getElementById("pmf_ref").value.trim(),
    date: new Date().toISOString()
  };
  await DB.add("payments", data);
  const paye = inv.montantPaye + montant;
  const reste = inv.total - paye;
  await DB.update("invoices", invoiceId, {
    montantPaye: paye, reste, statut: reste<=0 ? "Payée" : "Partiellement payée"
  });
  logActivity("Paiement", "Paiements", `Paiement de ${fmtMoney(montant)} sur ${inv.numero}`);
  pushNotification("Paiement enregistré", `${fmtMoney(montant)} sur ${inv.numero}`, "ok");
  showToast("Paiement enregistré.");
  closeModal();
  route();
}

function printReceipt(id){
  DB.get("payments", id).then(p=>{
    openModal("Reçu de paiement", `
      <div style="text-align:center; padding:10px 0;">
        <h3>Reçu de paiement</h3>
        <p>Facture : <b>${p.invoiceNumero}</b><br>Patient : ${esc(p.patientNom)}<br>
        Montant : <b>${fmtMoney(p.montant)}</b><br>Mode : ${p.mode}<br>
        Référence : ${p.reference||'—'}<br>Date : ${fmtDate(p.date)}</p>
      </div>
    `, `<button class="btn btn-primary" onclick="window.print()">🖨 Imprimer</button><button class="btn" onclick="closeModal()">Fermer</button>`);
  });
}
