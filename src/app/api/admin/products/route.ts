import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth-admin";
import { getProducts, addProduct } from "@/lib/products-data";
import type { Product } from "@/lib/products";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const products = await getProducts();
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const {
    name,
    price,
    category,
    universe,
    image,
    description,
    color,
    sizes,
  } = body;

  if (!name || typeof price !== "number" || !category || !universe || !image || !description) {
    return NextResponse.json(
      { error: "Champs requis : name, price, category, universe, image, description." },
      { status: 400 }
    );
  }
  if (universe !== "mode" && universe !== "tout") {
    return NextResponse.json({ error: "universe doit être 'mode' ou 'tout'." }, { status: 400 });
  }

  const input: Omit<Product, "id" | "slug"> = {
    name: String(name).trim(),
    price: Number(price),
    category: String(category).trim(),
    universe,
    image: String(image).trim(),
    description: String(description).trim(),
  };
  if (color != null) input.color = String(color).trim() || undefined;
  if (Array.isArray(sizes)) input.sizes = sizes.map((s: unknown) => String(s));

  try {
    const product = await addProduct(input);
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'ajout." }, { status: 500 });
  }
}
