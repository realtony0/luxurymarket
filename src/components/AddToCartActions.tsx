"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/products";
import { useCart } from "@/components/cart/CartProvider";

type Props = {
  product: Pick<
    Product,
    "id" | "slug" | "name" | "price" | "image" | "universe" | "category"
  >;
  backHref: string;
};

export default function AddToCartActions({ product, backHref }: Props) {
  const { addItem } = useCart();
  const timeoutRef = useRef<number | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  function handleAddToCart() {
    addItem(product, 1);
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
    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={handleAddToCart}
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
  );
}
