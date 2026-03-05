import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/auth-admin";
import { addProduct, getProducts } from "@/lib/products-data";
import { normalizeProductImages, type Product } from "@/lib/products";
import { normalizeColorImagesMap, normalizeColorName, parseColorList } from "@/lib/product-options";

const LIMITS = {
  maxPrice: 50_000_000,
  minNameLength: 2,
  maxNameLength: 120,
  minCategoryLength: 2,
  maxCategoryLength: 80,
  minDescriptionLength: 8,
  maxDescriptionLength: 4000,
  maxImages: 12,
  maxImageUrlLength: 2048,
  maxColors: 12,
  maxColorLength: 40,
  maxColorImagesPerColor: 8,
  maxSizes: 20,
  maxSizeLength: 20,
} as const;

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parsePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && Number.isInteger(parsed)) {
      return parsed;
    }
  }
  return null;
}

function isValidImageUrl(url: string): boolean {
  if (url.length > LIMITS.maxImageUrlLength) return false;
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeSizes(value: unknown): string[] | undefined | null {
  if (value == null) return undefined;
  if (!Array.isArray(value)) return null;

  const output: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const size = asTrimmedString(item);
    if (!size) continue;
    if (size.length > LIMITS.maxSizeLength) return null;
    const key = size.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(size);
  }

  if (output.length > LIMITS.maxSizes) return null;
  return output.length > 0 ? output : undefined;
}

function sanitizeColor(value: unknown): { color?: string; colors: string[] } | null {
  if (value == null) return { colors: [] };
  if (typeof value !== "string") return null;

  const output: string[] = [];
  const seen = new Set<string>();

  for (const item of parseColorList(value)) {
    const color = item.trim();
    if (!color) continue;
    if (color.length > LIMITS.maxColorLength) return null;
    const key = normalizeColorName(color);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(color);
  }

  if (output.length > LIMITS.maxColors) return null;
  return output.length > 0 ? { color: output.join(", "), colors: output } : { colors: [] };
}

function sanitizeColorImages(
  value: unknown,
  selectedColors: string[],
  galleryImages: string[]
): Record<string, string[]> | null {
  if (value == null) return {};

  const normalized = normalizeColorImagesMap(value);
  const keys = Object.keys(normalized);
  if (keys.length > LIMITS.maxColors) return null;

  const selectedColorKeys = new Set(selectedColors.map((color) => normalizeColorName(color)));
  if (keys.length > 0 && selectedColorKeys.size === 0) return null;
  const gallerySet = new Set(galleryImages);

  for (const key of keys) {
    if (!key.trim() || key.length > LIMITS.maxColorLength) return null;
    if (selectedColorKeys.size > 0 && !selectedColorKeys.has(normalizeColorName(key))) {
      return null;
    }

    const images = normalized[key];
    if (!Array.isArray(images) || images.length === 0) return null;
    if (images.length > LIMITS.maxColorImagesPerColor) return null;

    for (const image of images) {
      if (!isValidImageUrl(image)) return null;
      if (!gallerySet.has(image)) return null;
    }
  }

  return normalized;
}

function validateCreateInput(body: unknown): { input?: Omit<Product, "id" | "slug">; error?: string } {
  const data = asObject(body);
  if (!data) {
    return { error: "Données invalides." };
  }

  const name = asTrimmedString(data.name);
  if (!name || name.length < LIMITS.minNameLength || name.length > LIMITS.maxNameLength) {
    return { error: `Nom invalide (${LIMITS.minNameLength}-${LIMITS.maxNameLength} caractères).` };
  }

  const category = asTrimmedString(data.category);
  if (!category || category.length < LIMITS.minCategoryLength || category.length > LIMITS.maxCategoryLength) {
    return { error: `Catégorie invalide (${LIMITS.minCategoryLength}-${LIMITS.maxCategoryLength} caractères).` };
  }

  const universe = data.universe === "mode" || data.universe === "tout" ? data.universe : null;
  if (!universe) {
    return { error: "Univers invalide (mode ou tout)." };
  }

  const price = parsePrice(data.price);
  if (price == null || price < 0 || price > LIMITS.maxPrice) {
    return { error: `Prix invalide (0 à ${LIMITS.maxPrice.toLocaleString("fr-FR")} F).` };
  }

  const description = asTrimmedString(data.description);
  if (
    !description ||
    description.length < LIMITS.minDescriptionLength ||
    description.length > LIMITS.maxDescriptionLength
  ) {
    return {
      error: `Description invalide (${LIMITS.minDescriptionLength}-${LIMITS.maxDescriptionLength} caractères).`,
    };
  }

  const images = normalizeProductImages(data.images, data.image);
  if (images.length === 0) {
    return { error: "Au moins une image est requise." };
  }
  if (images.length > LIMITS.maxImages) {
    return { error: `Maximum ${LIMITS.maxImages} images par produit.` };
  }
  if (!images.every(isValidImageUrl)) {
    return { error: "Certaines URLs d'images sont invalides." };
  }

  const colorData = sanitizeColor(data.color);
  if (!colorData) {
    return { error: "Couleurs invalides." };
  }

  const colorImages = sanitizeColorImages(data.colorImages, colorData.colors, images);
  if (!colorImages) {
    return {
      error:
        "Les images par couleur sont invalides (clé couleur, URL image, ou image absente de la galerie principale).",
    };
  }

  const sizes = sanitizeSizes(data.sizes);
  if (sizes === null) {
    return { error: "Tailles invalides." };
  }

  const input: Omit<Product, "id" | "slug"> = {
    name,
    price,
    category,
    universe,
    image: images[0],
    images,
    description,
    ...(colorData.color ? { color: colorData.color } : {}),
    ...(Object.keys(colorImages).length > 0 ? { colorImages } : {}),
    ...(sizes ? { sizes } : {}),
  };

  return { input };
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const products = await getProducts();
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { input, error } = validateCreateInput(body);
  if (!input || error) {
    return NextResponse.json({ error: error || "Données invalides." }, { status: 400 });
  }

  try {
    const product = await addProduct(input);
    revalidateTag("products", "max");
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création du produit.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
