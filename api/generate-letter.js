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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";

  // Rate limiter persistant (10 req/min/IP) — survit aux cold starts Vercel
  const limited = await rateLimitSupabase(`generate:${ip}`, 10, 60_000);
  if (limited) return res.status(429).json({ error: "Trop de requêtes. Réessayez dans une minute." });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const SUMUP_KEY = process.env.SUMUP_API_KEY;

  if (!GEMINI_KEY) return res.status(500).json({ error: "GEMINI_API_KEY non configurée." });

  const { claimId, answers, personal, paymentReference } = req.body || {};

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

  // Vérification paiement (ignorée en mode dev sans SumUp)
  if (SUMUP_KEY) {
    if (!paymentReference || typeof paymentReference !== "string")
      return res.status(403).json({ error: "Paiement requis." });

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

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

  const prompt = buildPrompt(claimId, answers, personal);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok)
      return res.status(response.status).json({ error: data.error?.message || "Erreur Gemini" });

    const letter = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!letter.trim()) return res.status(500).json({ error: "Réponse vide de l'IA." });

    return res.json({ letter: letter.trim() });
  } catch (err) {
    console.error("Gemini error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}