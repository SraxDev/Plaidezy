/* ───────── Types ───────── */

export interface Question {
  id: string;
  label: string;
  type: "text" | "select" | "date" | "number" | "textarea";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

export interface PersonalInfo {
  fullName: string;
  address: string;
  city: string;
  email: string;
}

export interface ClaimConfig {
  id: string;
  icon: string;
  name: string;
  desc: string;
  shortDesc: string;
  questions: Question[];
  checkEligibility: (answers: Record<string, string>) => { eligible: boolean; reason?: string };
  calculateAmount: (answers: Record<string, string>) => string;
  law: string;
  lawDesc: string;
  generateLetter: (answers: Record<string, string>, personal: PersonalInfo) => string;
}

/* ───────── Helper ───────── */

const formatDate = (d: string) => {
  if (!d) return "[date]";
  const date = new Date(d);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

const today = () =>
  new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/* ───────── Claim Types ───────── */

export const claimTypes: ClaimConfig[] = [
  /* ──── VOL ──── */
  {
    id: "vol",
    icon: "plane",
    name: "Vol retardé ou annulé",
    desc: "Retard > 3h, annulation, surbooking",
    shortDesc: "Règlement EU261/2004",
    questions: [
      { id: "compagnie", label: "Compagnie aérienne", type: "text", placeholder: "Ex: Air France, Ryanair…", required: true },
      { id: "numero_vol", label: "Numéro de vol", type: "text", placeholder: "Ex: AF1234", required: true },
      { id: "date_vol", label: "Date du vol", type: "date", required: true },
      { id: "type_incident", label: "Type d'incident", type: "select", required: true, options: [
        { value: "retard", label: "Retard (> 3 heures à l'arrivée)" },
        { value: "annulation", label: "Annulation" },
        { value: "surbooking", label: "Surbooking (embarquement refusé)" },
      ]},
      { id: "duree_retard", label: "Durée du retard à l'arrivée", type: "select", options: [
        { value: "3", label: "3 à 4 heures" },
        { value: "4", label: "Plus de 4 heures" },
      ]},
      { id: "aeroport_depart", label: "Aéroport de départ", type: "text", placeholder: "Ex: Paris CDG", required: true },
      { id: "aeroport_arrivee", label: "Aéroport d'arrivée", type: "text", placeholder: "Ex: Rome Fiumicino", required: true },
      { id: "distance", label: "Distance du vol", type: "select", required: true, options: [
        { value: "court", label: "Court courrier (< 1 500 km)" },
        { value: "moyen", label: "Moyen courrier (1 500 – 3 500 km)" },
        { value: "long", label: "Long courrier (> 3 500 km)" },
      ]},
    ],
    checkEligibility: (a) => {
      // Date du vol obligatoire et cohérente
      if (!a.date_vol) return { eligible: false, reason: "Indiquez la date du vol." };
      const dateVol = new Date(a.date_vol);
      const now = new Date();
      if (dateVol > now) return { eligible: false, reason: "La date du vol ne peut pas être dans le futur." };
      const joursEcoules = Math.floor((now.getTime() - dateVol.getTime()) / (1000 * 60 * 60 * 24));
      if (joursEcoules > 1095) return { eligible: false, reason: "Le délai de réclamation est de 3 ans. Ce vol date de plus de 3 ans — le délai est malheureusement dépassé." };

      // Numéro de vol : format basique (2 lettres + chiffres)
      if (!a.numero_vol || a.numero_vol.trim().length < 4 || !/[A-Za-z]{1,3}\d{1,4}/.test(a.numero_vol)) {
        return { eligible: false, reason: "Le numéro de vol semble invalide (ex: AF1234, FR5678)." };
      }

      // Compagnie non vide et pas du charabia (au moins 2 caractères)
      if (!a.compagnie || a.compagnie.trim().length < 2) {
        return { eligible: false, reason: "Indiquez le nom de la compagnie aérienne." };
      }

      if (!a.type_incident) return { eligible: false, reason: "Sélectionnez un type d'incident." };
      if (a.type_incident === "annulation" || a.type_incident === "surbooking") return { eligible: true };
      if (a.type_incident === "retard" && a.duree_retard) return { eligible: true };
      if (a.type_incident === "retard" && !a.duree_retard) return { eligible: false, reason: "Le retard doit être d'au moins 3 heures à l'arrivée pour être éligible." };
      return { eligible: false, reason: "Sélectionnez un type d'incident." };
    },
    calculateAmount: (a) => {
      const d = a.distance;
      if (d === "court") return "250 €";
      if (d === "moyen") return "400 €";
      if (d === "long" && a.duree_retard === "3") return "300 €";
      return "600 €";
    },
    law: "Règlement (CE) n°261/2004",
    lawDesc: "Ce règlement européen impose aux compagnies aériennes une indemnisation forfaitaire en cas de retard important, d'annulation ou de refus d'embarquement. Le montant dépend de la distance du vol.",
    generateLetter: (a, p) => {
      const incident = a.type_incident === "retard" ? "retard" : a.type_incident === "annulation" ? "annulation" : "refus d'embarquement (surbooking)";
      const incidentPhrase = a.type_incident === "retard"
        ? `Mon vol a accusé un retard de ${a.duree_retard === "3" ? "3 à 4" : "plus de 4"} heures à l'arrivée à ${a.aeroport_arrivee}.`
        : a.type_incident === "annulation"
        ? `Ce vol a été annulé, alors que j'avais une réservation confirmée.`
        : `Il m'a été refusé l'embarquement sur ce vol malgré ma réservation confirmée, en raison d'une surréservation.`;
      const distance = a.distance === "court" ? "inférieure à 1 500 km" : a.distance === "moyen" ? "comprise entre 1 500 et 3 500 km" : "supérieure à 3 500 km";
      return `${p.fullName}
${p.address}
${p.city}
${p.email}

${today()}

À l'attention du Service Client Relations Passagers
${a.compagnie}

Objet : Réclamation au titre du règlement (CE) n°261/2004 du Parlement européen et du Conseil
Référence : Vol ${a.numero_vol} du ${formatDate(a.date_vol)}

Madame, Monsieur,

Je vous contacte par la présente afin de solliciter l'indemnisation à laquelle j'ai droit, en application du règlement (CE) n°261/2004 du 11 février 2004, suite au ${incident} de mon vol ${a.numero_vol} au départ de ${a.aeroport_depart} à destination de ${a.aeroport_arrivee}, prévu le ${formatDate(a.date_vol)}.

${incidentPhrase}

La distance de ce vol étant ${distance}, je suis fondé(e) à réclamer, en vertu de l'article 7§1 dudit règlement, une indemnisation forfaitaire s'élevant à la somme de ${a._calculatedAmount || "400 €"}.

Cette indemnisation est due de plein droit, indépendamment du prix du billet, et doit être versée dans un délai raisonnable.

En conséquence, je vous mets en demeure de procéder au versement de la somme de ${a._calculatedAmount || "400 €"} par virement bancaire sur le compte dont les coordonnées bancaires seront communiquées sur votre demande, dans un délai de trente (30) jours à compter de la réception de la présente.

À défaut de réponse favorable et de règlement dans ce délai, je me verrai contraint(e) de saisir la juridiction compétente ainsi que l'autorité nationale chargée du contrôle de l'application du règlement (CE) n°261/2004, sans préavis ni mise en demeure supplémentaire.

Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${p.fullName}`;
    },
  },

  /* ──── PARKING ──── */
  {
    id: "parking",
    icon: "parking",
    name: "Amende de stationnement",
    desc: "PV injuste, signalisation défaillante",
    shortDesc: "Recours administratif",
    questions: [
      { id: "numero_pv", label: "Numéro du PV", type: "text", placeholder: "Ex: 2025011234567", required: true },
      { id: "date_pv", label: "Date du PV", type: "date", required: true },
      { id: "lieu", label: "Lieu de l'infraction", type: "text", placeholder: "Ex: 12 rue de la Paix, Paris", required: true },
      { id: "montant_amende", label: "Montant de l'amende", type: "text", placeholder: "Ex: 35€", required: true },
      { id: "motif", label: "Motif de contestation", type: "select", required: true, options: [
        { value: "signalisation", label: "Signalisation absente ou illisible" },
        { value: "horodateur", label: "Horodateur en panne" },
        { value: "pas_moi", label: "Je n'étais pas le conducteur / pas mon véhicule" },
        { value: "paiement", label: "J'avais payé (ticket, horodateur, appli)" },
        { value: "autre", label: "Autre motif" },
      ]},
      { id: "details", label: "Précisez les faits", type: "textarea", placeholder: "Décrivez la situation...", required: true },
    ],
    checkEligibility: (a) => {
      // Date PV obligatoire
      if (!a.date_pv) return { eligible: false, reason: "Indiquez la date du PV." };
      const datePv = new Date(a.date_pv);
      const now = new Date();
      if (datePv > now) return { eligible: false, reason: "La date du PV ne peut pas être dans le futur." };
      const joursEcoules = Math.floor((now.getTime() - datePv.getTime()) / (1000 * 60 * 60 * 24));
      if (joursEcoules > 45) {
        return { eligible: false, reason: `Le délai légal de contestation est de 45 jours. Votre PV date de ${joursEcoules} jours — le délai est malheureusement dépassé.` };
      }

      // Numéro PV : au moins 5 caractères
      if (!a.numero_pv || a.numero_pv.trim().length < 5) {
        return { eligible: false, reason: "Indiquez le numéro de PV complet (visible sur l'avis de contravention)." };
      }

      // Lieu non vide et pas du charabia
      if (!a.lieu || a.lieu.trim().length < 5) {
        return { eligible: false, reason: "Indiquez le lieu de l'infraction (rue, ville)." };
      }

      // Montant amende : doit contenir un chiffre
      if (!a.montant_amende || !/\d/.test(a.montant_amende)) {
        return { eligible: false, reason: "Indiquez le montant de l'amende." };
      }

      if (!a.motif) {
        return { eligible: false, reason: "Sélectionnez un motif de contestation valable." };
      }
      if (!a.details || a.details.trim().length < 20) {
        return { eligible: false, reason: "Décrivez les faits avec plus de précision (au moins 20 caractères) pour constituer un dossier solide." };
      }
      return { eligible: true };
    },
    calculateAmount: (a) => `Annulation de l'amende (${a.montant_amende || "?"})`,
    law: "Code de la route · Art. L121-3 & L224-1",
    lawDesc: "Toute amende forfaitaire peut être contestée dans les 45 jours suivant la verbalisation. Les motifs de contestation sont encadrés par le Code de la route et le Code de procédure pénale.",
    generateLetter: (a, p) => {
      const motifs: Record<string, string> = {
        signalisation: "la signalisation était absente, illisible ou non conforme aux normes en vigueur à l'endroit où mon véhicule a été verbalisé",
        horodateur: "l'horodateur était en panne et ne permettait pas de régler le stationnement",
        pas_moi: "je n'étais pas le conducteur du véhicule au moment des faits",
        paiement: "j'avais régulièrement payé le stationnement (ticket / application / horodateur)",
        autre: a.details || "les circonstances ne justifient pas cette verbalisation",
      };
      return `${p.fullName}
${p.address}
${p.city}
${p.email}

${today()}

À l'attention de l'Officier du Ministère Public
Service du traitement des avis de contravention

Objet : Contestation de l'amende forfaitaire n° ${a.numero_pv}
Date de verbalisation : ${formatDate(a.date_pv)}

Madame, Monsieur l'Officier du Ministère Public,

Par la présente, je souhaite contester l'amende forfaitaire n° ${a.numero_pv} dont j'ai fait l'objet le ${formatDate(a.date_pv)} au ${a.lieu}, pour un montant de ${a.montant_amende}.

En effet, ${motifs[a.motif] || motifs["autre"]}.

${a.motif === "paiement" ? "Je joins à la présente une copie du justificatif de paiement du stationnement." : ""}
${a.motif === "horodateur" ? "Je joins à la présente une photographie de l'horodateur défectueux." : ""}

${a.details ? a.details + "\n" : ""}En conséquence, je vous demande bien vouloir prononcer la nullité de la présente verbalisation et annuler l'amende forfaitaire qui m'a été adressée.

Je me tiens à votre disposition pour tout complément d'information et vous prie d'agréer, Madame, Monsieur l'Officier du Ministère Public, l'expression de mes salutations distinguées.

${p.fullName}`;
    },
  },

  /* ──── COLIS ──── */
  {
    id: "colis",
    icon: "package",
    name: "Colis perdu ou endommagé",
    desc: "Colissimo, Mondial Relay, DPD…",
    shortDesc: "Code de la consommation",
    questions: [
      { id: "transporteur", label: "Transporteur", type: "select", required: true, options: [
        { value: "Colissimo", label: "Colissimo (La Poste)" },
        { value: "Mondial Relay", label: "Mondial Relay" },
        { value: "DPD", label: "DPD" },
        { value: "Chronopost", label: "Chronopost" },
        { value: "UPS", label: "UPS" },
        { value: "DHL", label: "DHL" },
        { value: "GLS", label: "GLS" },
        { value: "Autre", label: "Autre" },
      ]},
      { id: "numero_suivi", label: "Numéro de suivi", type: "text", placeholder: "Ex: 6A12345678900", required: true },
      { id: "date_envoi", label: "Date d'envoi", type: "date", required: true },
      { id: "type_probleme", label: "Type de problème", type: "select", required: true, options: [
        { value: "perdu", label: "Colis perdu (non reçu)" },
        { value: "endommage", label: "Colis endommagé" },
        { value: "vole", label: "Colis volé (vide à la réception)" },
      ]},
      { id: "valeur", label: "Valeur du contenu (€)", type: "number", placeholder: "Ex: 75", required: true },
      { id: "description", label: "Description du contenu", type: "text", placeholder: "Ex: Vêtements, livre, électronique…", required: true },
    ],
    checkEligibility: (a) => {
      // Date envoi obligatoire
      if (!a.date_envoi) return { eligible: false, reason: "Indiquez la date d'envoi du colis." };
      const dateEnvoi = new Date(a.date_envoi);
      const now = new Date();
      if (dateEnvoi > now) return { eligible: false, reason: "La date d'envoi ne peut pas être dans le futur." };
      const joursEcoules = Math.floor((now.getTime() - dateEnvoi.getTime()) / (1000 * 60 * 60 * 24));
      if (joursEcoules > 365) {
        return { eligible: false, reason: "Le délai de réclamation est d'un an à compter de la date d'envoi. Ce délai est malheureusement dépassé." };
      }
      if (joursEcoules < 3) {
        return { eligible: false, reason: "Le colis vient d'être expédié. Attendez au moins 3 jours ouvrés avant de déclarer un problème." };
      }

      // Numéro de suivi : au moins 8 caractères alphanumériques
      if (!a.numero_suivi || a.numero_suivi.trim().length < 8 || !/^[a-zA-Z0-9]+$/.test(a.numero_suivi.trim())) {
        return { eligible: false, reason: "Le numéro de suivi semble invalide. Il doit contenir au moins 8 caractères alphanumériques." };
      }

      if (!a.type_probleme) {
        return { eligible: false, reason: "Sélectionnez le type de problème rencontré." };
      }

      // Valeur réaliste : entre 1€ et 5000€
      const valeur = parseFloat(a.valeur);
      if (!a.valeur || isNaN(valeur) || valeur <= 0) {
        return { eligible: false, reason: "Indiquez la valeur du contenu du colis." };
      }
      if (valeur > 5000) {
        return { eligible: false, reason: "La valeur déclarée semble très élevée. Les transporteurs standard plafonnent leur responsabilité. Pour des colis de grande valeur, contactez directement un avocat." };
      }

      // Description pas du charabia (au moins 3 caractères distincts)
      if (!a.description || a.description.trim().length < 3) {
        return { eligible: false, reason: "Décrivez le contenu du colis (ex: vêtements, livre, téléphone…)." };
      }

      return { eligible: true };
    },
    calculateAmount: (a) => `${a.valeur || "?"} € (valeur déclarée) + frais de port`,
    law: "Code de la consommation · Art. L221-3 & L224-60",
    lawDesc: "Le transporteur est responsable de la perte ou de la détérioration du colis pendant le transport. Vous avez droit au remboursement du produit et des frais de port.",
    generateLetter: (a, p) => {
      const probleme = a.type_probleme === "perdu" ? "perdu" : a.type_probleme === "endommage" ? "endommagé" : "livré vidé (volé)";
      return `${p.fullName}
${p.address}
${p.city}
${p.email}

${today()}

À l'attention du Service Client
${a.transporteur}

Objet : Réclamation pour colis ${probleme} — ${a.numero_suivi}
Date d'envoi : ${formatDate(a.date_envoi)}

Madame, Monsieur,

Je vous contacte concernant le colis portant le numéro de suivi ${a.numero_suivi}, expédié le ${formatDate(a.date_envoi)} via votre service ${a.transporteur}.

Ce colis contenait : ${a.description}, pour une valeur totale de ${a.valeur} €.

${a.type_probleme === "perdu"
        ? "À ce jour, ce colis n'a toujours pas été livré alors que le délai de livraison est largement dépassé. Le suivi ne montre aucune mise à jour depuis plusieurs jours."
        : a.type_probleme === "endommage"
        ? "Le colis a été livré dans un état endommagé. Le contenu présente des détériorations manifestes dues au transport."
        : "Le colis a été livré scellé mais était vide à la réception, suggérant un vol ou une ouverture frauduleuse pendant le transport."}

Conformément aux articles L221-3 et L224-60 du Code de la consommation, ainsi qu'aux dispositions de la Convention postale universelle et/ou de la Convention CMR selon le cas, je vous demande le remboursement intégral de ${a.valeur} € correspondant à la valeur du contenu, ainsi que le remboursement des frais de port engagés.

Je vous mets en demeure de procéder à ce remboursement dans un délai de trente (30) jours à compter de la réception de la présente.

${a.type_probleme === "endommage" || a.type_probleme === "vole"
        ? "Je joins à la présente des photographies du colis et de son contenu attestant de l'état à la réception.\n" : ""}À défaut de réponse favorable, je me verrai contraint(e) de saisir le médiateur de la consommation et/ou la juridiction compétente.

Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.

${p.fullName}`;
    },
  },

  /* ──── TRAIN ──── */
  {
    id: "train",
    icon: "train",
    name: "Retard SNCF / Eurostar",
    desc: "Retard > 30 min",
    shortDesc: "Garantie G30 · Code des transports",
    questions: [
      { id: "compagnie", label: "Compagnie", type: "select", required: true, options: [
        { value: "SNCF (TGV)", label: "SNCF (TGV / OUIGO)" },
        { value: "SNCF (TER)", label: "SNCF (TER)" },
        { value: "SNCF (Intercités)", label: "SNCF (Intercités)" },
        { value: "Eurostar", label: "Eurostar" },
        { value: "Thalys", label: "Thalys" },
      ]},
      { id: "numero_train", label: "Numéro de train", type: "text", placeholder: "Ex: TGV 8542", required: true },
      { id: "date_trajet", label: "Date du trajet", type: "date", required: true },
      { id: "gare_depart", label: "Gare de départ", type: "text", placeholder: "Ex: Paris Gare de Lyon", required: true },
      { id: "gare_arrivee", label: "Gare d'arrivée", type: "text", placeholder: "Ex: Lyon Part-Dieu", required: true },
      { id: "retard", label: "Retard à l'arrivée", type: "select", required: true, options: [
        { value: "30", label: "30 à 59 minutes" },
        { value: "60", label: "1 à 2 heures (60 – 119 min)" },
        { value: "120", label: "Plus de 2 heures (120 min+)" },
      ]},
      { id: "prix_billet", label: "Prix du billet (€)", type: "number", placeholder: "Ex: 89", required: true },
    ],
    checkEligibility: (a) => {
      // Date trajet obligatoire et pas dans le futur
      if (!a.date_trajet) return { eligible: false, reason: "Indiquez la date du trajet." };
      const dateTrajet = new Date(a.date_trajet);
      const now = new Date();
      if (dateTrajet > now) return { eligible: false, reason: "La date du trajet ne peut pas être dans le futur." };
      const joursEcoules = Math.floor((now.getTime() - dateTrajet.getTime()) / (1000 * 60 * 60 * 24));
      if (joursEcoules > 365) {
        return { eligible: false, reason: "Le délai de réclamation est d'un an. Ce trajet date de plus d'un an — le délai est malheureusement dépassé." };
      }

      // Numéro de train : au moins 4 caractères
      if (!a.numero_train || a.numero_train.trim().length < 4) {
        return { eligible: false, reason: "Indiquez le numéro de train (ex: TGV 8542, visible sur votre billet)." };
      }

      // Prix billet : entre 1€ et 1000€
      const prix = parseFloat(a.prix_billet);
      if (!a.prix_billet || isNaN(prix) || prix <= 0) {
        return { eligible: false, reason: "Indiquez le prix de votre billet." };
      }
      if (prix > 1000) {
        return { eligible: false, reason: "Le prix du billet semble incorrect. Vérifiez le montant (valeur par billet, hors réservations groupées)." };
      }

      if (!a.retard) return { eligible: false, reason: "Indiquez la durée du retard." };

      return { eligible: true };
    },
    calculateAmount: (a) => {
      const prix = parseFloat(a.prix_billet) || 0;
      if (a.retard === "30") return `${Math.round(prix * 0.25)} € (25% du billet)`;
      if (a.retard === "60") return `${Math.round(prix * 0.50)} € (50% du billet)`;
      return `${Math.round(prix * 0.75)} € (75% du billet)`;
    },
    law: "Garantie G30 · Règlement (UE) n°1371/2007",
    lawDesc: "Le règlement européen et la garantie G30 imposent aux compagnies ferroviaires d'indemniser les voyageurs en cas de retard. Le montant dépend de la durée du retard et du prix du billet.",
    generateLetter: (a, p) => {
      const prix = parseFloat(a.prix_billet) || 0;
      const pct = a.retard === "30" ? 25 : a.retard === "60" ? 50 : 75;
      const montant = Math.round(prix * pct / 100);
      return `${p.fullName}
${p.address}
${p.city}
${p.email}

${today()}

À l'attention du Service Client
${a.compagnie}

Objet : Demande d'indemnisation pour retard — ${a.numero_train}
Date du trajet : ${formatDate(a.date_trajet)}

Madame, Monsieur,

Je vous contacte suite au retard important de mon train ${a.numero_train} au départ de ${a.gare_depart} à destination de ${a.gare_arrivee}, le ${formatDate(a.date_trajet)}.

À mon arrivée, le train accusait un retard de ${a.retard === "30" ? "30 à 59 minutes" : a.retard === "60" ? "1 à 2 heures" : "plus de 2 heures"}, ce qui m'a causé un préjudice notable dans l'organisation de ma journée.

Conformément au règlement (UE) n°1371/2007 et à la garantie G30, je suis en droit de prétendre à une indemnisation de ${pct}% du prix de mon billet, soit la somme de ${montant} € sur la base d'un billet d'un montant de ${a.prix_billet} €.

Je vous mets en demeure de procéder au versement de cette somme dans un délai de trente (30) jours à compter de la réception de la présente, par virement bancaire.

À défaut de réponse favorable, je me verrai contraint(e) de saisir la juridiction compétente ainsi que le médiateur des transports.

Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${p.fullName}`;
    },
  },

  /* ──── CAUTION ──── */
  {
    id: "caution",
    icon: "home",
    name: "Caution non rendue",
    desc: "Dépôt de garantie bloqué par le propriétaire",
    shortDesc: "Mise en demeure · Code civil",
    questions: [
      { id: "adresse_logement", label: "Adresse du logement", type: "text", placeholder: "Ex: 15 rue des Lilas, 75011 Paris", required: true },
      { id: "date_entree", label: "Date d'entrée dans le logement", type: "date", required: true },
      { id: "date_sortie", label: "Date de sortie du logement", type: "date", required: true },
      { id: "montant_caution", label: "Montant du dépôt de garantie (€)", type: "number", placeholder: "Ex: 1200", required: true },
      { id: "nom_bailleur", label: "Nom du propriétaire / bailleur", type: "text", placeholder: "Ex: M. Dupont", required: true },
      { id: "adresse_bailleur", label: "Adresse du propriétaire", type: "text", placeholder: "Ex: 8 avenue Victor Hugo, 75016 Paris", required: true },
      { id: "etat_lieux", label: "État des lieux de sortie", type: "select", required: true, options: [
        { value: "conforme", label: "Conforme (aucune dégradation)" },
        { value: "legers", label: "Légers points notés (usure normale)" },
        { value: "non_fait", label: "Pas d'état des lieux de sortie effectué" },
      ]},
    ],
    checkEligibility: (a) => {
      // Dates obligatoires
      if (!a.date_entree) return { eligible: false, reason: "Indiquez la date d'entrée dans le logement." };
      if (!a.date_sortie) return { eligible: false, reason: "Indiquez la date de sortie du logement." };

      const dateEntree = new Date(a.date_entree);
      const dateSortie = new Date(a.date_sortie);
      const now = new Date();

      if (dateSortie > now) return { eligible: false, reason: "La date de sortie ne peut pas être dans le futur." };
      if (dateSortie <= dateEntree) return { eligible: false, reason: "La date de sortie doit être postérieure à la date d'entrée." };

      // Bail trop court (moins de 7 jours) = probablement une erreur
      const dureeJours = Math.floor((dateSortie.getTime() - dateEntree.getTime()) / (1000 * 60 * 60 * 24));
      if (dureeJours < 7) return { eligible: false, reason: "La durée du bail semble incorrecte. Vérifiez les dates d'entrée et de sortie." };

      // Délai légal pas encore écoulé
      const joursDepuisSortie = Math.floor((now.getTime() - dateSortie.getTime()) / (1000 * 60 * 60 * 24));
      const delaiLegal = a.etat_lieux === "conforme" ? 30 : 60;
      if (joursDepuisSortie < delaiLegal) {
        return { eligible: false, reason: `Le propriétaire dispose de ${delaiLegal} jours pour restituer la caution. Il reste encore ${delaiLegal - joursDepuisSortie} jour(s). Revenez si le délai n'est pas respecté.` };
      }

      // Montant réaliste
      const montant = parseFloat(a.montant_caution);
      if (!a.montant_caution || isNaN(montant) || montant <= 0) {
        return { eligible: false, reason: "Indiquez le montant du dépôt de garantie versé." };
      }
      if (montant > 20000) {
        return { eligible: false, reason: "Le montant de la caution semble très élevé. Vérifiez le montant (en euros)." };
      }

      // Nom bailleur et adresse pas du charabia
      if (!a.nom_bailleur || a.nom_bailleur.trim().length < 3) {
        return { eligible: false, reason: "Indiquez le nom complet du propriétaire." };
      }
      if (!a.adresse_logement || a.adresse_logement.trim().length < 10) {
        return { eligible: false, reason: "Indiquez l'adresse complète du logement." };
      }

      return { eligible: true };
    },
    calculateAmount: (a) => {
      const caution = parseFloat(a.montant_caution) || 0;
      const sortie = new Date(a.date_sortie);
      const now = new Date();
      const monthsLate = Math.max(0, Math.floor((now.getTime() - sortie.getTime()) / (1000 * 60 * 60 * 24 * 30)) - 1);
      const majoration = Math.round(caution * 0.1 * monthsLate);
      return `${caution} €${majoration > 0 ? ` + ${majoration} € de majorations (${monthsLate} mois de retard)` : ""}`;
    },
    law: "Code civil · Art. 2240 & Loi du 6 juillet 1989 (Art. 22)",
    lawDesc: "Le propriétaire doit restituer la caution dans 1 mois (état des lieux conforme) ou 2 mois (avec retenues). Au-delà, il doit des majorations légales de 10% du loyer par mois de retard.",
    generateLetter: (a, p) => {
      const caution = parseFloat(a.montant_caution) || 0;
      const sortie = new Date(a.date_sortie);
      const now = new Date();
      const monthsLate = Math.max(0, Math.floor((now.getTime() - sortie.getTime()) / (1000 * 60 * 60 * 24 * 30)) - 1);
      const majoration = Math.round(caution * 0.1 * monthsLate);
      const total = caution + majoration;
      const etatPhrase = a.etat_lieux === "conforme" ? "L'état des lieux de sortie était conforme et ne mentionnait aucune dégradation."
        : a.etat_lieux === "legers" ? "L'état des lieux de sortie ne mentionnait que de l'usure normale, qui ne peut être retenue sur le dépôt de garantie conformément à l'article 7 de la loi du 6 juillet 1989."
        : "Aucun état des lieux de sortie contradictoire n'a été établi.";
      return `${p.fullName}
${p.address}
${p.city}
${p.email}

${today()}

Mise en demeure

${a.nom_bailleur}
${a.adresse_bailleur}

Objet : Restitution du dépôt de garantie — ${a.adresse_logement}
Réf. : Bail du ${formatDate(a.date_entree)} au ${formatDate(a.date_sortie)}

Madame, Monsieur,

Par la présente, je vous mets en demeure de procéder à la restitution de mon dépôt de garantie d'un montant de ${a.montant_caution} €, versé lors de mon entrée dans le logement situé au ${a.adresse_logement}, le ${formatDate(a.date_entree)}.

J'ai quitté ce logement le ${formatDate(a.date_sortie)}.

${etatPhrase}

Conformément à l'article 22 de la loi n°89-462 du 6 juillet 1989 tendant à améliorer les rapports locatifs, le dépôt de garantie doit être restitué dans un délai d'un mois à compter de la remise des clés lorsque l'état des lieux de sortie est conforme à l'état des lieux d'entrée, et dans un délai de deux mois dans le cas contraire.

Ce délai est aujourd'hui largement dépassé.${majoration > 0 ? `\n\nEn application de l'article 22 alinéa 5 de la loi précitée, le retard de restitution entraîne une majoration légale de 10% du loyer mensuel (hors charges) pour chaque mois de retard commencé. Compte tenu de ${monthsLate} mois de retard, la majoration s'élève à ${majoration} €, soit un total réclamé de ${total} €.` : ""}

Je vous mets en demeure de procéder au versement de la somme de ${total} € dans un délai de quinze (15) jours à compter de la réception de la présente, par virement bancaire sur le compte dont les coordonnées seront communiquées sur votre demande.

À défaut de règlement dans ce délai, je me verrai contraint(e) de saisir la commission départementale de conciliation et/ou la juridiction d'instance compétente, sans préavis ni mise en demeure supplémentaire.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${p.fullName}`;
    },
  },
];

/* ───────── Analysis Steps ───────── */

export function getAnalysisSteps(claimId: string) {
  const claim = claimTypes.find((c) => c.id === claimId);
  return [
    { label: "Identification du cadre juridique", sub: claim?.law || "Analyse..." },
    { label: "Vérification des conditions d'éligibilité", sub: "Analyse de votre situation" },
    { label: "Calcul de l'indemnisation", sub: "Estimation en cours…" },
    { label: "Rédaction des arguments légaux", sub: "Génération du dossier…" },
  ];
}