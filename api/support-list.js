import { createClient } from "@supabase/supabase-js";
import { rateLimitSupabase } from "./_rateLimit.js";

const VALID_STATUSES = ["new", "read", "closed"];

function checkPassword(password) {
  const expected = process.env.SUPPORT_ADMIN_PASSWORD;
  return !!expected && typeof password === "string" && password === expected;
}

function hasSupabase() {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function getCount(supabase, status) {
  let query = supabase
    .from("support_messages")
    .select("id", { count: "exact", head: true });
  if (status) query = query.eq("status", status);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (await rateLimitSupabase(`support-admin:${ip}`, 30, 60_000)) {
    return res.status(429).json({ error: "Trop de requêtes." });
  }

  const { password, status = "all", search = "" } = req.body || {};

  if (!process.env.SUPPORT_ADMIN_PASSWORD) {
    return res.status(503).json({ error: "Interface admin non configurée : variable SUPPORT_ADMIN_PASSWORD manquante." });
  }
  if (!hasSupabase()) {
    return res.status(503).json({ error: "Supabase non configuré pour l’espace support." });
  }
  if (!checkPassword(password)) {
    return res.status(401).json({ error: "Mot de passe invalide." });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    let query = supabase
      .from("support_messages")
      .select("id,email,type,type_label,message,page,user_agent,status,created_at")
      .order("created_at", { ascending: false })
      .limit(150);

    if (VALID_STATUSES.includes(status)) query = query.eq("status", status);

    const term = String(search || "").trim();
    if (term) {
      const safeTerm = term.replace(/[%_,]/g, "");
      query = query.or(`email.ilike.%${safeTerm}%,message.ilike.%${safeTerm}%,type_label.ilike.%${safeTerm}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const [all, fresh, read, closed] = await Promise.all([
      getCount(supabase),
      getCount(supabase, "new"),
      getCount(supabase, "read"),
      getCount(supabase, "closed"),
    ]);

    return res.json({
      ok: true,
      messages: data || [],
      counts: { all, new: fresh, read, closed },
    });
  } catch (error) {
    console.error("Support list error:", error);
    return res.status(500).json({ error: "Impossible de charger les messages." });
  }
}
