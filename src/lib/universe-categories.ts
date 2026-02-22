export const UNIVERSE_CATEGORIES = [
  "Electronique",
  "Electromenager",
  "Accessoires maison",
  "Accessoires & divers",
] as const;

export const MODE_CATEGORIES = [
  "Vêtements",
  "Chaussures",
  "Maroquinerie",
  "Accessoires",
  "V/women",
  "Mode femme",
] as const;

export const MODE_CLOTHING_SUBCATEGORIES = [
  "Tshirt",
  "Pantalon",
  "Chemise",
  "Lacoste",
  "Set",
  "Pull",
] as const;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

type ModeClothingSubcategory = (typeof MODE_CLOTHING_SUBCATEGORIES)[number];

function detectModeClothingSubcategory(rawCategory: string): ModeClothingSubcategory | null {
  const category = normalize(rawCategory);

  if (
    category.includes("tshirt") ||
    category.includes("t-shirt") ||
    category.includes("t shirt") ||
    category.includes("tee shirt") ||
    category.includes("tee-shirt")
  ) {
    return "Tshirt";
  }

  if (category.includes("pantalon") || category.includes("jean")) {
    return "Pantalon";
  }

  if (category.includes("chemise")) {
    return "Chemise";
  }

  if (category.includes("lacoste") || category.includes("polo")) {
    return "Lacoste";
  }

  if (category.includes("set") || category.includes("ensemble")) {
    return "Set";
  }

  if (
    category.includes("pull") ||
    category.includes("sweat") ||
    category.includes("hoodie") ||
    category.includes("sweatshirt")
  ) {
    return "Pull";
  }

  return null;
}

export function mapUniverseCategory(rawCategory: string): (typeof UNIVERSE_CATEGORIES)[number] {
  const category = normalize(rawCategory);

  if (category.includes("electromenager") || category.includes("electro menager")) {
    return "Electromenager";
  }

  if (category.includes("luminaire") || category.includes("electronique")) {
    return "Electronique";
  }

  if (
    category.includes("decoration") ||
    category.includes("cuisine") ||
    category.includes("accessoire maison")
  ) {
    return "Accessoires maison";
  }

  return "Accessoires & divers";
}

export function mapModeCategory(rawCategory: string): (typeof MODE_CATEGORIES)[number] {
  const category = normalize(rawCategory);
  const clothingSubcategory = detectModeClothingSubcategory(rawCategory);

  if (clothingSubcategory) return "Vêtements";

  if (category.includes("vetement")) {
    return "Vêtements";
  }

  if (
    category.includes("v/women") ||
    category.includes("v women") ||
    category.includes("v-women") ||
    category.includes("vwomen")
  ) {
    return "V/women";
  }

  if (category.includes("chaussure")) {
    return "Chaussures";
  }

  if (category.includes("maroquinerie")) {
    return "Maroquinerie";
  }

  if (category.includes("mode femme") || category.includes("modd femme")) {
    return "Mode femme";
  }

  return "Accessoires";
}

export function mapModeSubcategory(rawCategory: string): ModeClothingSubcategory | null {
  return detectModeClothingSubcategory(rawCategory);
}

export function matchModeSubcategory(
  rawCategory: string,
  subcategories: readonly string[] = []
): string | null {
  const category = normalize(rawCategory);
  const directMatch = subcategories.find((subcategory) => normalize(subcategory) === category);
  if (directMatch) return directMatch;
  return detectModeClothingSubcategory(rawCategory);
}

export function resolveModeDisplayCategory(
  rawCategory: string,
  subcategories: readonly string[] = []
): { category: (typeof MODE_CATEGORIES)[number]; subCategory: string | null } {
  const subCategory = matchModeSubcategory(rawCategory, subcategories);
  if (subCategory) {
    return { category: "Vêtements", subCategory };
  }
  return { category: mapModeCategory(rawCategory), subCategory: null };
}

export function normalizeModeCategoryInput(rawCategory: string): string {
  const category = normalize(rawCategory);
  const clothingSubcategory = detectModeClothingSubcategory(rawCategory);
  if (clothingSubcategory) return clothingSubcategory;

  if (category.includes("vetement")) return "Vêtements";
  if (category.includes("chaussure")) return "Chaussures";
  if (category.includes("maroquinerie")) return "Maroquinerie";
  if (category.includes("mode femme") || category.includes("modd femme")) return "Mode femme";
  if (
    category.includes("v/women") ||
    category.includes("v women") ||
    category.includes("v-women") ||
    category.includes("vwomen")
  ) {
    return "V/women";
  }

  return rawCategory.trim();
}
