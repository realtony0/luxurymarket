"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice } from "@/lib/products";

const DEFAULT_WHATSAPP_NUMBER = "221773249642";
const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER).replace(/\D+/g, "");
const phoneRegex = /^[\d\s+.-]{8,20}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormErrors = {
  nom?: string;
  email?: string;
  telephone?: string;
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

    const lines = [
      "Bonjour Luxury Market,",
      "",
      "Je souhaite passer une commande.",
      "",
      `Nom : ${nom.trim()}`,
      `Email : ${email.trim() || "Non renseigné"}`,
      `Téléphone : ${telephone.trim() || "Non renseigné"}`,
    ];

    if (hasCartItems) {
      lines.push("", "Panier :");
      items.forEach((item) => {
        lines.push(`- ${item.name} x${item.quantity} : ${formatPrice(item.price * item.quantity)}`);
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
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span className="truncate pr-2">{item.name}</span>
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
