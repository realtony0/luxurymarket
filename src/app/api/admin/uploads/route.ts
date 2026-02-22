import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { isAdmin } from "@/lib/auth-admin";

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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "BLOB_READ_WRITE_TOKEN manquant. Activez Vercel Blob puis ajoutez la variable d'environnement.",
      },
      { status: 500 }
    );
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
    const fileName = `products/${Date.now()}-${crypto.randomUUID()}.webp`;

    const blob = await put(fileName, optimized, {
      access: "public",
      contentType: "image/webp",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Échec de l'upload image." }, { status: 500 });
  }
}
