import { createClient } from "@supabase/supabase-js";
import { rateLimitSupabase } from "./_rateLimit.js";

const VALID_STATUSES = ["new", "read", "closed"];
const VALID_PRIORITIES = ["low", "normal", "high", "urgent"];

function checkPassword(password) {
  const expected = process.env.SUPPORT_ADMIN_PASSWORD;
  return !!expected && typeof password === "string" && password === expected;
}

function clean(value, max = 4000) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function isMissingColumnError(error) {
  const msg = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return msg.includes("column") && (msg.includes("priority") || msg.includes("admin_note") || msg.includes("updated_at"));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (await rateLimitSupabase(`support-admin-update:${ip}`, 40, 60_000)) {
    return res.status(429).json({ error: "Trop de requêtes." });
  }

  const { password, id, status, priority, adminNote } = req.body || {};

  if (!process.env.SUPPORT_ADMIN_PASSWORD) {
    return res.status(503).json({ error: "Interface admin non configurée." });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: "Supabase non configuré pour l’espace support." });
  }
  if (!checkPassword(password)) return res.status(401).json({ error: "Mot de passe invalide." });

  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return res.status(400).json({ error: "Message invalide." });
  }

  const update = {};
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: "Statut invalide." });
    update.status = status;
  }
  if (priority !== undefined) {
    if (!VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: "Priorité invalide." });
    update.priority = priority;
  }
  if (adminNote !== undefined) update.admin_note = clean(adminNote, 2000);

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: "Aucune modification demandée." });
  }

  const updateWithTimestamp = { ...update, updated_at: new Date().toISOString() };
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let result = await supabase
    .from("support_messages")
    .update(updateWithTimestamp)
    .eq("id", numericId)
    .select("id,status,priority,admin_note")
    .maybeSingle();

  if (result.error && isMissingColumnError(result.error)) {
    const statusOnly = update.status ? { status: update.status } : null;
    if (!statusOnly) {
      return res.status(400).json({ error: "Migration Supabase manquante : ajoutez priority/admin_note/updated_at à support_messages." });
    }
    result = await supabase
      .from("support_messages")
      .update(statusOnly)
      .eq("id", numericId)
      .select("id,status")
      .maybeSingle();
  }

  if (result.error) {
    console.error("Support update error:", result.error);
    return res.status(500).json({ error: "Impossible de mettre à jour le message." });
  }

  if (!result.data) {
    return res.status(404).json({ error: "Message introuvable." });
  }

  return res.json({ ok: true, message: result.data });
}
