import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/cart/CartProvider";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://luxury-market.vercel.app").replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Luxury Market — Mode & Univers", template: "%s | Luxury Market" },
  description: "Mode et univers. Livraison internationale.",
  applicationName: "Luxury Market",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Luxury Market — Mode & Univers",
    description: "Mode et univers. Livraison internationale.",
    type: "website",
    url: "/",
    siteName: "Luxury Market",
    locale: "fr_FR",
    images: [
      {
        url: "/IMG_5635.JPG",
        width: 1200,
        height: 630,
        alt: "Luxury Market - Mode et univers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Luxury Market — Mode & Univers",
    description: "Mode et univers. Livraison internationale.",
    images: ["/IMG_5635.JPG"],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased font-sans">
        <CartProvider>
          <Header />
          <main id="main" className="flex min-h-screen flex-col" tabIndex={-1}>
            {children}
            <Footer />
          </main>
        </CartProvider>
      </body>
    </html>
  );
}
