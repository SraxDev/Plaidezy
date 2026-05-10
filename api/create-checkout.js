import { rateLimitSupabase } from "./_rateLimit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (await rateLimitSupabase(`create-checkout:${ip}`, 20, 60_000))
    return res.status(429).json({ error: "Trop de requêtes." });

  const PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID;
  if (!PRODUCT_ID) return res.status(500).json({ error: "Gumroad non configuré." });

  const { claimId } = req.body || {};
  if (!claimId || typeof claimId !== "string" || claimId.length > 50)
    return res.status(400).json({ error: "claimId invalide." });

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  // Gumroad ajoute automatiquement ?sale_id=xxx à l'URL de redirect après achat
  const redirectUrl = `${baseUrl}/`;
  const gumroadUrl = `https://gumroad.com/l/${PRODUCT_ID}?wanted=true&redirect=${encodeURIComponent(redirectUrl)}`;

  return res.json({ gumroadUrl });
}