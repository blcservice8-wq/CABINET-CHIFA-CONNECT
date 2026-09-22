/* ======================================================================
   COUCHE DE DONNÉES
   ----------------------------------------------------------------------
   API commune (Promises) utilisée par tous les modules :
     DB.list(collection, filterFn?)
     DB.get(collection, id)
     DB.add(collection, data)          -> retourne l'id créé
     DB.update(collection, id, patch)
     DB.remove(collection, id)
   En DEMO_MODE : stockage dans localStorage, clé "medsaas_db".
   En production (DEMO_MODE=false) : à remplacer par des appels
   Cloud Firestore équivalents (db.collection(name)...), en respectant
   la même signature — voir commentaires FIRESTORE ci-dessous.
   ====================================================================== */

const DB_KEY = "medsaas_db";

function _loadRaw(){
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : null;
}
function _saveRaw(data){
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}
function _uid(prefix){
  return (prefix||"id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

const DB = {
  _ensure(){
    let data = _loadRaw();
    if(!data){
      data = window.seedDatabase ? window.seedDatabase() : {};
      _saveRaw(data);
    }
    return data;
  },

  list(collection, filterFn){
    // FIRESTORE: return db.collection(collection).where('organizationId','==',CURRENT_ORG_ID).get()...
    const data = this._ensure();
    const arr = (data[collection] || []).slice();
    return Promise.resolve(filterFn ? arr.filter(filterFn) : arr);
  },

  get(collection, id){
    const data = this._ensure();
    const item = (data[collection] || []).find(x => x.id === id) || null;
    return Promise.resolve(item);
  },

  add(collection, item){
    // FIRESTORE: return db.collection(collection).add({...item, organizationId: CURRENT_ORG_ID, createdAt: serverTimestamp()})
    const data = this._ensure();
    if(!data[collection]) data[collection] = [];
    const id = item.id || _uid(collection.slice(0,3));
    const now = new Date().toISOString();
    const record = Object.assign({}, item, {
      id,
      organizationId: CURRENT_ORG_ID,
      createdAt: item.createdAt || now,
      updatedAt: now
    });
    data[collection].push(record);
    _saveRaw(data);
    return Promise.resolve(id);
  },

  update(collection, id, patch){
    const data = this._ensure();
    const arr = data[collection] || [];
    const idx = arr.findIndex(x => x.id === id);
    if(idx === -1) return Promise.resolve(false);
    arr[idx] = Object.assign({}, arr[idx], patch, { updatedAt: new Date().toISOString() });
    _saveRaw(data);
    return Promise.resolve(true);
  },

  remove(collection, id){
    const data = this._ensure();
    data[collection] = (data[collection] || []).filter(x => x.id !== id);
    _saveRaw(data);
    return Promise.resolve(true);
  },

  resetDemoData(){
    _saveRaw(window.seedDatabase());
  }
};

/* Journal d'activité — helper court utilisé par tous les modules */
function logActivity(action, module, description){
  const session = Auth.getSession();
  DB.add("activityLogs", {
    userEmail: session ? session.email : "system",
    userName: session ? session.name : "Système",
    action, module, description,
    date: new Date().toISOString()
  });
}

/* Notification helper */
function pushNotification(title, body, type){
  DB.add("notifications", { title, body, type: type||"info", read: false, date: new Date().toISOString() });
}
