"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

const nav = [
  { href: "/", label: "Accueil" },
  { href: "/mode", label: "Mode" },
  { href: "/univers", label: "Univers" },
  { href: "/panier", label: "Panier" },
] as const;

export default function Header() {
  const pathname = usePathname();
  const { itemCount, hydrated } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--surface-darker)]/90 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-3 sm:px-4 md:h-16 md:px-6">
        <Link
          href="/"
          onClick={closeMenu}
          className="inline-flex h-10 items-center rounded font-heading text-base font-semibold uppercase tracking-[0.08em] text-white transition hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-darker)] md:text-lg"
        >
          Luxury Market
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-darker)] md:hidden"
        >
          <span className="sr-only">Ouvrir le menu</span>
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 top-0 h-0.5 w-5 rounded bg-white transition ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`}
            />
            <span
              className={`absolute left-0 top-[7px] h-0.5 w-5 rounded bg-white transition ${menuOpen ? "opacity-0" : "opacity-100"}`}
            />
            <span
              className={`absolute left-0 top-[14px] h-0.5 w-5 rounded bg-white transition ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`}
            />
          </span>
        </button>

        <nav
          className="hidden items-center gap-3 overflow-x-auto rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em] md:flex"
          aria-label="Navigation principale"
        >
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={
                pathname === href || (href !== "/" && pathname.startsWith(href))
                  ? "rounded-full bg-[var(--accent)] px-3 py-1.5 text-white"
                  : "rounded-full px-3 py-1.5 text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-darker)]"
              }
            >
              <span className="inline-flex items-center gap-2">
                {label}
                {href === "/panier" && hydrated && itemCount > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px] leading-none text-[var(--surface-darker)]">
                    {itemCount}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </nav>
      </div>

      <div
        id="mobile-menu"
        className={`border-t border-white/10 bg-[var(--surface-darker)]/95 px-3 py-3 transition md:hidden ${menuOpen ? "block" : "hidden"}`}
      >
        <nav aria-label="Navigation mobile" className="mx-auto max-w-6xl">
          <ul className="grid gap-2">
            {nav.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={closeMenu}
                  className={
                    pathname === href || (href !== "/" && pathname.startsWith(href))
                      ? "flex h-11 items-center justify-between rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                      : "flex h-11 items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold uppercase tracking-[0.12em] text-white/85 transition hover:text-white"
                  }
                >
                  <span>{label}</span>
                  {href === "/panier" && hydrated && itemCount > 0 && (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px] leading-none text-[var(--surface-darker)]">
                      {itemCount}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
