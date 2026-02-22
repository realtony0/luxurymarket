function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

const COLOR_MAP: Record<string, string> = {
  noir: "#18181b",
  blanc: "#f8fafc",
  gris: "#6b7280",
  argent: "#cbd5e1",
  anthracite: "#374151",
  rouge: "#dc2626",
  bordeau: "#7f1d1d",
  bordeaux: "#7f1d1d",
  bleu: "#2563eb",
  "bleu marine": "#1e3a8a",
  marine: "#1e3a8a",
  "bleu ciel": "#0ea5e9",
  vert: "#16a34a",
  kaki: "#4d7c0f",
  olive: "#4d7c0f",
  jaune: "#facc15",
  orange: "#f97316",
  rose: "#ec4899",
  violet: "#7c3aed",
  beige: "#d6b98b",
  creme: "#f5f5dc",
  cremee: "#f5f5dc",
  marron: "#7c2d12",
  camel: "#c07a42",
  or: "#f59e0b",
  dore: "#f59e0b",
  cuivre: "#b45309",
  transparent: "#ffffff",
};

function colorFromHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 50%)`;
}

export function parseColorList(raw?: string): string[] {
  if (!raw) return [];
  const values = raw
    .split(/[,;/|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set(values)];
}

export function colorToSwatch(color: string): string {
  const value = color.trim();
  if (!value) return "#d1d5db";

  if (/^#([a-f0-9]{3}|[a-f0-9]{6})$/i.test(value)) {
    return value;
  }
  if (/^(rgb|hsl)a?\(/i.test(value)) {
    return value;
  }

  const key = normalize(value);
  if (COLOR_MAP[key]) {
    return COLOR_MAP[key];
  }

  return colorFromHash(key);
}
