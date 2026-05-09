import { createClient } from "@supabase/supabase-js";

// Rate limiter simple
const hits = new Map();
function rateLimit(ip, max = 30, windowMs = 60_000) {
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

  const SUMUP_KEY = process.env.SUMUP_API_KEY;

  // Mode dev sans SumUp : bypass
  if (!SUMUP_KEY) return res.json({ verified: true, mode: "dev" });

  const { reference } = req.body || {};
  if (!reference || typeof reference !== "string")
    return res.status(400).json({ error: "Référence manquante." });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Vérifie d'abord en cache Supabase
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("reference", reference)
    .maybeSingle();

  if (existing) return res.json({ verified: true, mode: "cached" });

  // Vérification live SumUp
  try {
    const response = await fetch(
      `https://api.sumup.com/v0.1/checkouts?checkout_reference=${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${SUMUP_KEY}` } }
    );
    const checkouts = await response.json();
    if (!response.ok)
      return res.status(response.status).json({ verified: false, error: "Impossible de vérifier." });

    const items = Array.isArray(checkouts) ? checkouts : (checkouts.items || [checkouts]);
    const paid = items.find(
      (c) => c.checkout_reference === reference && c.status === "PAID"
    );

    if (paid) {
      // Enregistre en base pour les prochains appels
      await supabase
        .from("payments")
        .insert({ reference, checkout_id: paid.id })
        .select();
      return res.json({ verified: true, mode: "live" });
    }

    return res.json({
      verified: false,
      error: "Paiement non confirmé. Réessayez dans 30 secondes.",
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    return res.status(500).json({ verified: false, error: "Erreur serveur." });
  }
}
