import type { Metadata } from "next";
import PanierView from "@/components/PanierView";

export const metadata: Metadata = {
  title: "Panier — Luxury Market",
  description: "Votre panier Luxury Market.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/panier",
  },
};

export default function PanierPage() {
  return <PanierView />;
}
