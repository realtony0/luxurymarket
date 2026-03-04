import { NextRequest, NextResponse } from "next/server";

const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";
const FETCH_TIMEOUT_MS = 7000;
const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function noImageResponse() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("cache-control", CACHE_CONTROL);
  response.headers.set("x-image-empty", "1");
  return response;
}

export async function GET(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_ENABLE_BLOB_FALLBACK !== "1") {
    return noImageResponse();
  }

  const src = request.nextUrl.searchParams.get("src")?.trim() || "";
  if (!src || !isHttpUrl(src)) {
    return noImageResponse();
  }

  const parsed = new URL(src);
  if (!parsed.hostname.endsWith(BLOB_HOST_SUFFIX)) {
    return noImageResponse();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(src, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return noImageResponse();
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return noImageResponse();
    }

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": CACHE_CONTROL,
      },
    });
  } catch {
    return noImageResponse();
  } finally {
    clearTimeout(timeout);
  }
}
