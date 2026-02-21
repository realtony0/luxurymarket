-- Exécuter une fois dans le SQL Editor Neon (ou via psql)
-- Crée la table products pour Luxury Market

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
);

-- Index pour les recherches par slug et univers
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_universe ON products(universe);
