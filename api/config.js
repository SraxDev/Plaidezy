export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const hasSumUp = !!(process.env.SUMUP_API_KEY && process.env.SUMUP_MERCHANT_CODE);
  res.json({ hasSumUp });
}
