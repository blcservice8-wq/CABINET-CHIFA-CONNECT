/* ======================================================================
   DONNÉES DE DÉMONSTRATION — toutes fictives, aucune donnée médicale réelle
   ====================================================================== */

function seedDatabase(){
  const now = Date.now();
  const iso = (offsetDays) => new Date(now + offsetDays*86400000).toISOString();

  const users = [
    { id:"u_admin", name:"Aïda Ndiaye", email:"admin@labdemo.sn", username:"admin", password:"Admin123", role:"admin", status:"Actif", lastLogin:iso(0) },
    { id:"u_labo", name:"Dr Moussa Fall", email:"laboratoire@labdemo.sn", username:"laboratoire", password:"Laboratoire123", role:"laboratoire", status:"Actif", lastLogin:iso(0) },
    { id:"u_fact", name:"Fatou Sarr", email:"facturation@labdemo.sn", username:"facturation", password:"Facturation123", role:"facturation", status:"Actif", lastLogin:iso(0) }
  ];

  const prenoms = ["Mamadou","Awa","Ibrahima","Khady","Cheikh","Astou","Ousmane","Bineta","Serigne","Ndeye"];
  const noms = ["Diop","Sow","Ba","Gueye","Diallo","Faye","Ndoye","Sy","Camara","Thiam"];
  const patients = [];
  for(let i=0;i<10;i++){
    const sexe = i%2===0 ? "M":"F";
    patients.push({
      id:"pat_"+(1000+i),
      dossier:"P-"+String(1000+i),
      nom:noms[i], prenom:prenoms[i], sexe,
      dateNaissance: `19${70+i}-0${(i%9)+1}-1${i%9}`,
      telephone:`77${String(1000000+i*137).slice(0,7)}`,
      email:`${prenoms[i].toLowerCase()}.${noms[i].toLowerCase()}@example.com`,
      adresse:"Dakar, Sénégal", profession:"—", contact:"—",
      statut:"Actif", createdAt: iso(-30+i)
    });
  }

  const analyses = [
    { id:"an_nfs", code:"NFS", label:"Numération Formule Sanguine", categorie:"Hématologie", prix:5000, unite:"—", delai:"24h" },
    { id:"an_gly", code:"GLY", label:"Glycémie", categorie:"Biochimie", prix:2000, unite:"g/L", delai:"4h" },
    { id:"an_crea", code:"CREA", label:"Créatinine", categorie:"Biochimie", prix:3000, unite:"mg/L", delai:"4h" },
    { id:"an_uree", code:"UREE", label:"Urée", categorie:"Biochimie", prix:2500, unite:"g/L", delai:"4h" },
    { id:"an_asat", code:"ASAT", label:"ASAT", categorie:"Biochimie", prix:3500, unite:"UI/L", delai:"24h" },
    { id:"an_alat", code:"ALAT", label:"ALAT", categorie:"Biochimie", prix:3500, unite:"UI/L", delai:"24h" },
    { id:"an_chol", code:"CHOL", label:"Cholestérol total", categorie:"Biochimie", prix:3000, unite:"g/L", delai:"24h" },
    { id:"an_trig", code:"TRIG", label:"Triglycérides", categorie:"Biochimie", prix:3000, unite:"g/L", delai:"24h" },
    { id:"an_crp", code:"CRP", label:"CRP", categorie:"Immunologie", prix:6000, unite:"mg/L", delai:"24h" },
    { id:"an_vih", code:"VIH", label:"Sérologie VIH", categorie:"Sérologie", prix:7000, unite:"—", delai:"48h" },
    { id:"an_hepb", code:"HEPB", label:"Hépatite B (AgHBs)", categorie:"Sérologie", prix:6000, unite:"—", delai:"48h" },
    { id:"an_hepc", code:"HEPC", label:"Hépatite C (Ac)", categorie:"Sérologie", prix:6000, unite:"—", delai:"48h" }
  ];

  const statutsReq = ["Demandée","Prélèvement effectué","En cours","Résultat disponible","À valider","Validée","Imprimée"];
  const analysisRequests = [];
  const results = [];
  for(let i=0;i<12;i++){
    const p = patients[i % patients.length];
    const a = analyses[i % analyses.length];
    const statut = statutsReq[i % statutsReq.length];
    const reqId = "req_"+(2000+i);
    analysisRequests.push({
      id:reqId, patientId:p.id, patientNom:`${p.nom} ${p.prenom}`,
      analyseIds:[a.id], medecin:"Dr. " + noms[(i+3)%noms.length],
      urgence: i%5===0, observations:"", statut, date: iso(-10+i)
    });
    if(["Résultat disponible","À valider","Validée","Imprimée"].includes(statut)){
      results.push({
        id:"res_"+(3000+i), requestId:reqId, patientId:p.id, analyseId:a.id,
        valeur:(Math.random()*10).toFixed(2), unite:a.unite,
        indicateur:["Normal","Normal","Bas","Élevé"][i%4],
        valide: statut==="Validée" || statut==="Imprimée",
        date: iso(-9+i)
      });
    }
  }

  const statutsFact = ["Payée","Partiellement payée","Impayée"];
  const invoices = [];
  const payments = [];
  for(let i=0;i<8;i++){
    const p = patients[i % patients.length];
    const total = 5000 + (i%5)*3000;
    const statut = statutsFact[i % statutsFact.length];
    const paye = statut==="Payée" ? total : statut==="Partiellement payée" ? Math.round(total*0.5) : 0;
    const invId = "inv_"+(4000+i);
    invoices.push({
      id:invId, numero:`F-2026-${String(100+i)}`, patientId:p.id, patientNom:`${p.nom} ${p.prenom}`,
      lignes:[{ label: analyses[i%analyses.length].label, qte:1, prixUnitaire: total, remise:0 }],
      total, montantPaye: paye, reste: total-paye, statut, date: iso(-15+i)
    });
    if(paye>0){
      payments.push({
        id:"pay_"+(5000+i), invoiceId:invId, invoiceNumero:`F-2026-${String(100+i)}`,
        patientNom:`${p.nom} ${p.prenom}`, montant:paye, mode:["Espèces","Mobile Money","Carte bancaire"][i%3],
        reference:"REF-"+(5000+i), date: iso(-14+i)
      });
    }
  }

  const notifications = [
    { id:"ntf_1", title:"Nouveau résultat disponible", body:"Un résultat est prêt à être validé.", type:"info", read:false, date: iso(-1) },
    { id:"ntf_2", title:"Facture impayée", body:"La facture F-2026-101 reste impayée.", type:"warn", read:false, date: iso(-2) },
    { id:"ntf_3", title:"Paiement enregistré", body:"Un paiement a été enregistré par Fatou Sarr.", type:"ok", read:true, date: iso(-3) }
  ];

  const activityLogs = [
    { id:"log_1", userName:"Aïda Ndiaye", userEmail:"admin@labdemo.sn", action:"Connexion", module:"Auth", description:"Connexion administrateur", date: iso(-5) },
    { id:"log_2", userName:"Dr Moussa Fall", userEmail:"laboratoire@labdemo.sn", action:"Création", module:"Patients", description:"Création du patient P-1002", date: iso(-4) },
    { id:"log_3", userName:"Fatou Sarr", userEmail:"facturation@labdemo.sn", action:"Paiement", module:"Facturation", description:"Paiement enregistré sur F-2026-100", date: iso(-2) }
  ];

  const settings = {
    id:"settings_main",
    labName:"Laboratoire Médical Demo", slogan:"La gestion intelligente de votre cabinet et laboratoire.",
    adresse:"Avenue Cheikh Anta Diop, Dakar, Sénégal", telephone:"+221 33 000 00 00",
    email:"contact@labdemo.sn", devise:"FCFA", numeroEnregistrement:"RC-DEMO-0001",
    langue:"fr", formatDate:"JJ/MM/AAAA", fuseauHoraire:"Africa/Dakar",
    subscriptionPlan:"Gratuit", subscriptionStatus:"active"
  };

  const laboratories = [
    { id: CURRENT_ORG_ID, name:"Laboratoire Médical Demo", plan:"Gratuit" }
  ];

  return { users, patients, analyses, analysisRequests, results, invoices, payments, notifications, activityLogs, settings: [settings], laboratories };
}

window.seedDatabase = seedDatabase;
