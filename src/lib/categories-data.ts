import { readFile, writeFile } from "fs/promises";
import path from "path";
import { getDb, ensureTable } from "./db";
import { countProductsByCategory, getProducts, replaceCategory } from "./products-data";
import {
  MODE_CATEGORIES,
  UNIVERSE_CATEGORIES,
} from "./universe-categories";

const CATEGORIES_PATH = path.join(process.cwd(), "data", "categories.json");
const MODE_SUBCATEGORIES_PATH = path.join(process.cwd(), "data", "mode-subcategories.json");

export type CategoryInfo = {
  name: string;
  count: number;
};

export type ModeSubcategoryInfo = {
  name: string;
  count: number;
};

function normalizeCategoryName(value: string): string {
  return value.trim();
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function uniqSorted(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr")
  );
}

function isModeTopCategory(name: string): boolean {
  const key = normalizeKey(name);
  return MODE_CATEGORIES.some((category) => normalizeKey(category) === key);
}

function deriveModeSubcategoryFromCategory(rawCategory: string): string | null {
  const category = normalizeCategoryName(rawCategory);
  if (!category || isModeTopCategory(category)) return null;
  return category;
}

function collectModeSubcategoriesFromProducts(
  products: Array<{ universe: string; category: string }>
): string[] {
  const values: string[] = [];
  for (const product of products) {
    if (product.universe !== "mode") continue;
    const subcategory = deriveModeSubcategoryFromCategory(product.category);
    if (subcategory) values.push(subcategory);
  }
  return uniqSorted(values);
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

async function ensureModeSubcategoriesTable() {
  const sql = getCategoryDb();
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS mode_subcategories (
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

async function readModeSubcategoryFile(): Promise<string[]> {
  try {
    const raw = await readFile(MODE_SUBCATEGORIES_PATH, "utf-8");
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? uniqSorted(data.map((v) => String(v))) : [];
  } catch {
    return [];
  }
}

async function writeModeSubcategoryFile(values: string[]): Promise<void> {
  await writeFile(MODE_SUBCATEGORIES_PATH, JSON.stringify(uniqSorted(values), null, 2), "utf-8");
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

async function getRegisteredModeSubcategories(): Promise<string[]> {
  const sql = getCategoryDb();
  if (sql) {
    await ensureTable();
    try {
      const rows = await sql`SELECT name FROM mode_subcategories ORDER BY name`;
      return uniqSorted((rows as Array<{ name: string }>).map((r) => String(r.name)));
    } catch (err) {
      if (
        typeof err === "object" &&
        err &&
        "code" in err &&
        String((err as { code?: unknown }).code) === "42P01"
      ) {
        return [];
      }
      throw err;
    }
  }
  return readModeSubcategoryFile();
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

async function removeRegisteredModeSubcategory(name: string): Promise<void> {
  const sql = getCategoryDb();
  if (sql) {
    await ensureTable();
    try {
      await sql`DELETE FROM mode_subcategories WHERE name = ${name}`;
    } catch (err) {
      if (
        typeof err === "object" &&
        err &&
        "code" in err &&
        String((err as { code?: unknown }).code) === "42P01"
      ) {
        return;
      }
      throw err;
    }
    return;
  }
  const current = await readModeSubcategoryFile();
  const next = current.filter((c) => c !== name);
  await writeModeSubcategoryFile(next);
}

export async function getModeSubcategories(): Promise<string[]> {
  const [registered, products] = await Promise.all([getRegisteredModeSubcategories(), getProducts()]);
  const productSubcategories = collectModeSubcategoriesFromProducts(products);
  return uniqSorted([...registered, ...productSubcategories]);
}

export async function getCategories(): Promise<string[]> {
  const [registered, products, modeSubcategories] = await Promise.all([
    getRegisteredCategories(),
    getProducts(),
    getModeSubcategories(),
  ]);
  const productCategories = products.map((p) => p.category);
  return uniqSorted([
    ...registered,
    ...productCategories,
    ...MODE_CATEGORIES,
    ...modeSubcategories,
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

export async function getModeSubcategoryInfos(): Promise<ModeSubcategoryInfo[]> {
  const [subcategories, products] = await Promise.all([getModeSubcategories(), getProducts()]);
  const counts = new Map<string, number>();

  for (const product of products) {
    if (product.universe !== "mode") continue;
    const subcategory = deriveModeSubcategoryFromCategory(product.category);
    if (!subcategory) continue;
    counts.set(subcategory, (counts.get(subcategory) ?? 0) + 1);
  }

  return subcategories.map((name) => ({ name, count: counts.get(name) ?? 0 }));
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

export async function createModeSubcategory(
  rawName: string
): Promise<{ created: boolean; name: string }> {
  const name = normalizeCategoryName(rawName);
  if (!name) throw new Error("Nom de sous-catégorie requis.");
  if (isModeTopCategory(name)) {
    throw new Error("Cette valeur existe deja comme categorie principale Mode.");
  }

  const existing = await getModeSubcategories();
  if (existing.includes(name)) {
    return { created: false, name };
  }

  const sql = getCategoryDb();
  if (sql) {
    await ensureTable();
    await ensureModeSubcategoriesTable();
    await sql`INSERT INTO mode_subcategories (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
    return { created: true, name };
  }

  const current = await readModeSubcategoryFile();
  current.push(name);
  await writeModeSubcategoryFile(current);
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

export async function deleteModeSubcategory(
  rawName: string,
  rawReplacement?: string
): Promise<{ reassigned: number }> {
  const name = normalizeCategoryName(rawName);
  const replacement = rawReplacement ? normalizeCategoryName(rawReplacement) : "";

  if (!name) throw new Error("Nom de sous-catégorie requis.");
  if (replacement && replacement === name) {
    throw new Error("La sous-categorie de remplacement doit etre differente.");
  }

  const existing = await getModeSubcategories();
  if (!existing.includes(name)) {
    throw new Error("Sous-categorie introuvable.");
  }

  const usageCount = await countProductsByCategory(name);
  let reassigned = 0;

  if (usageCount > 0) {
    const fallbackCategory = replacement || "Vêtements";
    if (!isModeTopCategory(fallbackCategory)) {
      await createModeSubcategory(fallbackCategory);
    }
    reassigned = await replaceCategory(name, fallbackCategory);
  }

  await removeRegisteredModeSubcategory(name);
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

export async function renameModeSubcategory(
  rawName: string,
  rawNextName: string
): Promise<{ reassigned: number; merged: boolean }> {
  const name = normalizeCategoryName(rawName);
  const nextName = normalizeCategoryName(rawNextName);

  if (!name) throw new Error("Nom de sous-categorie requis.");
  if (!nextName) throw new Error("Nouveau nom de sous-categorie requis.");
  if (isModeTopCategory(nextName)) {
    throw new Error("Ce nom correspond deja a une categorie principale Mode.");
  }

  const existing = await getModeSubcategories();
  if (!existing.includes(name)) {
    throw new Error("Sous-categorie introuvable.");
  }
  if (name === nextName) {
    return { reassigned: 0, merged: false };
  }

  const merged = existing.includes(nextName);
  await createModeSubcategory(nextName);
  const reassigned = await replaceCategory(name, nextName);
  await removeRegisteredModeSubcategory(name);

  return { reassigned, merged };
}
