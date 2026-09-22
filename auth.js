/* ======================================================================
   AUTHENTIFICATION
   ----------------------------------------------------------------------
   DEMO_MODE : session simulée stockée dans localStorage ("medsaas_session"),
   comparée aux comptes de démonstration créés par seed.js.
   Production (DEMO_MODE=false) : remplacer login()/logout() par les appels
   Firebase Authentication (firebase.auth().signInWithEmailAndPassword,
   signOut, onAuthStateChanged) puis lire le rôle/permissions du document
   users/{uid} dans Firestore. La fonction getSession() doit alors renvoyer
   l'utilisateur Firebase courant enrichi de son rôle Firestore.
   ====================================================================== */

const SESSION_KEY = "medsaas_session";

const Auth = {
  getSession(){
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  async login(identifiant, password, remember){
    // FIRESTORE/AUTH réel :
    // const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
    // const userDoc = await db.collection('users').doc(cred.user.uid).get();
    const users = await DB.list("users");
    const user = users.find(u =>
      (u.username === identifiant || u.email === identifiant) && u.password === password
    );
    if(!user) throw new Error("Identifiant ou mot de passe incorrect.");
    if(user.status !== "Actif") throw new Error("Ce compte est " + user.status.toLowerCase() + ".");

    const session = { id: user.id, name: user.name, email: user.email, role: user.role, username: user.username };
    const store = remember ? localStorage : sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify(session));
    await DB.update("users", user.id, { lastLogin: new Date().toISOString() });
    logActivity("Connexion", "Auth", `${user.name} s'est connecté(e)`);
    return session;
  },

  logout(){
    const s = this.getSession();
    if(s) logActivity("Déconnexion", "Auth", `${s.name} s'est déconnecté(e)`);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
  },

  requireAuth(){
    const s = this.getSession();
    if(!s){ window.location.href = "login.html"; return null; }
    return s;
  }
};
