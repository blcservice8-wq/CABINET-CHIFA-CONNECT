/* ================= MODULE UTILISATEURS ================= */

let _usersCache = [];

async function view_users(){
  if(!requirePerm('users.view')) return;
  _usersCache = await DB.list("users");
  document.getElementById("content").innerHTML = `
    <div class="card">
      <div class="card-head">
        <h3>Utilisateurs</h3>
        ${can('users.create') ? `<button class="btn btn-primary" onclick="openUserForm()">+ Nouvel utilisateur</button>` : ""}
      </div>
      <table class="tbl"><thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Dernière connexion</th><th></th></tr></thead>
      <tbody>${_usersCache.map(u=>`
        <tr>
          <td>${esc(u.name)}</td><td>${esc(u.email)}</td>
          <td><span class="badge gray">${ROLE_LABELS[u.role]||u.role}</span></td>
          <td><span class="badge ${u.status==='Actif'?'ok':u.status==='Suspendu'?'bad':'gray'}">${u.status}</span></td>
          <td>${fmtDate(u.lastLogin)}</td>
          <td style="text-align:right; white-space:nowrap;">
            ${can('users.edit') ? `<button class="btn btn-sm" onclick="openUserForm('${u.id}')">Modifier</button>
            <button class="btn btn-sm" onclick="toggleUserStatus('${u.id}')">${u.status==='Actif'?'Désactiver':'Réactiver'}</button>` : ""}
            ${can('users.delete') ? `<button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')">Supprimer</button>` : ""}
          </td>
        </tr>`).join("") || `<tr><td colspan="6" class="empty-state">Aucun utilisateur.</td></tr>`}
      </tbody></table>
    </div>`;
}

function openUserForm(id){
  if(!requirePerm(id ? 'users.edit' : 'users.create')) return;
  const u = id ? _usersCache.find(x=>x.id===id) : {};
  openModal(id ? "Modifier l'utilisateur" : "Nouvel utilisateur", `
    <div class="grid2">
      <div class="field"><label>Nom complet *</label><input id="uf_name" value="${esc(u.name)}"></div>
      <div class="field"><label>Email *</label><input id="uf_email" value="${esc(u.email)}"></div>
      <div class="field"><label>Identifiant *</label><input id="uf_username" value="${esc(u.username)}"></div>
      <div class="field"><label>Rôle *</label>
        <select id="uf_role">
          <option value="admin" ${u.role==='admin'?'selected':''}>Administrateur</option>
          <option value="laboratoire" ${u.role==='laboratoire'?'selected':''}>Laboratoire</option>
          <option value="facturation" ${u.role==='facturation'?'selected':''}>Facturation</option>
        </select>
      </div>
    </div>
    <div class="field"><label>Mot de passe ${id?'(laisser vide pour ne pas changer)':'*'}</label><input id="uf_pwd" type="password"></div>
    <p style="font-size:11.5px; color:var(--sub);">Mode démo : mot de passe stocké localement à titre d'exemple. En production, la création de compte passe par Firebase Authentication (le mot de passe n'est jamais stocké dans Firestore).</p>
  `, `<button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveUser('${id||''}')">Enregistrer</button>`);
}

async function saveUser(id){
  const name = document.getElementById("uf_name").value.trim();
  const email = document.getElementById("uf_email").value.trim();
  const username = document.getElementById("uf_username").value.trim();
  const pwd = document.getElementById("uf_pwd").value;
  if(!name || !email || !username || (!id && !pwd)){ showToast("Champs obligatoires manquants.", "bad"); return; }
  const data = { name, email, username, role: document.getElementById("uf_role").value };
  if(pwd) data.password = pwd;
  if(id){ await DB.update("users", id, data); showToast("Utilisateur mis à jour."); }
  else { data.status="Actif"; data.lastLogin=null; await DB.add("users", data); showToast("Utilisateur créé."); }
  logActivity(id?"Modification":"Création", "Utilisateurs", `${data.name || id}`);
  closeModal();
  view_users();
}

function toggleUserStatus(id){
  const u = _usersCache.find(x=>x.id===id);
  const next = u.status==="Actif" ? "Inactif" : "Actif";
  DB.update("users", id, { status: next }).then(()=>{
    logActivity("Statut", "Utilisateurs", `${u.name} → ${next}`);
    showToast("Statut mis à jour.");
    view_users();
  });
}

function deleteUser(id){
  confirmDialog("Supprimer définitivement cet utilisateur ?", async ()=>{
    await DB.remove("users", id);
    logActivity("Suppression", "Utilisateurs", `Utilisateur ${id} supprimé`);
    showToast("Utilisateur supprimé.");
    view_users();
  });
}
