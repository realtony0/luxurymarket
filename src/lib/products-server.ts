import * as data from "./products-data";
import type { Product } from "./products";

export async function getProducts(): Promise<Product[]> {
  return data.getProducts();
}

export async function getProductsByUniverse(universe: "mode" | "tout"): Promise<Product[]> {
  const products = await data.getProducts();
  return products.filter((p) => p.universe === universe);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return data.getProductBySlug(slug);
}
