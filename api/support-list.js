import { createClient } from "@supabase/supabase-js";
import { rateLimitSupabase } from "./_rateLimit.js";

function checkPassword(password) {
  const expected = process.env.SUPPORT_ADMIN_PASSWORD;
  return !!expected && typeof password === "string" && password === expected;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (await rateLimitSupabase(`support-admin:${ip}`, 30, 60_000)) {
    return res.status(429).json({ error: "Trop de requêtes." });
  }

  const { password, status = "all" } = req.body || {};
  if (!process.env.SUPPORT_ADMIN_PASSWORD) {
    return res.status(503).json({ error: "Interface admin non configurée." });
  }
  if (!checkPassword(password)) {
    return res.status(401).json({ error: "Mot de passe invalide." });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  let query = supabase
    .from("support_messages")
    .select("id,email,type,type_label,message,page,user_agent,status,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (["new", "read", "closed"].includes(status)) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    console.error("Support list error:", error);
    return res.status(500).json({ error: "Impossible de charger les messages." });
  }

  return res.json({ ok: true, messages: data || [] });
}
