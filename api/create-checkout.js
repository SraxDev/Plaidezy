import { rateLimitSupabase } from "./_rateLimit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (await rateLimitSupabase(`create-checkout:${ip}`, 20, 60_000))
    return res.status(429).json({ error: "Trop de requêtes." });

  const SUMUP_KEY = process.env.SUMUP_API_KEY;
  const SUMUP_MERCHANT = process.env.SUMUP_MERCHANT_CODE;

  if (!SUMUP_KEY || !SUMUP_MERCHANT)
    return res.status(500).json({ error: "SumUp non configuré." });

  const { claimId } = req.body || {};
  if (!claimId || typeof claimId !== "string" || claimId.length > 50)
    return res.status(400).json({ error: "claimId invalide." });

  const ref = `plaidezy_${claimId.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}`;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  try {
    const response = await fetch("https://api.sumup.com/v0.1/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUMUP_KEY}`,
      },
      body: JSON.stringify({
        amount: 9.0,
        checkout_reference: ref,
        currency: "EUR",
        description: "Plaidezy — Lettre de réclamation personnalisée",
        merchant_code: SUMUP_MERCHANT,
        redirect_url: `${baseUrl}/?payment_success=${ref}`,
        hosted_checkout: { enabled: true },
      }),
    });

    const data = await response.json();
    if (!response.ok)
      return res.status(response.status).json({ error: data.message || "Erreur SumUp" });

    if (!data.hosted_checkout_url)
      return res.status(500).json({ error: "SumUp n'a pas retourné l'URL de paiement. Vérifiez que le Hosted Checkout est activé sur votre compte marchand." });

    return res.json({
      checkoutId: data.id,
      checkoutReference: ref,
      hostedCheckoutUrl: data.hosted_checkout_url,
    });
  } catch (err) {
    console.error("SumUp create-checkout error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}