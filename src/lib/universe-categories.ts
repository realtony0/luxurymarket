export const UNIVERSE_CATEGORIES = [
  "Electronique",
  "Electromenager",
  "Accessoires maison",
  "Accessoires & divers",
] as const;

export const MODE_CATEGORIES = [
  "Vêtements",
  "V/women",
  "Tshirt",
  "Pantalon",
  "Chemise",
  "Lacoste",
  "Set",
  "Pull",
  "Chaussures",
  "Maroquinerie",
  "Accessoires",
  "Mode femme",
] as const;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
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

  if (
    category.includes("v/women") ||
    category.includes("v women") ||
    category.includes("v-women") ||
    category.includes("vwomen")
  ) {
    return "V/women";
  }

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

  if (category.includes("vetement")) {
    return "Vêtements";
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
