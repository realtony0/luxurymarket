import { unstable_cache } from "next/cache";
import * as data from "./products-data";
import type { Product } from "./products";

const PRODUCTS_REVALIDATE_SECONDS = 3600;

const getProductsCached = unstable_cache(async (): Promise<Product[]> => {
  return data.getProducts();
}, ["products:all"], { revalidate: PRODUCTS_REVALIDATE_SECONDS, tags: ["products"] });

export async function getProducts(): Promise<Product[]> {
  return getProductsCached();
}

export async function getProductsByUniverse(universe: "mode" | "tout"): Promise<Product[]> {
  const products = await getProductsCached();
  return products.filter((p) => p.universe === universe);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getProductsCached();
  return products.find((product) => product.slug === slug);
}
