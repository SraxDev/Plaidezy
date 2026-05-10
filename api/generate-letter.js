import { createClient } from "@supabase/supabase-js";
import { rateLimitSupabase } from "./_rateLimit.js";

const VALID_CLAIM_IDS = ["vol", "parking", "colis", "train", "caution"];

const CLAIM_META = {
  vol:     { name: "Vol retardé / annulé",        law: "Règlement (CE) n°261/2004" },
  parking: { name: "Amende de stationnement",      law: "Code de la route · Art. R417-3 et suivants" },
  colis:   { name: "Colis perdu ou endommagé",     law: "Code de la consommation · Art. L221-3 et L224-60" },
  train:   { name: "Retard SNCF / Eurostar",       law: "Garantie G30 · Règlement (UE) n°1371/2007" },
  caution: { name: "Caution non rendue",           law: "Code civil · Art. 2240 & Loi du 6 juillet 1989 (Art. 22)" },
};

function sanitize(val) {
  if (typeof val !== "string") return "";
  return val.replace(/[<>]/g, "").trim().slice(0, 500);
}

function buildPrompt(claimId, answers, personal) {
  const meta = CLAIM_META[claimId];
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const answersStr = Object.entries(answers)
    .filter(([k]) => !k.startsWith("_"))
    .map(([k, v]) => `- ${sanitize(k)} : ${sanitize(String(v))}`)
    .join("\n");

  return `Tu es un assistant juridique français. Génère une lettre de réclamation/mise en demeure formelle et professionnelle.

TYPE DE RÉCLAMATION : ${meta.name}
CADRE JURIDIQUE : ${meta.law}
DATE : ${today}

INFORMATIONS DE L'EXPÉDITEUR :
- Nom : ${sanitize(personal.fullName)}
- Adresse : ${sanitize(personal.address)}
- Ville : ${sanitize(personal.city)}
- Email : ${sanitize(personal.email)}

DÉTAILS DU DOSSIER :
${answersStr}

CONSIGNES :
- Rédige une lettre formelle complète (expéditeur, destinataire, date du jour, objet, corps, formule de politesse, signature)
- Cite les articles de loi précis applicables (${meta.law})
- Inclus le montant exact réclamé si pertinent
- Fixe un délai de réponse de 30 jours
- Mentionne qu'à défaut de réponse, une action en justice sera engagée
- Le ton doit être ferme mais professionnel
- Rédige UNIQUEMENT la lettre, sans commentaires ni explications
- N'utilise PAS de markdown, juste du texte brut`;
}

async function verifyPromoCode(supabase, code) {
  const { data, error } = await supabase
    .from("promo_codes")
    .select("id, uses_left")
    .eq("code", code.toUpperCase().trim())
    .maybeSingle();

  if (error || !data) return { valid: false, reason: "Code promo invalide." };
  if (data.uses_left <= 0) return { valid: false, reason: "Ce code promo a déjà été utilisé." };

  return { valid: true, id: data.id, uses_left: data.uses_left };
}

async function consumePromoCode(supabase, id, uses_left) {
  await supabase
    .from("promo_codes")
    .update({ uses_left: uses_left - 1 })
    .eq("id", id);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";

  const limited = await rateLimitSupabase(`generate:${ip}`, 10, 60_000);
  if (limited) return res.status(429).json({ error: "Trop de requêtes. Réessayez dans une minute." });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  const SUMUP_KEY = process.env.SUMUP_API_KEY;

  if (!GROQ_KEY) return res.status(500).json({ error: "GROQ_API_KEY non configurée." });

  const { claimId, answers, personal, paymentReference, promoCode } = req.body || {};

  if (!claimId || !VALID_CLAIM_IDS.includes(claimId))
    return res.status(400).json({ error: "Type de réclamation invalide." });

  if (!answers || typeof answers !== "object" || Array.isArray(answers))
    return res.status(400).json({ error: "Données du dossier invalides." });

  if (!personal || typeof personal !== "object" ||
      !personal.fullName || !personal.address || !personal.city || !personal.email)
    return res.status(400).json({ error: "Coordonnées incomplètes." });

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(personal.email))
    return res.status(400).json({ error: "Email invalide." });

  if (SUMUP_KEY) {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (promoCode && typeof promoCode === "string") {
      const promo = await verifyPromoCode(supabase, promoCode);
      if (!promo.valid) return res.status(403).json({ error: promo.reason });
      await consumePromoCode(supabase, promo.id, promo.uses_left);
    } else {
      if (!paymentReference || typeof paymentReference !== "string")
        return res.status(403).json({ error: "Paiement requis." });

      const { data: payment } = await supabase
        .from("payments")
        .select("id, used")
        .eq("reference", paymentReference)
        .maybeSingle();

      if (!payment)
        return res.status(403).json({ error: "Paiement non vérifié." });

      if (payment.used)
        return res.status(403).json({ error: "Cette référence de paiement a déjà été utilisée." });

      await supabase.from("payments").update({ used: true }).eq("reference", paymentReference);
    }
  }

  const prompt = buildPrompt(claimId, answers, personal);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    if (!response.ok)
      return res.status(response.status).json({ error: data.error?.message || "Erreur Groq" });

    const letter = data.choices?.[0]?.message?.content || "";
    if (!letter.trim()) return res.status(500).json({ error: "Réponse vide de l'IA." });

    return res.json({ letter: letter.trim() });
  } catch (err) {
    console.error("Groq error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}