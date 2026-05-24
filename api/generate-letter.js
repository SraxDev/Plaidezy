import { createClient } from "@supabase/supabase-js";
import { rateLimitSupabase } from "./_rateLimit.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_REVIEW_MODEL = "llama-3.3-70b-versatile";

function normalizePromoCode(code) {
  return String(code || "").trim().toUpperCase();
}

function cleanText(value, max = 1200) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function sanitizeObject(input, maxValueLength = 1200) {
  if (!input || typeof input !== "object") return {};
  const output = {};
  for (const [key, value] of Object.entries(input).slice(0, 50)) {
    const safeKey = cleanText(key, 90);
    if (!safeKey) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      output[safeKey] = cleanText(value, maxValueLength);
    }
  }
  return output;
}

function formatDate(value) {
  const raw = cleanText(value);
  if (!raw) return "[date à compléter]";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${day}/${month}/${year}`;
  }
  return raw;
}

function todayFr() {
  return new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function compactJson(obj) {
  return JSON.stringify(obj || {}, null, 2);
}

function getClaimConfig(claimId) {
  const configs = {
    vol: {
      label: "Vol retardé, annulé ou surbooking",
      recipient: "compagnie aérienne / service réclamations",
      legalBasis: [
        "Règlement (CE) n°261/2004, notamment les articles 5, 6 et 7 lorsque les conditions sont réunies.",
        "Jurisprudence européenne assimilant certains retards importants à une annulation pour l’indemnisation forfaitaire, lorsque le retard à l’arrivée atteint au moins 3 heures.",
      ],
      checks: [
        "Vérifier le type d’incident : retard, annulation ou refus d’embarquement.",
        "Ne pas affirmer avec certitude l’absence de circonstances extraordinaires si l’utilisateur ne l’indique pas.",
        "Le montant dépend de la distance : 250 €, 400 € ou 600 € selon le trajet, sauf cas de réduction ou circonstances particulières.",
      ],
      tone: "ferme, précis, orienté indemnisation passager",
    },
    train: {
      label: "Retard SNCF / Eurostar",
      recipient: "service client ou service réclamations du transporteur ferroviaire",
      legalBasis: [
        "Conditions commerciales du transporteur, notamment Garantie G30 lorsqu’elle s’applique.",
        "Règles européennes relatives aux droits des voyageurs ferroviaires lorsque pertinentes.",
      ],
      checks: [
        "Ne pas promettre une indemnisation certaine si le type de billet ou le transporteur ne le permet pas.",
        "Adapter la demande à la durée du retard et au prix du billet.",
      ],
      tone: "clair, factuel, orienté compensation du billet",
    },
    colis: {
      label: "Colis perdu, retardé ou endommagé",
      recipient: "transporteur, vendeur ou service client concerné",
      legalBasis: [
        "Obligation de bonne exécution de la livraison selon la relation contractuelle.",
        "Code de la consommation lorsque l’achat est réalisé auprès d’un professionnel.",
      ],
      checks: [
        "Distinguer vendeur et transporteur selon les informations fournies.",
        "Demander remboursement, réexpédition ou indemnisation selon le cas.",
        "Ne pas inventer la valeur du colis si elle n’est pas fournie.",
      ],
      tone: "pragmatique, documenté, orienté résolution rapide",
    },
    parking: {
      label: "Contestation d’amende ou forfait de stationnement",
      recipient: "service compétent indiqué sur l’avis / officier du ministère public / collectivité selon le cas",
      legalBasis: [
        "Procédure de contestation applicable à l’avis reçu.",
        "Principes de motivation, preuve et examen du recours.",
      ],
      checks: [
        "Rester prudent sur les articles exacts si le type d’avis n’est pas parfaitement identifié.",
        "Insister sur les faits, preuves, photos, ticket ou horodateur.",
        "Demander l’annulation ou le réexamen, pas une garantie d’annulation.",
      ],
      tone: "sobre, factuel, administratif",
    },
    caution: {
      label: "Dépôt de garantie / caution non restituée",
      recipient: "bailleur, propriétaire ou agence gestionnaire",
      legalBasis: [
        "Article 22 de la loi n°89-462 du 6 juillet 1989 relatif au dépôt de garantie.",
        "Possibilité de majoration en cas de restitution tardive lorsque les conditions sont réunies.",
      ],
      checks: [
        "Mentionner état des lieux, date de sortie, remise des clés et montant du dépôt de garantie.",
        "Demander les justificatifs de toute retenue.",
        "Proposer une mise en demeure avec délai raisonnable.",
      ],
      tone: "ferme, formel, orienté mise en demeure",
    },
  };
  return configs[claimId] || {
    label: "Réclamation générale",
    recipient: "service compétent",
    legalBasis: ["Références utiles à adapter selon le dossier."],
    checks: ["Rester prudent et factuel."],
    tone: "professionnel et clair",
  };
}

function isUsableLetter(letter) {
  const text = String(letter || "").trim();
  if (text.length < 700) return false;
  if (!/objet\s*:/i.test(text)) return false;
  if (!/madame|monsieur/i.test(text)) return false;
  if (/```|\*\*|voici|bien sûr|certainement/i.test(text)) return false;
  if (/\{\{|\}\}|undefined|null/i.test(text)) return false;
  return true;
}

function stripBadFormatting(letter) {
  return String(letter || "")
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/```/g, "")
    .replace(/^Voici.*?:\s*/i, "")
    .replace(/\*\*/g, "")
    .trim();
}

async function callGroq({ apiKey, model, messages, maxTokens, temperature, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Groq error:", data);
      throw new Error("Erreur lors de la génération IA.");
    }

    return data.choices?.[0]?.message?.content?.trim() || "";
  } finally {
    clearTimeout(timeout);
  }
}

function buildFullGenerationPrompt({ claimId, answers, personal }) {
  const config = getClaimConfig(claimId);
  return `Tu dois rédiger une lettre de réclamation complète, professionnelle et prête à envoyer.

TYPE DE DOSSIER
${config.label}

DESTINATAIRE PROBABLE
${config.recipient}

TON À UTILISER
${config.tone}

DATE DU JOUR
${todayFr()}

COORDONNÉES UTILISATEUR
${compactJson(personal)}

INFORMATIONS DU DOSSIER
${compactJson(answers)}

RÉFÉRENCES ET RÈGLES UTILES
${config.legalBasis.map((x) => `- ${x}`).join("\n")}

POINTS DE VIGILANCE
${config.checks.map((x) => `- ${x}`).join("\n")}

CONSIGNES STRICTES
- Rédige la lettre complète toi-même, de A à Z.
- N’invente jamais de fait, de montant, de date, de justificatif ou de référence certaine non fournie.
- Si une information manque, écris un placeholder clair entre crochets, par exemple [numéro de dossier] ou [adresse du destinataire].
- Ne promets jamais que l’utilisateur va gagner.
- Ne dis jamais que tu es avocat.
- Ne donne pas de conseils hors lettre.
- Ne produis ni markdown, ni liste d’explications, ni commentaire avant/après.
- La lettre doit être directement copiable dans un courrier.

STRUCTURE OBLIGATOIRE
1. Coordonnées de l’expéditeur si fournies.
2. Destinataire ou placeholder.
3. Lieu et date.
4. Objet précis.
5. Formule d’appel.
6. Rappel clair des faits.
7. Fondement ou référence utile, formulé prudemment.
8. Demande précise avec montant si fourni ou estimable depuis les données.
9. Liste courte des pièces jointes si les justificatifs sont évidents.
10. Délai de réponse raisonnable, généralement 15 jours.
11. Réserve de recours amiable/médiation/juridiction compétente sans menace excessive.
12. Formule de politesse.
13. Signature.

QUALITÉ ATTENDUE
- Français naturel, formel et fluide.
- Lettre ferme mais courtoise.
- Phrases précises, pas de blabla.
- Longueur cible : 700 à 1200 mots maximum selon complexité, mais sans remplir inutilement.

Rédige maintenant uniquement la lettre finale.`;
}

function buildReviewPrompt({ claimId, answers, personal, letter }) {
  const config = getClaimConfig(claimId);
  return `Relis et améliore cette lettre pour la rendre plus professionnelle, claire et juridiquement prudente.

TYPE DE DOSSIER : ${config.label}
DONNÉES DOSSIER : ${compactJson(answers)}
COORDONNÉES : ${compactJson(personal)}

RÈGLES DE RÉVISION
- Corrige les maladresses et améliore le style.
- Vérifie que la lettre ne contient pas de faits inventés.
- Si un fait semble inventé ou non fourni, remplace-le par un placeholder entre crochets.
- Ne supprime pas les informations importantes.
- Ne rajoute aucun commentaire, seulement la lettre finale.
- Pas de markdown.

LETTRE À AMÉLIORER
${letter}`;
}

async function generateFullAILetter({ claimId, answers, personal }) {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) throw new Error("Clé Groq non configurée.");

  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const reviewModel = process.env.GROQ_REVIEW_MODEL || process.env.GROQ_MODEL || DEFAULT_REVIEW_MODEL;
  const qualityMode = (process.env.AI_QUALITY_MODE || "premium").toLowerCase();
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 30_000);

  const firstLetter = stripBadFormatting(await callGroq({
    apiKey: GROQ_KEY,
    model,
    timeoutMs,
    maxTokens: Number(process.env.AI_MAX_TOKENS || 1900),
    temperature: Number(process.env.AI_TEMPERATURE || 0.18),
    messages: [
      {
        role: "system",
        content:
          "Tu es un assistant expert en rédaction de lettres de réclamation en français. Tu rédiges des courriers complets, prudents, structurés et professionnels. Tu n’inventes jamais de faits. Tu réponds uniquement avec la lettre finale.",
      },
      { role: "user", content: buildFullGenerationPrompt({ claimId, answers, personal }) },
    ],
  }));

  let finalLetter = firstLetter;

  // Mode premium : deuxième passe de relecture IA pour augmenter la qualité.
  // Mode standard : une seule passe pour réduire le coût.
  if (qualityMode !== "standard") {
    finalLetter = stripBadFormatting(await callGroq({
      apiKey: GROQ_KEY,
      model: reviewModel,
      timeoutMs,
      maxTokens: Number(process.env.AI_REVIEW_MAX_TOKENS || 1700),
      temperature: Number(process.env.AI_REVIEW_TEMPERATURE || 0.12),
      messages: [
        {
          role: "system",
          content:
            "Tu es un relecteur senior de lettres de réclamation. Tu corriges, clarifies et sécurises juridiquement sans inventer. Tu réponds uniquement avec la lettre finale.",
        },
        { role: "user", content: buildReviewPrompt({ claimId, answers, personal, letter: firstLetter }) },
      ],
    }));
  }

  if (!isUsableLetter(finalLetter)) {
    // Une tentative de réparation uniquement si la sortie est trop faible.
    const repaired = stripBadFormatting(await callGroq({
      apiKey: GROQ_KEY,
      model,
      timeoutMs,
      maxTokens: Number(process.env.AI_MAX_TOKENS || 1900),
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "Tu corriges une sortie IA invalide. Réponds uniquement avec une lettre de réclamation complète, sans markdown, avec Objet, Madame/Monsieur, faits, demande, délai et formule de politesse.",
        },
        { role: "user", content: buildFullGenerationPrompt({ claimId, answers, personal }) },
      ],
    }));

    if (!isUsableLetter(repaired)) {
      throw new Error("La génération IA n’a pas produit une lettre exploitable. Réessayez dans quelques instants.");
    }

    return { letter: repaired, mode: "ai-repaired" };
  }

  return { letter: finalLetter, mode: qualityMode === "standard" ? "ai-full-standard" : "ai-full-premium" };
}

async function validatePromoCode(code, supabase) {
  const normalized = normalizePromoCode(code);
  if (!normalized) return { valid: false, error: "Code promo manquant." };

  const envCodes = (process.env.PROMO_CODES || "")
    .split(",")
    .map((c) => normalizePromoCode(c))
    .filter(Boolean);

  if (envCodes.includes(normalized)) {
    return { valid: true, source: "env", code: normalized };
  }

  if (supabase) {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("id, code, uses_left")
      .eq("code", normalized)
      .maybeSingle();

    if (!error && data) {
      if (typeof data.uses_left === "number" && data.uses_left <= 0) {
        return { valid: false, error: "Ce code promo a déjà été utilisé." };
      }
      return { valid: true, source: "supabase", id: data.id, code: normalized };
    }
  }

  return { valid: false, error: "Code promo invalide." };
}

async function consumeAccess({ supabase, paymentToConsume, promoToConsume }) {
  if (supabase && paymentToConsume?.id) {
    await supabase.from("payments").update({ used: true }).eq("id", paymentToConsume.id);
  }

  if (supabase && promoToConsume?.source === "supabase" && promoToConsume.id) {
    await supabase.rpc("decrement_promo_uses", { promo_id: promoToConsume.id }).then(async ({ error }) => {
      if (error) {
        const { data } = await supabase
          .from("promo_codes")
          .select("uses_left")
          .eq("id", promoToConsume.id)
          .maybeSingle();
        if (data && typeof data.uses_left === "number" && data.uses_left > 0) {
          await supabase
            .from("promo_codes")
            .update({ uses_left: data.uses_left - 1 })
            .eq("id", promoToConsume.id);
        }
      }
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (await rateLimitSupabase(`generate-letter:${ip}`, 10, 60_000))
    return res.status(429).json({ error: "Trop de requêtes." });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const { claimId, checkoutReference, paymentReference, promoCode } = req.body || {};
  const reference = checkoutReference || paymentReference;

  if (!claimId || typeof claimId !== "string" || claimId.length > 50)
    return res.status(400).json({ error: "claimId invalide." });

  if (!req.body?.answers || typeof req.body.answers !== "object")
    return res.status(400).json({ error: "Données de réclamation manquantes." });

  const answers = sanitizeObject(req.body.answers);
  const personal = sanitizeObject(req.body.personal || {}, 320);
  const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  let accessGranted = false;
  let paymentToConsume = null;
  let promoToConsume = null;

  if (promoCode && typeof promoCode === "string") {
    const promo = await validatePromoCode(promoCode, supabase);
    if (!promo.valid) return res.status(403).json({ error: promo.error || "Code promo invalide." });
    accessGranted = true;
    promoToConsume = promo;
  } else if (reference && typeof reference === "string" && supabase) {
    const { data: payment } = await supabase
      .from("payments")
      .select("id, used")
      .eq("reference", reference)
      .maybeSingle();

    if (!payment) return res.status(403).json({ error: "Paiement introuvable ou non confirmé." });
    if (payment.used) return res.status(403).json({ error: "Ce paiement a déjà été utilisé." });

    accessGranted = true;
    paymentToConsume = payment;
  } else if (!SUPABASE_URL) {
    accessGranted = true;
  }

  if (!accessGranted) {
    return res.status(403).json({ error: "Accès non autorisé. Veuillez effectuer le paiement ou utiliser un code promo valide." });
  }

  try {
    const { letter, mode } = await generateFullAILetter({ claimId, answers, personal });

    // On consomme le paiement/code promo uniquement après génération IA réussie.
    await consumeAccess({ supabase, paymentToConsume, promoToConsume });

    return res.json({ letter, mode });
  } catch (err) {
    console.error("generate-letter error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Erreur serveur." });
  }
}
