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

  return raw;
}
