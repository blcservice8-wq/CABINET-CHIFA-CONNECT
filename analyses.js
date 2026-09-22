/* ================= MODULE CATALOGUE D'ANALYSES ================= */

let _analysesCache = [];

async function view_analyses(){
  _analysesCache = await DB.list("analyses");
  document.getElementById("content").innerHTML = `
    <div class="card">
      <div class="card-head">
        <h3>Catalogue des analyses</h3>
        ${can('analyses.create') ? `<button class="btn btn-primary" onclick="openAnalyseForm()">+ Nouvelle analyse</button>` : ""}
      </div>
      <table class="tbl"><thead><tr><th>Code</th><th>Libellé</th><th>Catégorie</th><th>Unité</th><th>Délai</th><th>Prix</th><th></th></tr></thead>
      <tbody>${_analysesCache.map(a=>`
        <tr>
          <td>${esc(a.code)}</td><td>${esc(a.label)}</td><td><span class="badge gray">${esc(a.categorie)}</span></td>
          <td>${esc(a.unite)}</td><td>${esc(a.delai)}</td><td>${fmtMoney(a.prix)}</td>
          <td style="text-align:right; white-space:nowrap;">
            ${can('analyses.edit') ? `<button class="btn btn-sm" onclick="openAnalyseForm('${a.id}')">Modifier</button>` : ""}
            ${can('analyses.delete') ? `<button class="btn btn-sm btn-danger" onclick="deleteAnalyse('${a.id}')">Supprimer</button>` : ""}
          </td>
        </tr>`).join("") || `<tr><td colspan="7" class="empty-state">Aucune analyse.</td></tr>`}
      </tbody></table>
    </div>`;
}

function openAnalyseForm(id){
  if(!requirePerm(id ? 'analyses.edit' : 'analyses.create')) return;
  const a = id ? _analysesCache.find(x=>x.id===id) : {};
  openModal(id ? "Modifier l'analyse" : "Nouvelle analyse", `
    <div class="grid2">
      <div class="field"><label>Code *</label><input id="af_code" value="${esc(a.code)}"></div>
      <div class="field"><label>Libellé *</label><input id="af_label" value="${esc(a.label)}"></div>
      <div class="field"><label>Catégorie</label><input id="af_cat" value="${esc(a.categorie)}"></div>
      <div class="field"><label>Unité</label><input id="af_unite" value="${esc(a.unite)}"></div>
      <div class="field"><label>Délai</label><input id="af_delai" value="${esc(a.delai)}"></div>
      <div class="field"><label>Prix (FCFA)</label><input id="af_prix" type="number" value="${a.prix||0}"></div>
    </div>
  `, `<button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveAnalyse('${id||''}')">Enregistrer</button>`);
}

async function saveAnalyse(id){
  const code = document.getElementById("af_code").value.trim();
  const label = document.getElementById("af_label").value.trim();
  if(!code || !label){ showToast("Code et libellé sont requis.", "bad"); return; }
  const data = {
    code, label, categorie: document.getElementById("af_cat").value.trim() || "Général",
    unite: document.getElementById("af_unite").value.trim(),
    delai: document.getElementById("af_delai").value.trim(),
    prix: parseFloat(document.getElementById("af_prix").value) || 0
  };
  if(id){ await DB.update("analyses", id, data); showToast("Analyse mise à jour."); }
  else { await DB.add("analyses", data); showToast("Analyse ajoutée."); }
  logActivity(id?"Modification":"Création", "Analyses", `${data.code} — ${data.label}`);
  closeModal();
  view_analyses();
}

function deleteAnalyse(id){
  confirmDialog("Supprimer cette analyse du catalogue ?", async ()=>{
    await DB.remove("analyses", id);
    logActivity("Suppression", "Analyses", `Analyse ${id} supprimée`);
    showToast("Analyse supprimée.");
    view_analyses();
  });
}
