import { createClient } from "@supabase/supabase-js";

// Rate limiter simple
const hits = new Map();
function rateLimit(ip, max = 10, windowMs = 60_000) {
  const now = Date.now();
  const rec = hits.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + windowMs; }
  rec.count++;
  hits.set(ip, rec);
  return rec.count > max;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (rateLimit(ip)) return res.status(429).json({ error: "Trop de requêtes." });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const SUMUP_KEY = process.env.SUMUP_API_KEY;

  if (!GEMINI_KEY) return res.status(500).json({ error: "GEMINI_API_KEY non configurée." });

  const { prompt, paymentReference } = req.body || {};

  if (!prompt || typeof prompt !== "string" || prompt.length > 8000)
    return res.status(400).json({ error: "Prompt invalide." });

  // Vérification du paiement (ignorée en mode dev sans SumUp)
  if (SUMUP_KEY) {
    if (!paymentReference || typeof paymentReference !== "string")
      return res.status(403).json({ error: "Paiement requis." });

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: payment } = await supabase
      .from("payments")
      .select("id")
      .eq("reference", paymentReference)
      .maybeSingle();

    if (!payment)
      return res.status(403).json({ error: "Paiement non vérifié." });
  }

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
