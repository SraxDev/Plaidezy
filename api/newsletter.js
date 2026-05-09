import { createClient } from "@supabase/supabase-js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limiter simple en mémoire (reset à chaque cold start, suffisant pour limiter les abus)
const hits = new Map();
function rateLimit(ip, max = 5, windowMs = 60_000) {
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

  const { email } = req.body || {};
  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim()) || email.length > 320)
    return res.status(400).json({ error: "Email invalide." });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase
    .from("newsletter")
    .insert({ email: email.trim().toLowerCase() })
    .select();

  // Code 23505 = unique violation (email déjà inscrit) → on retourne ok quand même
  if (error && error.code !== "23505") {
    console.error("Newsletter insert error:", error);
    return res.status(500).json({ error: "Erreur serveur." });
  }

  return res.json({ ok: true });
}
