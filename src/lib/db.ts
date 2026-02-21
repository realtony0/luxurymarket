import { neon } from "@neondatabase/serverless";

function normalizeDatabaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;

  let value = raw.trim();
  if (!value) return null;

  // Support pasting Neon CLI snippets like: psql 'postgresql://...'
  value = value.replace(/^psql\s+/i, "").trim();
  value = value.replace(/^['"]|['"]$/g, "").trim();

  const match = value.match(/postgres(?:ql)?:\/\/[^\s'"]+/i);
  if (match?.[0]) {
    value = match[0];
  }

  try {
    const parsed = new URL(value);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function getSql() {
  const url = normalizeDatabaseUrl(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  if (!url) return null;
  return neon(url);
}

let ensureTablePromise: Promise<void> | null = null;

export async function ensureTable() {
  if (ensureTablePromise) {
    await ensureTablePromise;
    return;
  }

  const sql = getSql();
  if (!sql) return;

  ensureTablePromise = (async () => {
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
  })();

  try {
    await ensureTablePromise;
  } catch (error) {
    ensureTablePromise = null;
    throw error;
  }
}

export function getDb() {
  return getSql();
}
