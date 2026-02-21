import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  return neon(url);
}

export async function ensureTable() {
  const sql = getSql();
  if (!sql) return;
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
}

export function getDb() {
  return getSql();
}
