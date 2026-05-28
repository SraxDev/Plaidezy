import { createClient } from "@supabase/supabase-js";
import { rateLimitSupabase } from "./_rateLimit.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORT_TO_EMAIL = process.env.SUPPORT_TO_EMAIL || "contactplaidezy@proton.me";
const SUPPORT_FROM_EMAIL = process.env.SUPPORT_FROM_EMAIL || "Plaidezy <onboarding@resend.dev>";

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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildSupportEmailHtml({ typeLabel, email, message, page, ip, userAgent, supportId }) {
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");
  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:#0d9488;color:#fff;padding:20px 24px;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:.8;font-weight:700;">Plaidezy Support</div>
          <h1 style="font-size:22px;margin:8px 0 0;">${escapeHtml(typeLabel)}</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 16px;color:#334155;">Un nouveau message support vient d’être envoyé depuis Plaidezy.</p>

          <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin-bottom:18px;">
            <p style="margin:0 0 8px;"><strong>Email utilisateur :</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
            <p style="margin:0 0 8px;"><strong>Sujet :</strong> ${escapeHtml(typeLabel)}</p>
            ${supportId ? `<p style="margin:0 0 8px;"><strong>ID support :</strong> #${escapeHtml(supportId)}</p>` : ""}
            ${page ? `<p style="margin:0;"><strong>Page :</strong> ${escapeHtml(page)}</p>` : ""}
          </div>

          <h2 style="font-size:16px;margin:0 0 10px;">Message</h2>
          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;line-height:1.6;color:#0f172a;background:#fff;">
            ${safeMessage}
          </div>

          <div style="margin-top:18px;color:#64748b;font-size:12px;line-height:1.6;">
            <p style="margin:0;"><strong>IP :</strong> ${escapeHtml(ip)}</p>
            <p style="margin:0;"><strong>Navigateur :</strong> ${escapeHtml(userAgent)}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function sendSupportEmail({ typeLabel, email, message, page, ip, userAgent, supportId }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY non configurée : message support stocké mais email non envoyé.");
    return { sent: false, reason: "missing_resend_key" };
  }

  const subject = `[Plaidezy Support] ${typeLabel} — ${email}`;
  const text = [
    `Nouveau message support Plaidezy`,
    ``,
    `Sujet : ${typeLabel}`,
    `Email utilisateur : ${email}`,
    supportId ? `ID support : #${supportId}` : "",
    page ? `Page : ${page}` : "",
    ``,
    `Message :`,
    message,
    ``,
    `IP : ${ip}`,
    `Navigateur : ${userAgent}`,
  ].filter(Boolean).join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: SUPPORT_FROM_EMAIL,
      to: [SUPPORT_TO_EMAIL],
      reply_to: email,
      subject,
      text,
      html: buildSupportEmailHtml({ typeLabel, email, message, page, ip, userAgent, supportId }),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Resend support email error:", data);
    throw new Error("Message enregistré, mais l’email n’a pas pu être envoyé au support.");
  }

  return { sent: true, id: data.id };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (await rateLimitSupabase(`support:${ip}`, 8, 60_000)) {
    return res.status(429).json({ error: "Trop de demandes. Réessayez dans une minute." });
  }

  const email = clean(req.body?.email, 320).toLowerCase();
  const type = clean(req.body?.type, 40) || "autre";
  const typeLabel = TYPE_LABELS[type] || TYPE_LABELS.autre;
  const message = clean(req.body?.message, 4000);
  const page = clean(req.body?.page, 500);
  const userAgent = clean(req.headers["user-agent"], 500);

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Email invalide." });
  }
  if (!message || message.length < 10) {
    return res.status(400).json({ error: "Message trop court." });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let supportId = null;

  if (SUPABASE_URL && SUPABASE_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        email,
        type,
        type_label: typeLabel,
        message,
        page,
        user_agent: userAgent,
        ip,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Support insert error:", error);
      return res.status(500).json({ error: "Impossible d’enregistrer votre message. Réessayez dans quelques instants." });
    }
    supportId = data?.id || null;
  } else {
    console.warn("Supabase non configuré pour support_messages.", { email, type, message, page });
  }

  try {
    const emailResult = await sendSupportEmail({ typeLabel, email, message, page, ip, userAgent, supportId });
    return res.json({ ok: true, emailSent: emailResult.sent, supportId });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Impossible d’envoyer l’email au support.",
      supportId,
    });
  }
}
