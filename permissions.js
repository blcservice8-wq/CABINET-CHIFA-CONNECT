/* ======================================================================
   RÔLES & PERMISSIONS
   ----------------------------------------------------------------------
   Trois rôles fonctionnels + permissions granulaires par module.
   Côté client, ceci contrôle l'affichage (sidebar, boutons, routes).
   ATTENTION SÉCURITÉ (voir section 4 du cahier des charges) :
   ce contrôle JavaScript n'est PAS une sécurité réelle. En production,
   les mêmes règles doivent être dupliquées et appliquées côté serveur
   via les Firestore Security Rules (voir firestore.rules) : un
   utilisateur ne doit jamais pouvoir contourner une permission en
   modifiant le JavaScript du navigateur.
   ====================================================================== */

const PERMISSIONS = {
  admin: [
    "dashboard.view","patients.view","patients.create","patients.edit","patients.delete",
    "analyses.view","analyses.create","analyses.edit","analyses.delete",
    "requests.view","requests.create","requests.edit",
    "results.view","results.create","results.edit","results.validate",
    "bulletins.view","bulletins.create","bulletins.print",
    "billing.view","billing.create","billing.edit","billing.delete",
    "payments.view","payments.create",
    "users.view","users.create","users.edit","users.delete",
    "settings.view","settings.edit",
    "reports.view","activity_logs.view","notifications.view"
  ],
  laboratoire: [
    "dashboard.view","patients.view","patients.create","patients.edit",
    "analyses.view","analyses.create","analyses.edit",
    "requests.view","requests.create","requests.edit",
    "results.view","results.create","results.edit","results.validate",
    "bulletins.view","bulletins.create","bulletins.print",
    "billing.view",
    "notifications.view"
  ],
  facturation: [
    "dashboard.view","patients.view",
    "bulletins.view",
    "billing.view","billing.create","billing.edit",
    "payments.view","payments.create",
    "notifications.view"
  ]
};

function can(perm){
  const s = Auth.getSession();
  if(!s) return false;
  return (PERMISSIONS[s.role] || []).includes(perm);
}

function requirePerm(perm){
  if(!can(perm)){
    showToast("Accès non autorisé pour votre rôle.", "bad");
    return false;
  }
  return true;
}

const ROLE_LABELS = { admin: "Administrateur", laboratoire: "Laboratoire", facturation: "Facturation" };
