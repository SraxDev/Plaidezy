import { createClient } from "@supabase/supabase-js";
import { rateLimitSupabase } from "./_rateLimit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (await rateLimitSupabase(`verify-promo:${ip}`, 10, 60_000))
    return res.status(429).json({ error: "Trop de requêtes." });

  const { code } = req.body || {};
  if (!code || typeof code !== "string")
    return res.status(400).json({ valid: false, error: "Code manquant." });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from("promo_codes")
    .select("id, uses_left")
    .eq("code", code.toUpperCase().trim())
    .maybeSingle();

  if (error || !data)
    return res.status(404).json({ valid: false, error: "Code promo invalide." });

  if (data.uses_left <= 0)
    return res.status(403).json({ valid: false, error: "Ce code promo a déjà été utilisé." });

  return res.json({ valid: true });
}