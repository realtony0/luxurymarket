import { readFile, writeFile } from "fs/promises";
import path from "path";
import { getDb, ensureTable } from "./db";
import { countProductsByCategory, getProducts, replaceCategory } from "./products-data";
import {
  MODE_CATEGORIES,
  MODE_CLOTHING_SUBCATEGORIES,
  UNIVERSE_CATEGORIES,
} from "./universe-categories";

const CATEGORIES_PATH = path.join(process.cwd(), "data", "categories.json");

export type CategoryInfo = {
  name: string;
  count: number;
};

function normalizeCategoryName(value: string): string {
  return value.trim();
}

function uniqSorted(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr")
  );
}

function getCategoryDb() {
  return getDb();
}

async function ensureCategoriesTable() {
  const sql = getCategoryDb();
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      name TEXT PRIMARY KEY
    )
  `;
}

async function readCategoryFile(): Promise<string[]> {
  try {
    const raw = await readFile(CATEGORIES_PATH, "utf-8");
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? uniqSorted(data.map((v) => String(v))) : [];
  } catch {
    return [];
  }
}

async function writeCategoryFile(values: string[]): Promise<void> {
  await writeFile(CATEGORIES_PATH, JSON.stringify(uniqSorted(values), null, 2), "utf-8");
}

async function getRegisteredCategories(): Promise<string[]> {
  const sql = getCategoryDb();
  if (sql) {
    await ensureTable();
    await ensureCategoriesTable();
    const rows = await sql`SELECT name FROM categories ORDER BY name`;
    return uniqSorted((rows as Array<{ name: string }>).map((r) => String(r.name)));
  }
  return readCategoryFile();
}

async function removeRegisteredCategory(name: string): Promise<void> {
  const sql = getCategoryDb();
  if (sql) {
    await ensureTable();
    await ensureCategoriesTable();
    await sql`DELETE FROM categories WHERE name = ${name}`;
    return;
  }
  const current = await readCategoryFile();
  const next = current.filter((c) => c !== name);
  await writeCategoryFile(next);
}

export async function getCategories(): Promise<string[]> {
  const [registered, products] = await Promise.all([getRegisteredCategories(), getProducts()]);
  const productCategories = products.map((p) => p.category);
  return uniqSorted([
    ...registered,
    ...productCategories,
    ...MODE_CATEGORIES,
    ...MODE_CLOTHING_SUBCATEGORIES,
    ...UNIVERSE_CATEGORIES,
  ]);
}

export async function getCategoryInfos(): Promise<CategoryInfo[]> {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const counts = new Map<string, number>();

  for (const product of products) {
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  }

  return categories.map((name) => ({ name, count: counts.get(name) ?? 0 }));
}

export async function createCategory(rawName: string): Promise<{ created: boolean; name: string }> {
  const name = normalizeCategoryName(rawName);
  if (!name) throw new Error("Nom de catégorie requis.");

  const existing = await getCategories();
  if (existing.includes(name)) {
    return { created: false, name };
  }

  const sql = getCategoryDb();
  if (sql) {
    await ensureTable();
    await ensureCategoriesTable();
    await sql`INSERT INTO categories (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
    return { created: true, name };
  }

  const current = await readCategoryFile();
  current.push(name);
  await writeCategoryFile(current);
  return { created: true, name };
}

export async function deleteCategory(
  rawName: string,
  rawReplacement?: string
): Promise<{ reassigned: number }> {
  const name = normalizeCategoryName(rawName);
  const replacement = rawReplacement ? normalizeCategoryName(rawReplacement) : "";

  if (!name) throw new Error("Nom de catégorie requis.");
  if (replacement && replacement === name) {
    throw new Error("La catégorie de remplacement doit être différente.");
  }

  const usageCount = await countProductsByCategory(name);
  let reassigned = 0;

  if (usageCount > 0) {
    if (!replacement) {
      throw new Error("Cette catégorie contient des produits. Choisir une catégorie de remplacement.");
    }
    await createCategory(replacement);
    reassigned = await replaceCategory(name, replacement);
  }

  await removeRegisteredCategory(name);
  return { reassigned };
}

export async function renameCategory(
  rawName: string,
  rawNextName: string
): Promise<{ reassigned: number; merged: boolean }> {
  const name = normalizeCategoryName(rawName);
  const nextName = normalizeCategoryName(rawNextName);

  if (!name) throw new Error("Nom de catégorie requis.");
  if (!nextName) throw new Error("Nouveau nom de catégorie requis.");

  const existing = await getCategories();
  if (!existing.includes(name)) {
    throw new Error("Catégorie introuvable.");
  }
  if (name === nextName) {
    return { reassigned: 0, merged: false };
  }

  const merged = existing.includes(nextName);
  await createCategory(nextName);
  const reassigned = await replaceCategory(name, nextName);
  await removeRegisteredCategory(name);

  return { reassigned, merged };
}
