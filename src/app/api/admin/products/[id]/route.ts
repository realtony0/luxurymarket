import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/auth-admin";
import { deleteProduct, updateProduct } from "@/lib/products-data";
import { normalizeProductImages, type Product } from "@/lib/products";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteProduct(id);
  if (!ok) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  revalidateTag("products", "max");
  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest, { params }: Params) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const input: Partial<Product> = {};

  if (body.name != null) input.name = String(body.name).trim();
  if (typeof body.price === "number") input.price = body.price;
  if (body.category != null) input.category = String(body.category).trim();
  if (body.universe === "mode" || body.universe === "tout") input.universe = body.universe;

  if (body.image != null || body.images != null) {
    const normalizedImages = normalizeProductImages(body.images, body.image);
    if (normalizedImages.length === 0) {
      return NextResponse.json({ error: "Au moins une image produit est requise." }, { status: 400 });
    }
    input.image = normalizedImages[0];
    input.images = normalizedImages;
  }

  if (body.description != null) input.description = String(body.description).trim();
  if (body.color != null) input.color = String(body.color).trim() || undefined;
  if (Array.isArray(body.sizes)) input.sizes = body.sizes.map((s: unknown) => String(s));

  const product = await updateProduct(id, input);
  if (!product) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  revalidateTag("products", "max");
  return NextResponse.json(product);
}
