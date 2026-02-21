import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth-admin";
import { deleteCategory } from "@/lib/categories-data";

type Params = { params: Promise<{ name: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { name } = await params;
  const categoryName = decodeURIComponent(name);
  const body = await request.json().catch(() => ({}));
  const replacement = body?.replacement != null ? String(body.replacement).trim() : undefined;

  try {
    const result = await deleteCategory(categoryName, replacement);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la suppression de catégorie.";
    const status = message.includes("remplacement") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
