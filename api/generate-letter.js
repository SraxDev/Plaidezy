import { createClient } from "@supabase/supabase-js";
import { rateLimitSupabase } from "./_rateLimit.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

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

  const { claimId, checkoutReference, promoCode, answers } = req.body || {};

  if (!claimId || typeof claimId !== "string" || claimId.length > 50)
    return res.status(400).json({ error: "claimId invalide." });

  if (!answers || typeof answers !== "object")
    return res.status(400).json({ error: "Données de réclamation manquantes." });

  // Vérification accès : soit paiement vérifié, soit code promo valide
  let accessGranted = false;

  if (promoCode && typeof promoCode === "string") {
    // Vérification code promo
    const validCodes = (process.env.PROMO_CODES || "").split(",").map((c) => c.trim().toUpperCase());
    if (validCodes.includes(promoCode.toUpperCase())) {
      accessGranted = true;
    } else {
      return res.status(403).json({ error: "Code promo invalide." });
    }
  } else if (checkoutReference && SUPABASE_URL && SUPABASE_KEY) {
    // Vérification paiement SumUp via Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: payment } = await supabase
      .from("payments")
      .select("id, used")
      .eq("reference", checkoutReference)
      .maybeSingle();

    if (!payment) return res.status(403).json({ error: "Paiement introuvable ou non confirmé." });
    if (payment.used) return res.status(403).json({ error: "Ce paiement a déjà été utilisé." });

    // Marque le paiement comme consommé
    await supabase.from("payments").update({ used: true }).eq("id", payment.id);
    accessGranted = true;
  } else if (!SUPABASE_URL) {
    // Mode dev sans Supabase
    accessGranted = true;
  }

  if (!accessGranted) {
    return res.status(403).json({ error: "Accès non autorisé. Veuillez effectuer le paiement." });
  }

  // Construction du prompt selon le type de réclamation
  const prompt = buildPrompt(claimId, answers);

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
              "Tu es un expert juridique français. Tu rédiges des lettres de réclamation professionnelles, précises et légalement fondées. Utilise un ton formel. Cite les articles de loi exacts. Structure la lettre avec : objet, faits, fondements juridiques, demande chiffrée, délai de réponse (15 jours), et formule de politesse. Réponds UNIQUEMENT avec le corps de la lettre, sans balises ni markdown.",
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

    return res.json({ letter });
  } catch (err) {
    console.error("generate-letter error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}

function buildPrompt(claimId, answers) {
  const base = `Rédige une lettre de réclamation formelle en français pour le cas suivant.\nType de réclamation : ${claimId}\nInformations fournies par l'utilisateur :\n${JSON.stringify(answers, null, 2)}\n`;

  const hints = {
    vol: "Applique le règlement CE n°261/2004. Si retard > 3h ou annulation < 14 jours avant départ, l'indemnisation est de 250€, 400€ ou 600€ selon la distance. Adresse la lettre à la compagnie aérienne.",
    parking: "Cite l'article R.49-1 du Code de procédure pénale pour la contestation. Indique clairement le motif de contestation (signalisation défectueuse, horodateur en panne, etc.).",
    colis: "Applique l'article L.224-65 du Code de la consommation et les conditions générales du transporteur. Délai légal de réclamation : 3 jours pour dommages, 21 jours pour perte.",
    train: "Applique le règlement CE n°1371/2007 et la garantie G30 SNCF. Retard > 30 min = 25% du billet, > 60 min = 50%, > 120 min = 75%.",
    caution: "Cite l'article 22 de la loi n°89-462 du 6 juillet 1989. Au-delà de 2 mois sans restitution, le propriétaire encourt une majoration de 10% du loyer mensuel par mois de retard.",
  };

  return base + (hints[claimId] || "");
}