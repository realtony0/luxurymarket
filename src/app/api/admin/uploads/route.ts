import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { isAdmin } from "@/lib/auth-admin";
import { ensureMediaTable, getDb } from "@/lib/db";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_IMAGE_SIDE = 1800;
const WEBP_QUALITY = 82;

async function optimizeImage(file: File): Promise<Buffer> {
  const input = Buffer.from(await file.arrayBuffer());

  return sharp(input, {
    failOn: "none",
    limitInputPixels: 40_000_000,
  })
    .rotate()
    .resize(MAX_IMAGE_SIDE, MAX_IMAGE_SIDE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL manquant pour stocker les images en base." }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Le fichier doit être une image." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Image invalide. Taille max: 8MB." },
      { status: 400 }
    );
  }

  try {
    const optimized = await optimizeImage(file);
    await ensureMediaTable();
    const mediaId = crypto.randomUUID();
    const bodyHex = optimized.toString("hex");

    await sql`
      INSERT INTO media_assets (id, mime_type, bytes, size_bytes)
      VALUES (${mediaId}, ${"image/webp"}, decode(${bodyHex}, 'hex'), ${optimized.byteLength})
    `;

    return NextResponse.json({ url: `/api/media/${mediaId}` }, { status: 201 });
  } catch (error) {
    console.error("admin image upload failed", error);
    return NextResponse.json({ error: "Échec de l'upload image." }, { status: 500 });
  }
}
