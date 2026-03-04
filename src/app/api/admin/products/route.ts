import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth-admin";
import { getProducts } from "@/lib/products-data";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const products = await getProducts();
  return NextResponse.json(products);
}

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  return NextResponse.json(
    { error: "Stockage saturé. Ajout de produits suspendu temporairement." },
    { status: 507 }
  );
}
