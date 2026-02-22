import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, getProducts } from "@/lib/products-server";
import { formatPrice } from "@/lib/products";
import { mapModeCategory, mapModeSubcategory, mapUniverseCategory } from "@/lib/universe-categories";
import AddToCartActions from "@/components/AddToCartActions";
import ProductGallery from "@/components/ProductGallery";

type Props = { params: Promise<{ slug: string }> };
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://luxury-market.vercel.app").replace(/\/+$/, "");

export const revalidate = 3600;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produit" };
  const canonicalPath = `/products/${product.slug}`;
  const productUrl = `${siteUrl}${canonicalPath}`;
  const gallery = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.image];

  return {
    title: product.name,
    description: product.description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: product.name,
      description: product.description,
      type: "website",
      url: productUrl,
      images: gallery.map((url) => ({ url, alt: product.name })),
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.description,
      images: gallery,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const backHref = product.universe === "mode" ? "/mode" : "/univers";
  const displayedCategory = product.universe === "tout"
    ? mapUniverseCategory(product.category)
    : mapModeCategory(product.category);
  const displayedSubCategory =
    product.universe === "mode" ? mapModeSubcategory(product.category) : null;
  const gallery = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.image];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href={backHref}
          className="mb-5 inline-flex items-center rounded text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)] transition hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:mb-6 sm:text-sm sm:font-medium sm:normal-case sm:tracking-normal"
        >
          ← Retour à la boutique
        </Link>

        <div className="grid gap-6 md:grid-cols-2 md:gap-12">
          <ProductGallery name={product.name} images={gallery} />
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
              {displayedCategory}
              {displayedSubCategory ? ` · ${displayedSubCategory}` : ""}
            </p>
            <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl md:text-4xl">
              {product.name}
            </h1>
            <p className="mt-3 text-2xl font-semibold text-[var(--accent)] sm:mt-4 sm:text-3xl">
              {formatPrice(product.price)}
            </p>
            <p className="mt-5 text-sm leading-relaxed text-[var(--muted)] sm:mt-6 sm:text-base">
              {product.description}
            </p>
            <AddToCartActions
              key={product.slug}
              backHref={backHref}
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                image: gallery[0] || product.image,
                universe: product.universe,
                category: product.category,
                color: product.color,
                colorImages: product.colorImages,
                sizes: product.sizes,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
