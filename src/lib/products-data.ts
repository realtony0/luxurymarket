import { readFile, writeFile } from "fs/promises";
import path from "path";
import { normalizeProductImages, type Product } from "./products";
import { getDb, ensureTable } from "./db";

const DATA_PATH = path.join(process.cwd(), "data", "products.json");

type DbRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: string;
  universe: "mode" | "tout";
  image: string;
  images: unknown;
  description: string;
  color: string | null;
  sizes: string[] | null;
};

function parseDbArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToProduct(row: DbRow): Product {
  const sizes = Array.isArray(row.sizes) ? row.sizes : null;
  const images = normalizeProductImages(parseDbArray(row.images), row.image);
  const image = images[0] || row.image;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price: Number(row.price),
    category: row.category,
    universe: row.universe,
    image,
    ...(images.length > 0 && { images }),
    description: row.description,
    ...(row.color && { color: row.color }),
    ...(sizes && sizes.length > 0 && { sizes: sizes.map(String) }),
  };
}

function normalizeProduct(product: Product): Product {
  const images = normalizeProductImages(product.images, product.image);
  const image = images[0] || product.image;

  return {
    ...product,
    image,
    ...(images.length > 0 && { images }),
  };
}

async function fromFile(): Promise<Product[]> {
  try {
    const raw = await readFile(DATA_PATH, "utf-8");
    const data = JSON.parse(raw) as Product[];
    return Array.isArray(data) ? data.map(normalizeProduct) : [];
  } catch {
    return [];
  }
}

export async function getProducts(): Promise<Product[]> {
  const sql = getDb();
  if (sql) {
    await ensureTable();
    const rows = await sql`SELECT * FROM products ORDER BY id`;
    return (rows as DbRow[]).map(rowToProduct);
  }
  return fromFile();
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const sql = getDb();
  if (sql) {
    await ensureTable();
    const rows = await sql`SELECT * FROM products WHERE id = ${id}`;
    const row = (rows as DbRow[])[0];
    return row ? rowToProduct(row) : undefined;
  }
  const products = await fromFile();
  return products.find((p) => p.id === id);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const sql = getDb();
  if (sql) {
    await ensureTable();
    const rows = await sql`SELECT * FROM products WHERE slug = ${slug}`;
    const row = (rows as DbRow[])[0];
    return row ? rowToProduct(row) : undefined;
  }
  const products = await fromFile();
  return products.find((p) => p.slug === slug);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function addProduct(input: Omit<Product, "id" | "slug">): Promise<Product> {
  const normalizedImages = normalizeProductImages(input.images, input.image);
  const primaryImage = normalizedImages[0];
  if (!primaryImage) {
    throw new Error("Au moins une image produit est requise.");
  }

  const productInput: Omit<Product, "id" | "slug"> = {
    ...input,
    image: primaryImage,
    ...(normalizedImages.length > 0 && { images: normalizedImages }),
  };

  const sql = getDb();
  if (sql) {
    await ensureTable();
    const products = await getProducts();
    let slug = slugify(productInput.name);
    let suffix = 0;
    while (products.some((p) => p.slug === slug)) {
      suffix += 1;
      slug = `${slugify(productInput.name)}-${suffix}`;
    }
    const id = generateId();
    await sql`
      INSERT INTO products (id, slug, name, price, category, universe, image, images, description, color, sizes)
      VALUES (${id}, ${slug}, ${productInput.name}, ${productInput.price}, ${productInput.category}, ${productInput.universe}, ${productInput.image}, ${JSON.stringify(productInput.images)}, ${productInput.description}, ${productInput.color ?? null}, ${productInput.sizes ? JSON.stringify(productInput.sizes) : null})
    `;
    return { ...productInput, id, slug };
  }
  const products = await fromFile();
  let slug = slugify(productInput.name);
  let suffix = 0;
  while (products.some((p) => p.slug === slug)) {
    suffix += 1;
    slug = `${slugify(productInput.name)}-${suffix}`;
  }
  const product: Product = {
    ...productInput,
    id: generateId(),
    slug,
  };
  products.push(product);
  await writeFile(DATA_PATH, JSON.stringify(products, null, 2), "utf-8");
  return normalizeProduct(product);
}

export async function updateProduct(id: string, input: Partial<Omit<Product, "id">>): Promise<Product | null> {
  const sql = getDb();
  if (sql) {
    await ensureTable();
    const existing = await getProductById(id);
    if (!existing) return null;
    const updated = { ...existing, ...input };
    const normalizedImages = normalizeProductImages(updated.images, updated.image);
    updated.image = normalizedImages[0] || "";
    updated.images = normalizedImages;

    if (input.name && input.name !== existing.name) {
      updated.slug = slugify(input.name);
      const products = await getProducts();
      let suffix = 0;
      while (products.some((p) => p.id !== id && p.slug === updated.slug)) {
        suffix += 1;
        updated.slug = `${slugify(input.name)}-${suffix}`;
      }
    }
    await sql`
      UPDATE products SET
        slug = ${updated.slug},
        name = ${updated.name},
        price = ${updated.price},
        category = ${updated.category},
        universe = ${updated.universe},
        image = ${updated.image},
        images = ${JSON.stringify(updated.images)},
        description = ${updated.description},
        color = ${updated.color ?? null},
        sizes = ${updated.sizes ? JSON.stringify(updated.sizes) : null}
      WHERE id = ${id}
    `;
    return normalizeProduct(updated);
  }
  const products = await fromFile();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return null;
  const updated = { ...products[index], ...input };
  const normalizedImages = normalizeProductImages(updated.images, updated.image);
  updated.image = normalizedImages[0] || "";
  updated.images = normalizedImages;

  if (input.name && input.name !== products[index].name) {
    updated.slug = slugify(input.name);
    let suffix = 0;
    while (products.some((p) => p.id !== id && p.slug === updated.slug)) {
      suffix += 1;
      updated.slug = `${slugify(input.name)}-${suffix}`;
    }
  }
  products[index] = normalizeProduct(updated);
  await writeFile(DATA_PATH, JSON.stringify(products, null, 2), "utf-8");
  return normalizeProduct(updated);
}

export async function countProductsByCategory(category: string): Promise<number> {
  const sql = getDb();
  if (sql) {
    await ensureTable();
    const rows = await sql`SELECT COUNT(*)::int AS count FROM products WHERE category = ${category}`;
    const row = (rows as Array<{ count: number | string }>)[0];
    return Number(row?.count ?? 0);
  }
  const products = await fromFile();
  return products.filter((p) => p.category === category).length;
}

export async function replaceCategory(oldCategory: string, newCategory: string): Promise<number> {
  if (oldCategory === newCategory) return 0;

  const sql = getDb();
  if (sql) {
    await ensureTable();
    const updated = await sql`
      UPDATE products
      SET category = ${newCategory}
      WHERE category = ${oldCategory}
      RETURNING id
    `;
    return Array.isArray(updated) ? updated.length : 0;
  }

  const products = await fromFile();
  let count = 0;
  const next = products.map((p) => {
    if (p.category !== oldCategory) return p;
    count += 1;
    return { ...p, category: newCategory };
  });

  if (count > 0) {
    await writeFile(DATA_PATH, JSON.stringify(next, null, 2), "utf-8");
  }
  return count;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const sql = getDb();
  if (sql) {
    await ensureTable();
    const deleted = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`;
    return Array.isArray(deleted) && deleted.length > 0;
  }
  const products = await fromFile();
  const filtered = products.filter((p) => p.id !== id);
  if (filtered.length === products.length) return false;
  await writeFile(DATA_PATH, JSON.stringify(filtered, null, 2), "utf-8");
  return true;
}
