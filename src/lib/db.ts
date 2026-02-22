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
        images JSONB,
        description TEXT NOT NULL,
        color TEXT,
        color_images JSONB,
        sizes JSONB
      )
    `;

    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS color_images JSONB`;

    await sql`
      UPDATE products
      SET images = jsonb_build_array(image)
      WHERE images IS NULL
         OR jsonb_typeof(images) <> 'array'
         OR (jsonb_typeof(images) = 'array' AND jsonb_array_length(images) = 0)
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
