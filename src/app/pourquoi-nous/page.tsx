import Link from "next/link";
import type { Metadata } from "next";
import { getProducts } from "@/lib/products-server";
import { mapModeCategory, mapUniverseCategory } from "@/lib/universe-categories";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://luxury-market.vercel.app").replace(/\/+$/, "");

const commitments = [
  {
    title: "Selection Streetwear & Lifestyle",
    description:
      "Chaque article est choisi pour son style, sa finition et sa demande client dans nos univers Mode et Univers.",
  },
  {
    title: "Commande Rapide & Claire",
    description:
      "Parcours simple: vous ajoutez au panier, vous validez, puis vous finalisez la commande par WhatsApp sans friction.",
  },
  {
    title: "Suivi Humain",
    description:
      "Vous etes accompagne a chaque etape: confirmation, disponibilite, suivi de livraison et support apres achat.",
  },
  {
    title: "Livraison Internationale",
    description:
      "Nous adaptons l'expedition a votre zone avec un traitement rapide et une communication continue jusqu'a reception.",
  },
] as const;

const testimonials = [
  {
    name: "Awa D.",
    city: "Dakar",
    rating: 5,
    quote:
      "Qualite propre et service rapide. Les photos correspondent exactement aux produits recus.",
    purchase: "Commande mode",
  },
  {
    name: "Moussa K.",
    city: "Abidjan",
    rating: 5,
    quote:
      "Le suivi WhatsApp est tres pro. J'ai recu mes articles dans les delais annonces.",
    purchase: "Commande univers",
  },
  {
    name: "Fatou S.",
    city: "Paris",
    rating: 5,
    quote:
      "Selection tendance, process simple, et packaging soigne. Je recommande sans hesitation.",
    purchase: "Commande mixte",
  },
] as const;

const faqs = [
  {
    question: "Comment se passe la commande ?",
    answer:
      "Vous ajoutez les articles au panier, puis vous envoyez la commande sur WhatsApp. Notre equipe confirme les details avant validation finale.",
  },
  {
    question: "Les produits sont-ils disponibles en stock ?",
    answer:
      "Le stock est mis a jour regulierement. Si un article est limite, vous etes informe rapidement avec une alternative.",
  },
  {
    question: "Quels sont les delais de traitement ?",
    answer:
      "Apres validation, la commande est preparee rapidement et vous recevez le suivi directement sur WhatsApp.",
  },
  {
    question: "Puis-je avoir de l'aide pour choisir ?",
    answer:
      "Oui. Notre support vous conseille selon le style, la taille, l'usage et votre budget avant la validation de commande.",
  },
] as const;

export const metadata: Metadata = {
  title: "Pourquoi Nous",
  description: "Pourquoi choisir Luxury Market: engagements, avis clients et FAQ.",
  alternates: {
    canonical: "/pourquoi-nous",
  },
  openGraph: {
    title: "Pourquoi choisir Luxury Market",
    description: "Engagements, avis clients et experience de commande simple et professionnelle.",
    url: "/pourquoi-nous",
    images: [
      {
        url: "/IMG_5635.JPG",
        width: 1200,
        height: 630,
        alt: "Pourquoi choisir Luxury Market",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pourquoi choisir Luxury Market",
    description: "Engagements, avis clients et experience de commande simple et professionnelle.",
    images: ["/IMG_5635.JPG"],
  },
};

export default async function PourquoiNousPage() {
  const products = await getProducts();
  const mappedCategoryCounts = new Map<string, number>();

  for (const product of products) {
    const category =
      product.universe === "tout"
        ? mapUniverseCategory(product.category)
        : mapModeCategory(product.category);
    mappedCategoryCounts.set(category, (mappedCategoryCounts.get(category) ?? 0) + 1);
  }

  const topCategories = [...mappedCategoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/pourquoi-nous#webpage`,
        url: `${siteUrl}/pourquoi-nous`,
        name: "Pourquoi nous - Luxury Market",
        inLanguage: "fr",
        isPartOf: {
          "@id": `${siteUrl}/#website`,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Pourquoi nous",
            item: `${siteUrl}/pourquoi-nous`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="border-b border-[var(--border)] bg-white/70">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-14 text-center sm:px-6 md:pb-14 md:pt-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)] sm:text-xs">
            A propos de Luxury Market
          </p>
          <h1 className="font-display mt-3 text-4xl leading-[0.9] tracking-[0.08em] text-[var(--foreground)] min-[430px]:text-5xl sm:text-6xl md:text-7xl">
            POURQUOI
            <br />
            NOUS
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
            Une boutique construite pour aller droit au but: bons produits, selection claire,
            commande rapide et accompagnement client serieux.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 md:pb-16 md:pt-14">
        <div className="mb-10 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:mb-12 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Categories les plus demandees
          </p>
          {topCategories.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">Aucune categorie disponible pour le moment.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {topCategories.map(([category, count]) => (
                <span
                  key={category}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]"
                >
                  {category}
                  <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] text-[var(--accent)]">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        <header className="mb-6 text-center sm:mb-8">
          <span className="inline-flex rounded-full bg-[var(--accent)]/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
            Nos engagements
          </span>
          <h2 className="font-display mt-4 text-3xl leading-[0.92] tracking-[0.08em] text-[var(--foreground)] min-[420px]:text-4xl sm:text-5xl">
            Une experience
            <br />
            professionnelle
          </h2>
        </header>
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          {commitments.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[0_10px_25px_rgba(17,13,16,0.06)]"
            >
              <h3 className="font-heading text-xl font-semibold text-[var(--foreground)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-white/60 py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <header className="mb-6 text-center sm:mb-8">
            <span className="inline-flex rounded-full bg-[var(--accent)]/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
              Avis clients
            </span>
            <h2 className="font-display mt-4 text-3xl leading-[0.92] tracking-[0.08em] text-[var(--foreground)] min-[420px]:text-4xl sm:text-5xl">
              Ce que nos clients
              <br />
              disent de nous
            </h2>
          </header>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((review) => (
              <article
                key={`${review.name}-${review.city}`}
                className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[0_8px_20px_rgba(17,13,16,0.05)]"
              >
                <p className="text-sm leading-relaxed text-[var(--foreground)]">&ldquo;{review.quote}&rdquo;</p>
                <div className="mt-4 flex items-center gap-1 text-[var(--accent)]" aria-label={`${review.rating} etoiles`}>
                  {Array.from({ length: review.rating }).map((_, index) => (
                    <span key={index} className="text-base leading-none">★</span>
                  ))}
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {review.name} · {review.city}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">{review.purchase}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr] md:py-16">
        <div>
          <header className="mb-5">
            <span className="inline-flex rounded-full bg-[var(--accent)]/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
              Questions frequentes
            </span>
            <h2 className="font-display mt-4 text-3xl leading-[0.92] tracking-[0.08em] text-[var(--foreground)] min-[420px]:text-4xl">
              FAQ
            </h2>
          </header>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-[var(--border)] bg-white px-4 py-3"
              >
                <summary className="cursor-pointer list-none pr-6 text-sm font-semibold text-[var(--foreground)]">
                  {faq.question}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>

        <aside className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Besoin d&apos;aide
          </p>
          <h3 className="font-display mt-3 text-3xl leading-[0.92] tracking-[0.06em] text-[var(--foreground)]">
            Parlons de votre commande
          </h3>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Notre equipe vous repond rapidement sur les tailles, la disponibilite et la livraison.
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            <a
              href="https://wa.me/221773249642"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--accent-deep)]"
            >
              Ecrire sur WhatsApp
            </a>
            <Link
              href="/panier"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Voir le panier
            </Link>
          </div>
        </aside>
      </section>

      <section className="border-t border-[var(--border)] py-12">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="font-display text-4xl leading-[0.9] tracking-[0.08em] text-[var(--foreground)] sm:text-5xl">
            PRET A COMMANDER
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
            Decouvrez les collections, ajoutez vos articles et finalisez votre commande en quelques minutes.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/mode"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-7 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--accent-deep)]"
            >
              Boutique Mode
            </Link>
            <Link
              href="/univers"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-7 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Boutique Univers
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
