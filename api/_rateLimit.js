/**
 * Rate limiter persistant via Supabase.
 * Remplace le Map() en mémoire qui se reset à chaque cold start Vercel.
 *
 * Table SQL à créer :
 *   CREATE TABLE IF NOT EXISTS rate_limits (
 *     key TEXT PRIMARY KEY,
 *     count INT NOT NULL DEFAULT 1,
 *     reset_at TIMESTAMPTZ NOT NULL
 *   );
 */
import { createClient } from "@supabase/supabase-js";

export async function rateLimitSupabase(key, max, windowMs = 60_000) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs).toISOString();

  // 1. Lire la ligne existante
  const { data, error } = await supabase
    .from("rate_limits")
    .select("count, reset_at")
    .eq("key", key)
    .maybeSingle();

  // Fallback : on laisse passer en cas d'erreur DB (fail open)
  if (error) return false;

  // 2. Première requête ou fenêtre expirée → reset
  if (!data || new Date(data.reset_at) < now) {
    await supabase
      .from("rate_limits")
      .upsert({ key, count: 1, reset_at: resetAt });
    return false;
  }

  // 3. Fenêtre active → incrémenter
  const newCount = data.count + 1;
  await supabase
    .from("rate_limits")
    .update({ count: newCount })
    .eq("key", key);

  return newCount > max;
}