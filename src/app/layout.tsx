import type { Metadata } from "next";
import { Bebas_Neue, Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/cart/CartProvider";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://luxury-market.vercel.app").replace(/\/+$/, "");

const cormorant = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bebas = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Luxury Market — Mode & Maison", template: "%s | Luxury Market" },
  description:
    "Mode premium et tout pour la maison : vêtements, électroménager, décoration. Livraison internationale.",
  applicationName: "Luxury Market",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Luxury Market — Mode & Maison",
    description: "Mode et maison. Livraison internationale.",
    type: "website",
    url: "/",
    siteName: "Luxury Market",
    locale: "fr_FR",
    images: [
      {
        url: "/IMG_5635.JPG",
        width: 1200,
        height: 630,
        alt: "Luxury Market - Mode et maison",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Luxury Market — Mode & Maison",
    description: "Mode et maison. Livraison internationale.",
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
    <html lang="fr" className={`${cormorant.variable} ${dmSans.variable} ${bebas.variable}`}>
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
