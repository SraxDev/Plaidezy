import { createClient } from "@supabase/supabase-js";
import { rateLimitSupabase } from "./_rateLimit.js";

function normalizePromoCode(code) {
  return String(code || "").trim().toUpperCase();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (await rateLimitSupabase(`verify-promo:${ip}`, 10, 60_000))
    return res.status(429).json({ error: "Trop de requêtes." });

  const { code } = req.body || {};
  const normalized = normalizePromoCode(code);
  if (!normalized) return res.status(400).json({ valid: false, error: "Code manquant." });

  // Codes simples configurés dans Vercel : PROMO_CODES=CODE1,CODE2
  const envCodes = (process.env.PROMO_CODES || "")
    .split(",")
    .map((c) => normalizePromoCode(c))
    .filter(Boolean);

  if (envCodes.includes(normalized)) {
    return res.json({ valid: true, source: "env" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(404).json({ valid: false, error: "Code promo invalide." });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data, error } = await supabase
    .from("promo_codes")
    .select("id, uses_left")
    .eq("code", normalized)
    .maybeSingle();

  if (error || !data)
    return res.status(404).json({ valid: false, error: "Code promo invalide." });

  if (typeof data.uses_left === "number" && data.uses_left <= 0)
    return res.status(403).json({ valid: false, error: "Ce code promo a déjà été utilisé." });

  return res.json({ valid: true, source: "supabase" });
}
