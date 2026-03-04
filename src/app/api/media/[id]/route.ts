import { NextResponse } from "next/server";
import { ensureMediaTable, getDb } from "@/lib/db";

const CACHE_CONTROL = "public, max-age=31536000, immutable";

type Params = { params: Promise<{ id: string }> };

type MediaRow = {
  mime_type: string;
  body_base64: string;
  size_bytes: number;
};

function isValidMediaId(value: string): boolean {
  return /^[a-z0-9-]{16,64}$/i.test(value);
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!isValidMediaId(id)) {
    return new NextResponse(null, { status: 404 });
  }

  const sql = getDb();
  if (!sql) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    await ensureMediaTable();
    const rows = await sql`
      SELECT mime_type, encode(bytes, 'base64') AS body_base64, size_bytes
      FROM media_assets
      WHERE id = ${id}
      LIMIT 1
    `;
    const row = (rows as MediaRow[])[0];
    if (!row || !row.body_base64 || !row.mime_type) {
      return new NextResponse(null, { status: 404 });
    }

    const bytes = Buffer.from(row.body_base64, "base64");

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "content-type": row.mime_type,
        "cache-control": CACHE_CONTROL,
        "content-length": String(Number(row.size_bytes) || bytes.byteLength),
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
