const WHATSAPP = "221773249642";
const EMAIL = "Luxurymarket1@gmail.com";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[var(--surface-dark)] py-8 text-white/75">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm sm:px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-white/55">
          © {new Date().getFullYear()} Luxury Market · Livraison internationale
        </p>
        <p className="mt-3">
          <a
            href={`https://wa.me/${WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-dark)] rounded"
          >
            WhatsApp : +221 77 324 96 42
          </a>
          {" · "}
          <a
            href={`mailto:${EMAIL}`}
            className="transition hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-dark)] rounded"
          >
            {EMAIL}
          </a>
        </p>
      </div>
    </footer>
  );
}
