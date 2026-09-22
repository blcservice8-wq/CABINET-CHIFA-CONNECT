/* ======================================================================
   CONFIGURATION FIREBASE
   ----------------------------------------------------------------------
   Remplacez les valeurs ci-dessous par celles de votre projet Firebase
   (Console Firebase -> Paramètres du projet -> Vos applications -> SDK).
   Tant que DEMO_MODE = true, ces valeurs ne sont PAS utilisées : toute
   l'application fonctionne avec des données locales fictives
   (voir js/store.js). Passez DEMO_MODE à false pour brancher Firebase
   Authentication + Cloud Firestore une fois votre projet configuré et
   les SDK Firebase (compat) ajoutés dans les pages HTML.
   ====================================================================== */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Mode démonstration : localStorage + comptes fictifs, aucune donnée médicale réelle.
// Passez à false pour un déploiement réel connecté à Firebase.
const DEMO_MODE = true;

const CURRENT_ORG_ID = "org_demo"; // organizationId courant (architecture multi-établissement)

/* Pour activer Firebase réel :
   1) Ajoutez dans <head> de chaque page :
        <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
        <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
        <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
   2) firebase.initializeApp(firebaseConfig);
   3) DEMO_MODE = false;
   Le module js/store.js détecte alors DEMO_MODE et route tous les appels
   (list/get/add/update/remove) vers Cloud Firestore au lieu de localStorage,
   avec la même signature de fonctions — aucun autre fichier n'a besoin
   d'être modifié. */
