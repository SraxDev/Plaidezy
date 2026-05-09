-- ============================================================
-- Plaidezy — Script SQL Supabase
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- Table newsletter
CREATE TABLE IF NOT EXISTS newsletter (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table payments (paiements SumUp vérifiés)
CREATE TABLE IF NOT EXISTS payments (
  id          BIGSERIAL PRIMARY KEY,
  reference   TEXT NOT NULL UNIQUE,
  checkout_id TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour accélérer les lookups par référence
CREATE INDEX IF NOT EXISTS payments_reference_idx ON payments (reference);

-- ============================================================
-- Sécurité : Row Level Security
-- Les tables sont accédées UNIQUEMENT via la service_role key
-- côté serveur (API Vercel). On désactive le RLS public.
-- ============================================================

ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments   ENABLE ROW LEVEL SECURITY;

-- Aucune policy publique → seule la service_role key a accès
-- (c'est ce que tu utilises dans SUPABASE_SERVICE_ROLE_KEY)

-- ============================================================
-- Migration : Ajout colonne `used` pour éviter la réutilisation
-- d'une référence de paiement pour générer plusieurs lettres
-- ============================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS payments_used_idx ON payments (used);

-- ============================================================
-- Rate limiting persistant (remplace le Map() en mémoire)
-- Nécessaire car Vercel serverless reset la mémoire entre cold starts
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  key      TEXT PRIMARY KEY,
  count    INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);