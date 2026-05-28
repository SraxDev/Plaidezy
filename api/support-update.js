import { createClient } from "@supabase/supabase-js";
import { rateLimitSupabase } from "./_rateLimit.js";

function checkPassword(password) {
  const expected = process.env.SUPPORT_ADMIN_PASSWORD;
  return !!expected && typeof password === "string" && password === expected;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (await rateLimitSupabase(`support-admin-update:${ip}`, 40, 60_000)) {
    return res.status(429).json({ error: "Trop de requêtes." });
  }

  const { password, id, status } = req.body || {};
  if (!checkPassword(password)) return res.status(401).json({ error: "Mot de passe invalide." });
  if (!id || !["new", "read", "closed"].includes(status)) {
    return res.status(400).json({ error: "Données invalides." });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase
    .from("support_messages")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("Support update error:", error);
    return res.status(500).json({ error: "Impossible de mettre à jour le message." });
  }

  return res.json({ ok: true });
}
