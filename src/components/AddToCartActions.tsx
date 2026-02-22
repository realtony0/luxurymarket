"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/products";
import { useCart } from "@/components/cart/CartProvider";
import { colorToSwatch, parseColorList } from "@/lib/product-options";

type Props = {
  product: Pick<
    Product,
    "id" | "slug" | "name" | "price" | "image" | "universe" | "category" | "color" | "sizes"
  >;
  backHref: string;
};

export default function AddToCartActions({ product, backHref }: Props) {
  const { addItem } = useCart();
  const timeoutRef = useRef<number | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const colorOptions = useMemo(() => parseColorList(product.color), [product.color]);
  const sizeOptions = useMemo(() => product.sizes || [], [product.sizes]);
  const [selectedColor, setSelectedColor] = useState(() => colorOptions[0] || "");
  const [selectedSize, setSelectedSize] = useState(() => sizeOptions[0] || "");

  function handleAddToCart() {
    if (sizeOptions.length > 0 && !selectedSize) return;
    addItem(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.image,
        universe: product.universe,
        category: product.category,
      },
      1,
      {
        color: selectedColor || undefined,
        size: selectedSize || undefined,
      }
    );
    setJustAdded(true);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setJustAdded(false);
      timeoutRef.current = null;
    }, 1800);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="mt-10">
      {colorOptions.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Couleur
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {colorOptions.map((color) => {
              const isSelected = color === selectedColor;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-black/15"
                    style={{ backgroundColor: colorToSwatch(color) }}
                    aria-hidden
                  />
                  {color}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sizeOptions.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Taille
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizeOptions.map((size) => {
              const isSelected = size === selectedSize;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`inline-flex min-w-12 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={sizeOptions.length > 0 && !selectedSize}
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[var(--foreground)] px-6 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-auto sm:w-auto sm:min-w-52 sm:px-8 sm:py-4"
      >
        {justAdded ? "Ajouté au panier" : "Ajouter au panier"}
      </button>
      <Link
        href={backHref}
        className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-6 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-auto sm:w-auto sm:min-w-52 sm:px-8 sm:py-4"
      >
        Continuer mes achats
      </Link>
      </div>
    </div>
  );
}
