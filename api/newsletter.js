import { createClient } from "@supabase/supabase-js";
import { rateLimitSupabase } from "./_rateLimit.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (await rateLimitSupabase(`newsletter:${ip}`, 20, 60_000)) return res.status(429).json({ error: "Trop de requêtes." });

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