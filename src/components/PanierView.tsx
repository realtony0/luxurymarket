"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice } from "@/lib/products";
import { colorToSwatch } from "@/lib/product-options";

export default function PanierView() {
  const { items, hydrated, itemCount, subtotal, updateQuantity, removeItem, clearCart } = useCart();

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">Panier</h1>
        <p className="mt-2 text-[var(--muted)]">Chargement du panier...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">Panier</h1>
        <p className="mt-2 text-[var(--muted)]">Votre panier est vide.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          <Link
            href="/mode"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--foreground)] px-6 text-sm font-semibold text-[var(--background)] transition hover:opacity-90 sm:h-auto sm:w-auto sm:py-3"
          >
            Voir la boutique Mode
          </Link>
          <Link
            href="/univers"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-[var(--border)] px-6 text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)] sm:h-auto sm:w-auto sm:py-3"
          >
            Voir la boutique Univers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">Panier</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {itemCount} article{itemCount > 1 ? "s" : ""} dans votre sélection
          </p>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="h-10 w-full rounded-lg border border-[var(--border)] px-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] sm:h-auto sm:w-auto sm:py-2"
        >
          Vider le panier
        </button>
      </div>

      <div className="mt-7 grid gap-6 lg:mt-8 lg:grid-cols-[1.5fr_0.8fr] lg:gap-8">
        <section className="space-y-4">
          {items.map((item) => (
            <article
              key={item.lineId}
              className="grid grid-cols-[84px_1fr] gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-sm sm:grid-cols-[96px_1fr_auto] sm:items-center sm:gap-4 sm:p-4"
            >
              <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-[var(--muted)]/10 sm:h-24 sm:w-24">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--muted)] sm:text-xs sm:tracking-[0.14em]">
                  {item.category}
                </p>
                <Link
                  href={`/products/${item.slug}`}
                  className="mt-1 block truncate text-base font-semibold text-[var(--foreground)] hover:text-[var(--accent)] sm:text-lg"
                >
                  {item.name}
                </Link>
                <p className="mt-1 text-sm text-[var(--muted)]">{formatPrice(item.price)}</p>
                {(item.color || item.size) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.color && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/15"
                          style={{ backgroundColor: colorToSwatch(item.color) }}
                          aria-hidden
                        />
                        {item.color}
                      </span>
                    )}
                    {item.size && (
                      <span className="inline-flex items-center rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                        Taille {item.size}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                    className="h-10 w-10 rounded-lg border border-[var(--border)] text-lg leading-none text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] sm:h-9 sm:w-9"
                    aria-label={`Réduire la quantité de ${item.name}`}
                  >
                    -
                  </button>
                  <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-sm font-semibold sm:h-auto sm:py-2">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                    className="h-10 w-10 rounded-lg border border-[var(--border)] text-lg leading-none text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] sm:h-9 sm:w-9"
                    aria-label={`Augmenter la quantité de ${item.name}`}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.lineId)}
                    className="ml-1 rounded-lg px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--muted)] transition hover:text-[var(--accent)] sm:text-xs sm:tracking-[0.14em]"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <p className="col-span-2 border-t border-[var(--border)] pt-3 text-right text-base font-semibold text-[var(--foreground)] sm:col-span-1 sm:border-t-0 sm:pt-0 sm:text-left sm:justify-self-end">
                {formatPrice(item.price * item.quantity)}
              </p>
            </article>
          ))}
        </section>

        <aside className="h-fit rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-5 lg:sticky lg:top-24">
          <h2 className="font-heading text-xl font-semibold text-[var(--foreground)]">Résumé</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between text-[var(--muted)]">
              <span>Articles</span>
              <span>{itemCount}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-[var(--foreground)]">
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
          </div>

          <Link
            href="/commande"
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--foreground)] px-5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-auto sm:py-3"
          >
            Finaliser la commande
          </Link>
          <Link
            href="/mode"
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-lg border border-[var(--border)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-auto sm:py-3"
          >
            Continuer les achats
          </Link>
        </aside>
      </div>
    </div>
  );
}
