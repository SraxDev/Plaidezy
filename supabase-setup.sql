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
