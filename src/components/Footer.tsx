import Link from "next/link";

const WHATSAPP = "221773249642";
const SITE_NAME = "Luxury Market";
const SITE_SLOGAN = "Mode et univers. Livraison internationale.";
const SITE_ADDRESS = "china/ senegal";

const footerNav = [
  { href: "/", label: "Accueil" },
  { href: "/mode", label: "Mode" },
  { href: "/univers", label: "Univers" },
  { href: "/pourquoi-nous", label: "A propos" },
] as const;

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[var(--surface-dark)] py-8 text-white/75">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 border-b border-white/10 pb-6 text-sm sm:grid-cols-2">
          <section className="text-center">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Navigation</h2>
            <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs uppercase tracking-[0.14em] text-white/75">
              {footerNav.map((item) => (
                <Link key={item.href} href={item.href} className="transition hover:text-[var(--accent)]">
                  {item.label}
                </Link>
              ))}
            </nav>
          </section>

          <section className="text-center">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Contact</h2>
            <p className="mt-3">
              <a
                href={`https://wa.me/${WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded text-sm uppercase tracking-[0.12em] text-white/85 transition hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-dark)]"
              >
                Nous ecrire (WhatsApp)
              </a>
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-white/60">
              Adresse: {SITE_ADDRESS}
            </p>
          </section>
        </div>

        <div className="mt-4 text-center text-xs uppercase tracking-[0.12em] text-white/55">
          <p>© {new Date().getFullYear()} {SITE_NAME}</p>
          <p className="mt-1 text-white/70">
            {SITE_NAME} · {SITE_SLOGAN}
          </p>
        </div>
      </div>
    </footer>
  );
}
