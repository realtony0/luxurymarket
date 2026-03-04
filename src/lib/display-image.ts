export function toDisplayImageUrl(value: string | null | undefined): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  if (raw.startsWith("/")) {
    return raw;
  }

  if (raw.startsWith("data:image/")) {
    return raw;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  if (parsed.hostname.endsWith(".blob.vercel-storage.com")) {
    if (process.env.NEXT_PUBLIC_ENABLE_BLOB_FALLBACK !== "1") {
      return null;
    }
    const params = new URLSearchParams({ src: raw });
    return `/api/image-proxy?${params.toString()}`;
  }

  return raw;
}
