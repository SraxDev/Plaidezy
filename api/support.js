import { createClient } from "@supabase/supabase-js";
import { rateLimitSupabase } from "./_rateLimit.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPE_LABELS = {
  paiement: "Problème de paiement",
  lettre: "Problème avec ma lettre",
  remboursement: "Demande de remboursement",
  autre: "Autre demande",
};

function clean(value, max = 4000) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (await rateLimitSupabase(`support:${ip}`, 8, 60_000)) {
    return res.status(429).json({ error: "Trop de demandes. Réessayez dans une minute." });
  }

  const email = clean(req.body?.email, 320).toLowerCase();
  const type = clean(req.body?.type, 40) || "autre";
  const message = clean(req.body?.message, 4000);
  const page = clean(req.body?.page, 500);

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Email invalide." });
  }
  if (!message || message.length < 10) {
    return res.status(400).json({ error: "Message trop court." });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("Support message without Supabase:", { email, type, message, page });
    return res.json({ ok: true });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { error } = await supabase
    .from("support_messages")
    .insert({
      email,
      type,
      type_label: TYPE_LABELS[type] || TYPE_LABELS.autre,
      message,
      page,
      user_agent: clean(req.headers["user-agent"], 500),
      ip,
    });

  if (error) {
    console.error("Support insert error:", error);
    return res.status(500).json({ error: "Impossible d’envoyer votre message. Réessayez dans quelques instants." });
  }

  return res.json({ ok: true });
}
