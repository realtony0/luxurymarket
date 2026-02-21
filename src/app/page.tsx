import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://luxury-market.vercel.app").replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "Accueil",
  description: "Luxury Market - Mode et maison. Livraison internationale.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Luxury Market",
        url: siteUrl,
        logo: `${siteUrl}/favicon.ico`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "Luxury Market",
        url: siteUrl,
        inLanguage: "fr",
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
      },
    ],
  };

  return (
    <section className="relative flex min-h-[calc(100svh-5.5rem)] flex-col items-center justify-center overflow-hidden px-4 pb-12 pt-10 text-center sm:min-h-[calc(100vh-4rem)] sm:px-6 sm:pt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="absolute inset-0">
        <Image
          src="/IMG_5635.JPG"
          alt=""
          fill
          className="scale-110 object-cover object-center blur-[4px] brightness-[0.6]"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/52 via-black/70 to-black/82" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(240,77,7,0.4),transparent_45%)]" aria-hidden />
      </div>

      <div className="relative z-10 w-full">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-xs sm:tracking-[0.26em]">
          Luxury Selection
        </p>
        <h1 className="font-display mt-2 text-5xl leading-[0.88] tracking-[0.08em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)] min-[380px]:text-6xl sm:text-7xl md:text-8xl">
          LUXURY
          <br />
          MARKET
        </h1>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-white/85 sm:mt-5 sm:text-base sm:tracking-[0.2em]">
          Mode et maison. Livraison internationale.
        </p>

        <div className="mx-auto mt-8 flex w-full max-w-sm flex-col items-center gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/mode"
            className="font-display inline-flex w-full items-center justify-center rounded-xl border-2 border-[var(--accent)] bg-[var(--accent)] px-8 py-3.5 text-xl tracking-[0.08em] text-white transition hover:bg-[var(--accent-deep)] hover:border-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:w-auto sm:min-w-56 sm:px-12 sm:py-4 sm:text-2xl sm:tracking-[0.1em]"
          >
            Mode
          </Link>
          <Link
            href="/tout"
            className="font-display inline-flex w-full items-center justify-center rounded-xl border-2 border-white/60 bg-black/20 px-8 py-3.5 text-xl tracking-[0.08em] text-white transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:w-auto sm:min-w-56 sm:px-12 sm:py-4 sm:text-2xl sm:tracking-[0.1em]"
          >
            Tout
          </Link>
        </div>
      </div>
    </section>
  );
}
