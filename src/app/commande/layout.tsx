import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commande",
  description: "Envoyez votre demande de commande en quelques étapes.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/commande",
  },
};

export default function CommandeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
