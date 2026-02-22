import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/auth-admin";
import { deleteCategory, renameCategory } from "@/lib/categories-data";

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
    revalidateTag("products", "max");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la suppression de catégorie.";
    const status = message.includes("remplacement") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { name } = await params;
  const currentName = decodeURIComponent(name);
  const body = await request.json().catch(() => ({}));
  const nextName = body?.name != null ? String(body.name).trim() : "";

  if (!nextName) {
    return NextResponse.json({ error: "Nouveau nom de catégorie requis." }, { status: 400 });
  }

  try {
    const result = await renameCategory(currentName, nextName);
    revalidateTag("products", "max");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors du renommage de catégorie.";
    const status =
      message.includes("introuvable") || message.includes("requis") ? 400 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
