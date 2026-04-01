"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice } from "@/lib/products";

const DEFAULT_WHATSAPP_NUMBER = "221773249642";
const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER).replace(/\D+/g, "");
function getSiteUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://luxury-market.vercel.app").replace(/\/+$/, "");
}
const phoneRegex = /^[\d\s+.-]{8,20}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DeliveryOption = {
  id: string;
  title: string;
  route: string;
  delay: string;
  rate: string;
  note?: string;
};

const DELIVERY_OPTIONS: ReadonlyArray<DeliveryOption> = [
  {
    id: "express-afrique",
    title: "Livraison Express",
    route: "Chine vers Afrique",
    delay: "3 à 4 jours",
    rate: "10 000 F / kg",
  },
  {
    id: "freight-standard-afrique",
    title: "Livraison Freight Standard",
    route: "Chine vers Afrique",
    delay: "7 à 10 jours",
    rate: "7 000 F / kg",
  },
  {
    id: "internationale-diaspora",
    title: "Livraison Internationale",
    route: "Chine vers la Diaspora",
    delay: "7 à 12 jours",
    rate: "Selon transporteur et destination",
    note: "Transport assuré par DHL, UPS, FedEx et services postaux internationaux.",
  },
];

type FormErrors = {
  nom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  livraison?: string;
  message?: string;
};

function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export default function CommandeForm() {
  const searchParams = useSearchParams();
  const { items, hydrated, itemCount, subtotal } = useCart();

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [article, setArticle] = useState(() => {
    const value = searchParams.get("article");
    return value ? decodeURIComponent(value) : "";
  });
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const hasCartItems = hydrated && items.length > 0;
  const cartLabel = useMemo(() => {
    if (!hasCartItems) return "";
    return `${itemCount} article${itemCount > 1 ? "s" : ""} - ${formatPrice(subtotal)}`;
  }, [hasCartItems, itemCount, subtotal]);

  function validate(): boolean {
    const next: FormErrors = {};

    if (!nom.trim()) next.nom = "Le nom est requis.";
    else if (nom.trim().length < 2) next.nom = "Au moins 2 caractères.";

    if (email.trim() && !emailRegex.test(email.trim())) next.email = "Email invalide.";

    if (telephone.trim() && !phoneRegex.test(telephone.trim())) {
      next.telephone = "Numéro invalide.";
    }

    if (!adresse.trim()) next.adresse = "L'adresse de livraison est requise.";
    else if (adresse.trim().length < 5) next.adresse = "Au moins 5 caractères.";

    if (!deliveryMethod) next.livraison = "Choisissez un mode de livraison.";

    if (!message.trim()) next.message = "Le message est requis.";
    else if (message.trim().length < 8) next.message = "Minimum 8 caractères.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(false);
    if (!validate()) return;

    setLoading(true);

    const selectedDelivery = DELIVERY_OPTIONS.find((option) => option.id === deliveryMethod);

    const lines = [
      "Bonjour Luxury Market,",
      "",
      "Je souhaite passer une commande.",
      "",
      `Nom : ${nom.trim()}`,
      `Email : ${email.trim() || "Non renseigné"}`,
      `Téléphone : ${telephone.trim() || "Non renseigné"}`,
      `Adresse de livraison : ${adresse.trim()}`,
      `Livraison choisie (indicatif) : ${
        selectedDelivery ? `${selectedDelivery.title} — ${selectedDelivery.route}` : "Non renseigné"
      }`,
    ];

    if (selectedDelivery) {
      lines.push(`Délai indicatif : ${selectedDelivery.delay}`);
      lines.push(`Tarif transport indicatif : ${selectedDelivery.rate} (non inclus dans le total panier)`);
    }

    if (hasCartItems) {
      lines.push("", "Panier :");
      items.forEach((item) => {
        const options = [item.color ? `Couleur: ${item.color}` : "", item.size ? `Taille: ${item.size}` : ""]
          .filter(Boolean)
          .join(", ");
        const optionText = options ? ` (${options})` : "";
        lines.push(`- ${item.name}${optionText} x${item.quantity} : ${formatPrice(item.price * item.quantity)}`);
        lines.push(`  Voir : ${getSiteUrl()}/products/${item.slug}`);
      });
      lines.push(`Total panier : ${formatPrice(subtotal)}`);
    } else {
      lines.push(`Article : ${article.trim() || "Non précisé"}`);
    }

    lines.push("", "Message :", message.trim());

    const url = buildWhatsAppUrl(lines.join("\n"));
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) {
      window.location.href = url;
    }

    setLoading(false);
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Passer commande
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Remplissez ce formulaire. WhatsApp s&apos;ouvrira pour envoyer la commande.
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">Canal de commande: WhatsApp</p>

        {hasCartItems && (
          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--background)]/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Commande depuis le panier
              </p>
              <Link
                href="/panier"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)] transition hover:text-[var(--accent)]"
              >
                Modifier le panier
              </Link>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">{cartLabel}</p>
            <ul className="mt-3 space-y-1 text-xs text-[var(--foreground)]/85">
              {items.map((item) => (
                <li key={item.lineId} className="flex items-center justify-between gap-3">
                  <span className="truncate pr-2">
                    {item.name}
                    {item.color || item.size ? (
                      <span className="text-[var(--muted)]">
                        {" "}
                        ({[item.color ? `Couleur: ${item.color}` : "", item.size ? `Taille: ${item.size}` : ""].filter(Boolean).join(", ")})
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0">
                    x{item.quantity} - {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 space-y-5 sm:mt-8" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-[var(--foreground)]">
                Nom *
              </label>
              <input
                id="nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                aria-invalid={errors.nom ? "true" : "false"}
                aria-describedby={errors.nom ? "nom-error" : undefined}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="Votre nom"
              />
              {errors.nom && (
                <p id="nom-error" className="mt-1 text-sm text-[var(--accent-deep)]" role="alert">
                  {errors.nom}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={errors.email ? "email-error" : undefined}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="vous@exemple.com"
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-[var(--accent-deep)]" role="alert">
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          <div className={`grid gap-4 ${hasCartItems ? "" : "sm:grid-cols-2"}`}>
            <div>
              <label htmlFor="telephone" className="block text-sm font-medium text-[var(--foreground)]">
                Téléphone
              </label>
              <input
                id="telephone"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                aria-invalid={errors.telephone ? "true" : "false"}
                aria-describedby={errors.telephone ? "telephone-error" : undefined}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="Ex. 77 123 45 67"
              />
              {errors.telephone && (
                <p id="telephone-error" className="mt-1 text-sm text-[var(--accent-deep)]" role="alert">
                  {errors.telephone}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="adresse" className="block text-sm font-medium text-[var(--foreground)]">
                Adresse de livraison *
              </label>
              <input
                id="adresse"
                type="text"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                required
                aria-invalid={errors.adresse ? "true" : "false"}
                aria-describedby={errors.adresse ? "adresse-error" : undefined}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="Ville, quartier, rue, repère..."
              />
              {errors.adresse && (
                <p id="adresse-error" className="mt-1 text-sm text-[var(--accent-deep)]" role="alert">
                  {errors.adresse}
                </p>
              )}
            </div>

            {!hasCartItems && (
              <div>
                <label htmlFor="article" className="block text-sm font-medium text-[var(--foreground)]">
                  Article
                </label>
                <input
                  id="article"
                  type="text"
                  value={article}
                  onChange={(e) => setArticle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  placeholder="Nom de l'article"
                />
              </div>
            )}
          </div>

          <fieldset className="rounded-xl border border-[var(--border)] bg-[var(--background)]/70 p-4 sm:p-5">
            <legend className="px-1 text-sm font-semibold text-[var(--foreground)]">Mode de livraison *</legend>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Choix informatif pour le traitement de la commande. Le total panier reste inchangé.
            </p>
            <div className="mt-3 space-y-3">
              {DELIVERY_OPTIONS.map((option) => {
                const checked = deliveryMethod === option.id;
                return (
                  <label
                    key={option.id}
                    className={`block cursor-pointer rounded-xl border p-3.5 transition ${
                      checked
                        ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm"
                        : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/50"
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="delivery-method"
                        value={option.id}
                        checked={checked}
                        onChange={(e) => {
                          setDeliveryMethod(e.target.value);
                          setErrors((prev) => ({ ...prev, livraison: undefined }));
                        }}
                        className="mt-1 h-4 w-4 border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-[var(--foreground)]">
                          {option.title} - {option.route}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--muted)]">Délai: {option.delay}</span>
                        <span className="mt-0.5 block text-xs text-[var(--muted)]">Tarif: {option.rate}</span>
                        {option.note ? (
                          <span className="mt-1 block text-xs font-medium text-[var(--foreground)]/90">{option.note}</span>
                        ) : null}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-xs text-[var(--foreground)]/90">
              Livraison directe à domicile: toutes les commandes sont livrées directement chez vous, en sécurité.
            </div>
            {errors.livraison && (
              <p className="mt-2 text-sm text-[var(--accent-deep)]" role="alert">
                {errors.livraison}
              </p>
            )}
          </fieldset>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-[var(--foreground)]">
              Message *
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
              aria-invalid={errors.message ? "true" : "false"}
              aria-describedby={errors.message ? "message-error" : undefined}
              className="mt-1 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="Précisez votre besoin (quantité, taille, couleur, ville de livraison, délai)."
            />
            {errors.message && (
              <p id="message-error" className="mt-1 text-sm text-[var(--accent-deep)]" role="alert">
                {errors.message}
              </p>
            )}
          </div>

          {sent && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Votre demande est prête. Envoyez le message sur WhatsApp.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:opacity-70 sm:h-auto sm:py-3"
          >
            {loading ? "Ouverture WhatsApp…" : "Envoyer sur WhatsApp"}
          </button>
        </form>
      </div>
    </div>
  );
}
