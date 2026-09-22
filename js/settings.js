/* ================= MODULE PARAMÈTRES ================= */

async function view_settings(){
  if(!requirePerm('settings.view')) return;
  const list = await DB.list("settings");
  const s = list[0] || {};
  const canEdit = can('settings.edit');
  document.getElementById("content").innerHTML = `
    <div class="card">
      <div class="card-head"><h3>Paramètres du cabinet / laboratoire</h3></div>
      <div class="grid2">
        <div class="field"><label>Nom du laboratoire</label><input id="st_name" value="${esc(s.labName)}" ${canEdit?'':'disabled'}></div>
        <div class="field"><label>Slogan</label><input id="st_slogan" value="${esc(s.slogan)}" ${canEdit?'':'disabled'}></div>
        <div class="field"><label>Téléphone</label><input id="st_tel" value="${esc(s.telephone)}" ${canEdit?'':'disabled'}></div>
        <div class="field"><label>Email</label><input id="st_email" value="${esc(s.email)}" ${canEdit?'':'disabled'}></div>
        <div class="field"><label>N° d'enregistrement</label><input id="st_numreg" value="${esc(s.numeroEnregistrement)}" ${canEdit?'':'disabled'}></div>
        <div class="field"><label>Devise</label><input id="st_devise" value="${esc(s.devise)}" ${canEdit?'':'disabled'}></div>
      </div>
      <div class="field"><label>Adresse</label><input id="st_adresse" value="${esc(s.adresse)}" ${canEdit?'':'disabled'}></div>
      ${canEdit ? `<button class="btn btn-primary" onclick="saveGeneralSettings('${s.id}')">Enregistrer</button>` : ""}
    </div>

    <div class="card">
      <div class="card-head"><h3>Abonnement</h3></div>
      <p style="font-size:13px;">Plan actuel : <span class="badge ok">${esc(s.subscriptionPlan||'Gratuit')}</span></p>
      <div class="toolbar-row">
        ${["Gratuit","Standard","Professionnel","Entreprise"].map(p=>`<button class="btn btn-sm ${p===s.subscriptionPlan?'btn-primary':''}" ${canEdit?`onclick="changePlan('${s.id}','${p}')"`:'disabled'}>${p}</button>`).join("")}
      </div>
      <p style="font-size:11.5px; color:var(--sub); margin-top:10px;">Architecture prête pour la facturation SaaS ; aucun paiement n'est traité dans cette démonstration.</p>
    </div>

    <div class="card">
      <div class="card-head"><h3>Documents & bulletin</h3></div>
      <p style="font-size:13px; color:var(--sub);">Le modèle de bulletin (logo, pied de page, signature, QR code) se configure directement dans le module <b>Résultats & Bulletins</b>, via le bouton « Paramètres » du bulletin — ces réglages historiques sont conservés tels quels.</p>
    </div>`;
}

async function saveGeneralSettings(id){
  const patch = {
    labName: document.getElementById("st_name").value.trim(),
    slogan: document.getElementById("st_slogan").value.trim(),
    telephone: document.getElementById("st_tel").value.trim(),
    email: document.getElementById("st_email").value.trim(),
    numeroEnregistrement: document.getElementById("st_numreg").value.trim(),
    devise: document.getElementById("st_devise").value.trim(),
    adresse: document.getElementById("st_adresse").value.trim()
  };
  await DB.update("settings", id, patch);
  logActivity("Modification", "Paramètres", "Paramètres du laboratoire mis à jour");
  showToast("Paramètres enregistrés.");
}

function changePlan(id, plan){
  DB.update("settings", id, { subscriptionPlan: plan }).then(()=>{
    logActivity("Abonnement", "Paramètres", `Plan changé pour ${plan}`);
    showToast("Plan mis à jour.");
    view_settings();
  });
}
