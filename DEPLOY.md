# Plaidezy — Guide de déploiement Vercel + Supabase

## 1. Supabase (base de données)

1. Crée un projet sur https://supabase.com
2. Va dans **SQL Editor** et exécute le contenu de `supabase-setup.sql`
3. Va dans **Settings > API** et note :
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key (secret) → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ Utilise la clé `service_role`, pas la `anon` key.

---

## 2. Vercel

### Déploiement

Connecte ton repo GitHub sur https://vercel.com/new — Vercel détecte Vite automatiquement.  
Ou en CLI :
```bash
npm install -g vercel
vercel --prod
```

### Variables d'environnement (Vercel Dashboard > Settings > Env Variables)

| Variable | Valeur |
|----------|--------|
| `GEMINI_API_KEY` | Ta clé Gemini |
| `SUMUP_API_KEY` | Ta clé SumUp |
| `SUMUP_MERCHANT_CODE` | Ton merchant code SumUp |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | La clé service_role Supabase |
| `NEXT_PUBLIC_SITE_URL` | `https://plaidezy.com` |

---

## 3. Dev local

```bash
npm install
npm install -g vercel
cp .env.example .env.local
# Remplis .env.local
vercel dev   # démarre sur http://localhost:3000
```

---

## 4. Structure

```
plaidezy/
├── api/                    # Serverless functions Vercel
│   ├── config.js
│   ├── newsletter.js
│   ├── create-checkout.js
│   ├── verify-payment.js
│   └── generate-letter.js
├── src/                    # Frontend React/Vite
├── vercel.json
├── supabase-setup.sql      # À exécuter une fois dans Supabase
└── .env.example
```

---

## 5. Domaine custom

Vercel Dashboard > **Domains** > ajoute `plaidezy.com`  
DNS chez ton registrar :
- `A` → `76.76.21.21`
- `CNAME www` → `cname.vercel-dns.com`

HTTPS automatique.
