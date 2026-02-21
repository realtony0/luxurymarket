/**
 * Importe les produits de data/products.json vers Postgres (Neon).
 * Usage : DATABASE_URL=postgresql://... node scripts/seed-postgres.mjs
 * Ou avec .env.local chargé : node -r dotenv/config scripts/seed-postgres.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("Définir DATABASE_URL ou POSTGRES_URL");
  process.exit(1);
}

const sql = neon(url);

async function main() {
  const raw = await readFile(path.join(__dirname, "..", "data", "products.json"), "utf-8");
  const products = JSON.parse(raw);
  if (!Array.isArray(products)) {
    console.error("products.json doit être un tableau");
    process.exit(1);
  }

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      category TEXT NOT NULL,
      universe TEXT NOT NULL CHECK (universe IN ('mode', 'tout')),
      image TEXT NOT NULL,
      description TEXT NOT NULL,
      color TEXT,
      sizes JSONB
    )
  `;

  let inserted = 0;
  for (const p of products) {
    try {
      await sql`
        INSERT INTO products (id, slug, name, price, category, universe, image, description, color, sizes)
        VALUES (${p.id}, ${p.slug}, ${p.name}, ${p.price}, ${p.category}, ${p.universe}, ${p.image}, ${p.description}, ${p.color ?? null}, ${p.sizes ? JSON.stringify(p.sizes) : null})
        ON CONFLICT (id) DO NOTHING
      `;
      inserted++;
    } catch (err) {
      console.warn("Skip", p.id, p.name, err.message);
    }
  }
  console.log(`${inserted} produit(s) importé(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
