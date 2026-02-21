export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: string;
  universe: "mode" | "tout";
  image: string;
  color?: string;
  sizes?: string[];
  description: string;
};

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "decimal" }).format(price) + " F";
}
