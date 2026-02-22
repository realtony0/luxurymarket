"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { MODE_CLOTHING_SUBCATEGORIES } from "@/lib/universe-categories";

type ClothingSubCategory = (typeof MODE_CLOTHING_SUBCATEGORIES)[number];
type ModeClothingProduct = Product & { subCategory: ClothingSubCategory | null };

type Props = {
  products: ModeClothingProduct[];
};

export default function ModeClothingSelector({ products }: Props) {
  const availableSubCategories = useMemo(
    () =>
      MODE_CLOTHING_SUBCATEGORIES.filter((subCategory) =>
        products.some((product) => product.subCategory === subCategory)
      ),
    [products]
  );
  const hasOtherClothing = products.some((product) => !product.subCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");

  const filteredProducts = useMemo(() => {
    if (selectedSubCategory === "all") return products;
    if (selectedSubCategory === "other") {
      return products.filter((product) => !product.subCategory);
    }
    return products.filter((product) => product.subCategory === selectedSubCategory);
  }, [products, selectedSubCategory]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 sm:p-4">
        <label
          htmlFor="mode-sub-category"
          className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
        >
          Sous-catégorie vêtements
        </label>
        <select
          id="mode-sub-category"
          value={selectedSubCategory}
          onChange={(e) => setSelectedSubCategory(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--foreground)]"
        >
          <option value="all">Tous les vêtements</option>
          {availableSubCategories.map((subCategory) => (
            <option key={subCategory} value={subCategory}>
              {subCategory}
            </option>
          ))}
          {hasOtherClothing && <option value="other">Autres vêtements</option>}
        </select>
      </div>

      {filteredProducts.length === 0 ? (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-6 text-center text-sm text-[var(--muted)]">
          Aucun produit pour cette sous-catégorie.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[460px]:grid-cols-2 md:gap-6 lg:grid-cols-4 lg:gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
