"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/products";
import { useCart } from "@/components/cart/CartProvider";
import { colorToSwatch, parseColorList } from "@/lib/product-options";

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const ref = useRef<HTMLElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const colorOptions = parseColorList(product.color);
  const primaryColor = colorOptions[0];
  const primaryImage = product.images?.[0] || product.image;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { threshold: 0.1, rootMargin: "0px 0px 40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleQuickAdd() {
    addItem(product);
    setAdded(true);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setAdded(false);
      timeoutRef.current = null;
    }, 1500);
  }

  return (
    <article
      ref={ref}
      className={`transition-all duration-500 ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
      style={visible ? { transitionDelay: `${Math.min(index * 50, 300)}ms` } : undefined}
    >
      <Link href={`/products/${product.slug}`} className="group block">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-2xl">
          <div className="relative aspect-square overflow-hidden bg-[var(--muted)]/10">
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              className="object-cover transition duration-700 group-hover:scale-110"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/0 transition-all duration-500 group-hover:bg-black/20" />
            <div className="absolute bottom-3 left-3 right-3 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <span className="flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--foreground)]">
                Voir le produit
              </span>
            </div>
          </div>

          <div className="p-4">
            {primaryColor && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] sm:text-[10px] sm:tracking-[0.16em]">
                <span
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ backgroundColor: colorToSwatch(primaryColor) }}
                  aria-hidden
                />
                {primaryColor}
                {colorOptions.length > 1 ? ` +${colorOptions.length - 1}` : ""}
              </span>
            )}
            <h3 className="mt-2 line-clamp-2 text-sm font-bold text-[var(--foreground)] transition group-hover:text-[var(--accent)] sm:text-base">
              {product.name}
            </h3>
            <p className="mt-2.5 text-base font-black text-[var(--foreground)] sm:mt-3 sm:text-lg">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={handleQuickAdd}
        className="mt-2.5 inline-flex h-11 w-full items-center justify-center rounded-xl border border-[var(--border)] bg-white px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] sm:mt-3 sm:text-xs"
      >
        {added ? "Ajouté au panier" : "Ajouter"}
      </button>
    </article>
  );
}
