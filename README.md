# Outil Audit GEO — The Impacters

## Setup

### 1. Cloner et installer
```bash
git clone https://github.com/marcantoinebt-cmyk/geo-audit-app.git
cd geo-audit-app
npm install
```

### 2. Variables d'environnement
Copier `.env.local` et remplir les valeurs :
```bash
cp .env.local .env.local
```

Remplir :
- `SUPABASE_SERVICE_ROLE_KEY` — dans Supabase > Settings > API > service_role
- `ANTHROPIC_API_KEY` — dans console.anthropic.com
- `PAGESPEED_API_KEY` — dans Google Cloud Console
- `RESEND_API_KEY` — dans resend.com > API Keys

### 3. Base de données Supabase
Dans Supabase > SQL Editor, exécuter le contenu de `supabase-schema.sql`

### 4. Lancer en développement
```bash
npm run dev
```

Ouvrir http://localhost:3000/audit

### 5. Déployer sur Vercel
```bash
npx vercel
```

Puis ajouter les variables d'environnement dans Vercel Dashboard > Settings > Environment Variables.

## Architecture

```
/app/audit          → Formulaire (Étape 1 ✅)
/app/audit/loading  → Progression (Étape 1 ✅)
/app/audit/results  → Résultats interactifs (Étape 4 — à venir)
/app/api/start-audit   → Crée l'audit en BDD
/app/api/audit-status  → Polling du statut
/app/api/run-audit     → Lance l'analyse (Étape 2 — à venir)
/lib/supabase.ts    → Client BDD ✅
/lib/pagespeed.ts   → API PageSpeed (Étape 2 — à venir)
/lib/crawler.ts     → Crawl HTML (Étape 2 — à venir)
/lib/claude.ts      → Analyse IA (Étape 3 — à venir)
```

## Étapes de développement

- [x] Étape 1 — Formulaire + Supabase
- [ ] Étape 2 — Crawler HTML + PageSpeed API
- [ ] Étape 3 — Analyse Claude + scoring
- [ ] Étape 4 — Page de résultats interactive
- [ ] Étape 5 — Génération DOCX
- [ ] Étape 6 — Email automatique Resend
- [ ] Étape 7 — Polish UI + responsive
