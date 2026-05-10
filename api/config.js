export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const hasGumroad = !!process.env.GUMROAD_PRODUCT_ID;
  res.json({ hasGumroad });
}