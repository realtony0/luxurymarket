export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: string;
  universe: "mode" | "tout";
  image: string;
  images?: string[];
  color?: string;
  colorImages?: Record<string, string[]>;
  sizes?: string[];
  description: string;
};

function toImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeProductImages(images: unknown, fallbackImage?: unknown): string[] {
  const fromArray = Array.isArray(images)
    ? images
        .map((item) => toImageUrl(item))
        .filter((item): item is string => Boolean(item))
    : [];
  const fallback = toImageUrl(fallbackImage);

  const merged = fallback ? [fallback, ...fromArray] : fromArray;
  return Array.from(new Set(merged));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "decimal" }).format(price) + " F";
}
