/* ================= MODULE RÉSULTATS & BULLETINS =================
   Le bulletin existant (bulletin-analyses-laboratoire.html) reste le
   document officiel : PDF, impression et QR code y sont générés
   exactement comme avant. Ce module en fait le cœur du flux labo :
   chaque demande "prête" ouvre le bulletin pré-rempli dans un nouvel
   onglet ; la génération du PDF y notifie automatiquement le
   changement de statut ici (voir applyBridgeData/notifyBridgeEvent
   dans le fichier du bulletin). */

async function view_results(){
  const requests = (await DB.list("analysisRequests",
    r => ["Prélèvement effectué","En cours","Résultat disponible","À valider","Validée","Imprimée"].includes(r.statut)
  )).slice().reverse();
  const patients = await DB.list("patients");
  window._patientsForResults = patients;

  document.getElementById("content").innerHTML = `
    <div class="card">
      <div class="card-head">
        <h3>Résultats & Bulletins</h3>
        <span style="font-size:12px; color:var(--sub);">Le bulletin officiel (PDF, impression, QR code) s'ouvre dans un nouvel onglet.</span>
      </div>
      <table class="tbl"><thead><tr><th>Patient</th><th>Statut</th><th>Date</th><th></th></tr></thead>
      <tbody>${requests.map(r=>`
        <tr>
          <td>${esc(r.patientNom)}</td>
          <td>${statusBadgeReq(r.statut)}</td>
          <td>${fmtDateShort(r.date)}</td>
          <td style="text-align:right; white-space:nowrap;">
            ${can('bulletins.create') ? `<button class="btn btn-sm btn-primary" onclick="openBulletinFor('${r.id}')">Ouvrir le bulletin</button>` : ""}
            ${can('results.validate') && r.statut==="Résultat disponible" ? `<button class="btn btn-sm" onclick="validateRequestResult('${r.id}')">Valider</button>` : ""}
          </td>
        </tr>`).join("") || `<tr><td colspan="4" class="empty-state">Aucun résultat en attente.</td></tr>`}
      </tbody></table>
    </div>`;

  // écoute les mises à jour envoyées depuis l'onglet du bulletin
  window.removeEventListener("storage", onBulletinBridgeEvent);
  window.addEventListener("storage", onBulletinBridgeEvent);
}

function openBulletinFor(requestId){
  if(!requirePerm('bulletins.create')) return;
  DB.get("analysisRequests", requestId).then(r=>{
    const p = (window._patientsForResults||[]).find(x=>x.id===r.patientId) || {};
    const age = p.dateNaissance ? (new Date().getFullYear() - new Date(p.dateNaissance).getFullYear()) + " ANS" : "";
    const bridge = {
      requestId, nom: p.nom, prenom: p.prenom, sexe: p.sexe,
      adresse: p.adresse, tel: p.telephone, dossier: p.dossier, medecin: r.medecin, age
    };
    localStorage.setItem("medsaas_bulletin_bridge", JSON.stringify(bridge));
    window.open("bulletin-analyses-laboratoire.html?bridge=1", "_blank");
    showToast("Bulletin ouvert dans un nouvel onglet.");
  });
}

function onBulletinBridgeEvent(ev){
  if(ev.key !== "medsaas_bulletin_event" || !ev.newValue) return;
  try{
    const data = JSON.parse(ev.newValue);
    if(data.kind === "pdf_genere" && data.requestId){
      DB.update("analysisRequests", data.requestId, { statut: "Imprimée" }).then(()=>{
        logActivity("Génération PDF", "Bulletins", `Bulletin généré pour la demande ${data.requestId}`);
        pushNotification("Bulletin généré", "Un bulletin d'analyses a été généré et téléchargé en PDF.", "ok");
        if(location.hash.replace("#","")==="results") view_results();
      });
    }
  }catch(e){}
}

function validateRequestResult(id){
  confirmDialog("Valider ce résultat ? Il sera verrouillé pour modification.", async ()=>{
    await DB.update("analysisRequests", id, { statut:"Validée" });
    logActivity("Validation", "Résultats", `Résultat validé pour la demande ${id}`);
    showToast("Résultat validé.");
    view_results();
  });
}
