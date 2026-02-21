# Base de données Postgres (Neon)

## Comportement

- **Sans `DATABASE_URL`** : les produits sont lus/écrits dans `data/products.json` (comportement actuel).
- **Avec `DATABASE_URL`** (ou `POSTGRES_URL`) : les produits sont stockés dans Postgres. La table est créée automatiquement au premier usage.

## Configurer Neon avec Vercel

1. Déploie le projet sur Vercel (depuis GitHub).
2. Dans le projet Vercel : **Storage** (ou **Integrations**) → **Marketplace** → cherche **Neon** → **Add**.
3. Crée une base Neon (ou connecte une existante). Vercel injectera une variable du type `POSTGRES_URL` ou `DATABASE_URL`.
4. Dans **Settings → Environment Variables**, vérifie que `DATABASE_URL` (ou `POSTGRES_URL`) est bien définie.
5. Optionnel : exécute une fois le script `scripts/init-db.sql` dans le **SQL Editor** du dashboard Neon pour créer la table et les index à la main (sinon la table est créée automatiquement).

## En local

1. Crée une base sur [console.neon.tech](https://console.neon.tech).
2. Copie l’URL de connexion (format `postgresql://...?sslmode=require`).
3. Dans `luxury-market/`, crée un fichier `.env.local` et ajoute :
   ```
   DATABASE_URL=postgresql://user:password@host.neon.tech/neondb?sslmode=require
   ```
4. Redémarre `npm run dev`. Les produits seront lus/écrits dans Neon.

## Premier remplissage (importer les produits du JSON)

Pour copier les produits de `data/products.json` vers Postgres :

```bash
cd luxury-market
DATABASE_URL="postgresql://..." node scripts/seed-postgres.mjs
```

(Remplace par ta vraie URL Neon. Si tu utilises `.env.local`, tu peux faire `export $(cat .env.local | xargs)` puis lancer la commande.)
