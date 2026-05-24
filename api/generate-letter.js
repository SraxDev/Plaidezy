import { createClient } from "@supabase/supabase-js";
import { rateLimitSupabase } from "./_rateLimit.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function normalizePromoCode(code) {
  return String(code || "").trim().toUpperCase();
}

async function validatePromoCode(code, supabase) {
  const normalized = normalizePromoCode(code);
  if (!normalized) return { valid: false, error: "Code promo manquant." };

  // 1) Codes simples configurés dans Vercel : PROMO_CODES=CODE1,CODE2
  const envCodes = (process.env.PROMO_CODES || "")
    .split(",")
    .map((c) => normalizePromoCode(c))
    .filter(Boolean);

  if (envCodes.includes(normalized)) {
    return { valid: true, source: "env", code: normalized };
  }

  // 2) Codes stockés en base Supabase : table promo_codes(code, uses_left)
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (await rateLimitSupabase(`generate-letter:${ip}`, 10, 60_000))
    return res.status(429).json({ error: "Trop de requêtes." });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!GROQ_KEY)
    return res.status(500).json({ error: "Clé Groq non configurée." });

  const { claimId, checkoutReference, paymentReference, promoCode, answers, personal } = req.body || {};
  const reference = checkoutReference || paymentReference;

  if (!claimId || typeof claimId !== "string" || claimId.length > 50)
    return res.status(400).json({ error: "claimId invalide." });

  if (!answers || typeof answers !== "object")
    return res.status(400).json({ error: "Données de réclamation manquantes." });

  const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  // Vérification accès : soit paiement vérifié, soit code promo valide
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
    // Mode dev sans Supabase
    accessGranted = true;
  }

  if (!accessGranted) {
    return res.status(403).json({ error: "Accès non autorisé. Veuillez effectuer le paiement ou utiliser un code promo valide." });
  }

  // Construction du prompt selon le type de réclamation
  const prompt = buildPrompt(claimId, answers, personal);

  try {
    const groqRes = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1500,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Tu es un assistant de rédaction juridique français. Tu rédiges des lettres de réclamation professionnelles, précises et fondées sur les textes applicables. Utilise un ton formel. Cite les références utiles quand elles sont pertinentes. Structure la lettre avec : coordonnées de l'expéditeur si fournies, objet, faits, fondements, demande chiffrée, délai de réponse, formule de politesse. Réponds UNIQUEMENT avec le corps de la lettre, sans balises ni markdown.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    const groqData = await groqRes.json();

    if (!groqRes.ok) {
      console.error("Groq error:", groqData);
      return res.status(500).json({ error: "Erreur lors de la génération de la lettre." });
    }

    const letter = groqData.choices?.[0]?.message?.content?.trim();
    if (!letter) return res.status(500).json({ error: "Réponse vide du modèle." });

    // On consomme le paiement / code promo uniquement après génération réussie.
    if (supabase && paymentToConsume?.id) {
      await supabase.from("payments").update({ used: true }).eq("id", paymentToConsume.id);
    }

    if (supabase && promoToConsume?.source === "supabase" && promoToConsume.id) {
      await supabase.rpc("decrement_promo_uses", { promo_id: promoToConsume.id }).then(async ({ error }) => {
        // Fallback si la fonction SQL n'existe pas : décrément manuel.
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

    return res.json({ letter });
  } catch (err) {
    console.error("generate-letter error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}

function buildPrompt(claimId, answers, personal = {}) {
  const base = `Rédige une lettre de réclamation formelle en français pour le cas suivant.\nType de réclamation : ${claimId}\nCoordonnées de l'utilisateur :\n${JSON.stringify(personal || {}, null, 2)}\nInformations fournies par l'utilisateur :\n${JSON.stringify(answers, null, 2)}\n`;

  const hints = {
    vol: "Applique le règlement CE n°261/2004. Si retard > 3h ou annulation < 14 jours avant départ, l'indemnisation est de 250€, 400€ ou 600€ selon la distance. Adresse la lettre à la compagnie aérienne.",
    parking: "Cite l'article R.49-1 du Code de procédure pénale pour la contestation. Indique clairement le motif de contestation (signalisation défectueuse, horodateur en panne, etc.).",
    colis: "Applique l'article L.224-65 du Code de la consommation et les conditions générales du transporteur. Délai légal de réclamation : 3 jours pour dommages, 21 jours pour perte.",
    train: "Applique le règlement CE n°1371/2007 et la garantie G30 SNCF. Retard > 30 min = 25% du billet, > 60 min = 50%, > 120 min = 75%.",
    caution: "Cite l'article 22 de la loi n°89-462 du 6 juillet 1989. Au-delà de 2 mois sans restitution, le propriétaire encourt une majoration de 10% du loyer mensuel par mois de retard.",
  };

  return base + (hints[claimId] || "");
}