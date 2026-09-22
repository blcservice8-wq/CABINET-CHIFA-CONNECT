# MEDICAL LAB SaaS

Application de gestion de cabinet médical / laboratoire d'analyses, construite
sur la base du bulletin d'analyses existant (`bulletin-analyses-laboratoire.html`),
conservé intact avec ses fonctions PDF, impression et QR code.

## 1. Ce qui a été conservé de l'application d'origine

- Le générateur de bulletin (hématologie, biochimie, hormonologie, sérologie,
  bactériologie), ses valeurs de référence par sexe/âge, son moteur `render()`.
- La génération PDF (`jsPDF` + `html2canvas`) et l'impression.
- Le générateur de QR code local (sans dépendance réseau).
- Le module facture / tarifs du bulletin.
- L'historique local (`localStorage`).

Ces fonctions n'ont pas été réécrites : `bulletin-analyses-laboratoire.html`
est resté quasiment identique. Seules deux petites fonctions ont été ajoutées
en fin de fichier (`applyBridgeData`, `notifyBridgeEvent`) pour le connecter
au nouveau module **Résultats & Bulletins** — voir §3.

## 2. Structure du projet

```
index.html                          Écran d'accueil
login.html                          Connexion (comptes démo)
dashboard.html                      Coquille app (sidebar/topbar/routeur)
bulletin-analyses-laboratoire.html  Bulletin officiel (conservé, connecté)
css/main.css
js/
  firebase-config.js   Configuration Firebase + interrupteur DEMO_MODE
  store.js             Couche de données (localStorage en démo, prête pour Firestore)
  auth.js              Connexion / session
  permissions.js       Matrice rôles → permissions
  seed.js              Données de démonstration
  app.js               Routeur, sidebar, topbar, tableau de bord, utilitaires UI
  patients.js / analyses.js / requests.js / results.js
  billing.js / payments.js / users.js / settings.js / logs.js
firestore.rules
```

Aucun framework, aucune étape de build : ouvrez `index.html`.

## 3. Intégration du bulletin existant

Depuis **Résultats & Bulletins**, le bouton « Ouvrir le bulletin » :
1. écrit les informations du patient dans `localStorage["medsaas_bulletin_bridge"]` ;
2. ouvre `bulletin-analyses-laboratoire.html?bridge=1` dans un nouvel onglet,
   qui préremplit alors le nom, prénom, sexe, dossier, etc. ;
3. à la génération du PDF, le bulletin écrit un événement dans
   `localStorage["medsaas_bulletin_event"]`, que l'onglet SaaS écoute pour
   faire passer automatiquement la demande au statut **Imprimée**.

Aucune donnée médicale sensible n'est mise dans le QR code lui-même (voir le
générateur d'origine, inchangé).

## 4. Mode démo vs Firebase réel

`js/firebase-config.js` contient `DEMO_MODE = true`. Tant que c'est le cas :
- toutes les données vivent dans `localStorage` (clé `medsaas_db`) ;
- l'authentification compare les identifiants aux comptes de démonstration.

Pour brancher un vrai projet Firebase :
1. Créez un projet sur https://console.firebase.google.com
2. Activez **Authentication** (méthode Email/Mot de passe) et **Cloud Firestore**.
3. Remplacez les valeurs de `firebaseConfig` dans `js/firebase-config.js`.
4. Ajoutez les SDK Firebase (voir commentaires dans ce même fichier).
5. Déployez `firestore.rules` : `firebase deploy --only firestore:rules`.
6. Passez `DEMO_MODE = false` et adaptez `js/store.js`/`js/auth.js` (chaque
   fonction indique en commentaire l'appel Firestore/Auth équivalent).
7. Créez le premier compte administrateur (Firebase Authentication +
   document `users/{uid}` avec `role: "admin"`).
8. Testez les trois rôles.

### Services Firebase utilisés (offre gratuite "Spark")
- **Authentication** : gratuit, quotas larges pour un usage cabinet.
- **Cloud Firestore** : gratuit jusqu'à 1 Go stocké / 50 000 lectures/jour
  environ — suffisant pour démarrer, à surveiller à l'échelle.
- **Cloud Functions** (non implémenté ici) : nécessaire si vous voulez des
  opérations serveur strictement inviolables (ex. validation de résultats
  médicaux) ; le plan Blaze (facturation à l'usage) est alors requis.

## 5. Comptes de démonstration

| Rôle          | Identifiant   | Mot de passe      |
|---------------|---------------|--------------------|
| Administrateur| admin         | Admin123           |
| Laboratoire   | laboratoire   | Laboratoire123     |
| Facturation   | facturation   | Facturation123     |

**Ne jamais utiliser ces identifiants en production.**

## 6. Rôles et permissions (résumé)

| Module       | Admin | Laboratoire | Facturation |
|--------------|:-----:|:-----------:|:-----------:|
| Dashboard    | ✔ | ✔ | ✔ |
| Patients     | ✔ | ✔ | Lecture |
| Analyses     | ✔ | ✔ | — |
| Résultats    | ✔ | ✔ | — |
| Bulletins    | ✔ | ✔ | Lecture |
| Factures     | ✔ | Lecture | ✔ |
| Paiements    | ✔ | — | ✔ |
| Utilisateurs | ✔ | — | — |
| Paramètres   | ✔ | — | — |

Détail des permissions granulaires : `js/permissions.js`.
**Important** : ce contrôle côté client n'est pas une sécurité réelle ;
`firestore.rules` doit appliquer les mêmes règles côté serveur.

## 7. Guide de test

```
Test connexion admin / laboratoire / facturation
Test permissions (sidebar différente par rôle, accès direct par hash bloqué)
Test création patient
Test demande d'analyse
Test ouverture du bulletin depuis une demande (préremplissage)
Test génération PDF du bulletin (statut demande → Imprimée)
Test création facture
Test paiement (partiel puis total → statut facture)
Test création utilisateur
Test recherche globale
Test responsive (mobile : menu ☰, tableaux défilants)
```

## 8. Limites connues de cette démonstration

- Authentification et rôles sont simulés côté client (voir §4 pour le
  passage en production).
- La saisie détaillée des paramètres biologiques reste dans le bulletin
  d'origine (non dupliquée dans le nouveau module Résultats), pour ne pas
  risquer de casser un moteur déjà fonctionnel.
- Aucun paiement d'abonnement SaaS n'est réellement traité (§29 architecture
  seulement).
