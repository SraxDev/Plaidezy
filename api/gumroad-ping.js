import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const body = req.body || {};
  const saleId = body.sale_id;
  const refunded = body.refunded === "true" || body.refunded === true;

  if (!saleId) return res.status(400).json({ error: "sale_id manquant" });

  if (refunded) {
    // Supprime le paiement si remboursé
    await supabase.from("payments").delete().eq("reference", saleId);
    return res.json({ ok: true, action: "deleted" });
  }

  await supabase
    .from("payments")
    .upsert({ reference: saleId, checkout_id: saleId }, { onConflict: "reference" });

  return res.json({ ok: true });
}