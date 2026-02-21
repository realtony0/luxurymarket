import { unstable_cache } from "next/cache";
import * as data from "./products-data";
import type { Product } from "./products";

const getProductsCached = unstable_cache(async (): Promise<Product[]> => {
  return data.getProducts();
}, ["products:all"], { revalidate: 120, tags: ["products"] });

const getProductBySlugCached = unstable_cache(
  async (slug: string): Promise<Product | undefined> => {
    return data.getProductBySlug(slug);
  },
  ["products:by-slug"],
  { revalidate: 120, tags: ["products"] }
);

export async function getProducts(): Promise<Product[]> {
  return getProductsCached();
}

export async function getProductsByUniverse(universe: "mode" | "tout"): Promise<Product[]> {
  const products = await getProductsCached();
  return products.filter((p) => p.universe === universe);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return getProductBySlugCached(slug);
}
