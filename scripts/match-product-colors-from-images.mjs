/**
 * Analyse les images produits (Blob) et extrait une couleur dominante par image:
 * - `exactHex`: couleur dominante exacte (#RRGGBB)
 * - `name`: couleur proche en nom FR (palette boutique)
 *
 * Met a jour optionnellement:
 * - products.color (liste unique des noms de couleur)
 * - products.color_images (map couleur -> URLs)
 *
 * Usage:
 *   node scripts/match-product-colors-from-images.mjs          # dry-run + rapport
 *   node scripts/match-product-colors-from-images.mjs --apply  # applique en DB
 */

import { neon } from "@neondatabase/serverless";
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BACKUPS_DIR = path.join(ROOT, "data", "backups");

const FETCH_TIMEOUT_MS = 30_000;
const FETCH_RETRIES = 3;
const CONCURRENCY = 6;
const MIN_ALPHA = 20;
const RESIZE_SIDE = 96;

const COLOR_PALETTE = [
  { name: "Noir", hex: "#18181b" },
  { name: "Blanc", hex: "#f8fafc" },
  { name: "Gris", hex: "#6b7280" },
  { name: "Rouge", hex: "#dc2626" },
  { name: "Bordeaux", hex: "#7f1d1d" },
  { name: "Bleu", hex: "#2563eb" },
  { name: "Bleu marine", hex: "#1e3a8a" },
  { name: "Bleu ciel", hex: "#0ea5e9" },
  { name: "Vert", hex: "#16a34a" },
  { name: "Kaki", hex: "#4d7c0f" },
  { name: "Jaune", hex: "#facc15" },
  { name: "Orange", hex: "#f97316" },
  { name: "Rose", hex: "#ec4899" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Beige", hex: "#d6b98b" },
  { name: "Marron", hex: "#7c2d12" },
];

function parseEnvValue(raw, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^\\s*${escaped}\\s*=\\s*(.*)\\s*$`, "m");
  const match = raw.match(regex);
  if (!match?.[1]) return null;
  return match[1].trim().replace(/^['"]|['"]$/g, "").trim() || null;
}

async function readFileIfExists(filePath) {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

function normalizeDatabaseUrl(raw) {
  if (!raw) return null;
  let value = String(raw).trim();
  if (!value) return null;
  value = value.replace(/^psql\s+/i, "").trim();
  value = value.replace(/^['"]|['"]$/g, "").trim();
  const match = value.match(/postgres(?:ql)?:\/\/[^\s'"]+/i);
  if (match?.[0]) value = match[0];
  try {
    const parsed = new URL(value);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) return null;
    return value;
  } catch {
    return null;
  }
}

async function resolveDatabaseUrl() {
  const candidates = [process.env.DATABASE_URL, process.env.POSTGRES_URL].filter(Boolean);
  const envLocalRaw = await readFileIfExists(path.join(ROOT, ".env.local"));
  if (envLocalRaw) {
    candidates.push(parseEnvValue(envLocalRaw, "DATABASE_URL"));
    candidates.push(parseEnvValue(envLocalRaw, "POSTGRES_URL"));
  }
  for (const candidate of candidates) {
    const normalized = normalizeDatabaseUrl(candidate);
    if (normalized) return normalized;
  }
  return null;
}

function hexToRgb(hex) {
  const raw = hex.replace("#", "");
  const value = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsv(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function colorDistanceSq(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

const paletteWithRgb = COLOR_PALETTE.map((entry) => ({
  ...entry,
  rgb: hexToRgb(entry.hex),
}));

function nearestPaletteName(rgb) {
  let best = paletteWithRgb[0];
  let bestDist = colorDistanceSq(rgb, best.rgb);
  for (let i = 1; i < paletteWithRgb.length; i += 1) {
    const dist = colorDistanceSq(rgb, paletteWithRgb[i].rgb);
    if (dist < bestDist) {
      best = paletteWithRgb[i];
      bestDist = dist;
    }
  }
  return best.name;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchImageBuffer(url) {
  let lastError = null;
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) {
        throw new Error(`content-type invalide: ${contentType || "unknown"}`);
      }
      const body = await response.arrayBuffer();
      return Buffer.from(body);
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_RETRIES) {
        await sleep(250 * attempt);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error("fetch image failed");
}

function dominantColorFromRaw(data, width, height, channels) {
  // Estime la couleur de fond via les pixels de bordure.
  let borderCount = 0;
  let borderR = 0;
  let borderG = 0;
  let borderB = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isBorder = x < 2 || y < 2 || x >= width - 2 || y >= height - 2;
      if (!isBorder) continue;
      const offset = (y * width + x) * channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const a = channels >= 4 ? data[offset + 3] : 255;
      if (a < MIN_ALPHA) continue;
      borderCount += 1;
      borderR += r;
      borderG += g;
      borderB += b;
    }
  }
  const bg = borderCount
    ? { r: borderR / borderCount, g: borderG / borderCount, b: borderB / borderCount }
    : { r: 245, g: 245, b: 245 };

  const bins = new Map();
  const addPixel = (id, weight, r, g, b) => {
    const item = bins.get(id) || { weight: 0, r: 0, g: 0, b: 0 };
    item.weight += weight;
    item.r += r * weight;
    item.g += g * weight;
    item.b += b * weight;
    bins.set(id, item);
  };

  const distToBg = (r, g, b) => {
    const dr = r - bg.r;
    const dg = g - bg.g;
    const db = b - bg.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const a = channels >= 4 ? data[offset + 3] : 255;
      if (a < MIN_ALPHA) continue;

      const { h, s, v } = rgbToHsv(r, g, b);
      const bgDist = distToBg(r, g, b);

      const nx = width > 1 ? x / (width - 1) : 0.5;
      const ny = height > 1 ? y / (height - 1) : 0.5;
      const dx = nx - 0.5;
      const dy = ny - 0.5;
      const radial = Math.sqrt(dx * dx + dy * dy) / 0.7071;
      const centerWeight = Math.max(0, 1 - radial);

      let weight = 0.15 + centerWeight * centerWeight * 1.85;

      // Penalise les pixels proches du fond (souvent blanc studio).
      if (bgDist < 16 && s < 0.28) weight *= 0.04;
      else if (bgDist < 32 && s < 0.24) weight *= 0.25;

      // Evite que les ombres noires dominent.
      if (v < 0.08 && s < 0.22) weight *= 0.2;

      const id =
        s < 0.14
          ? `N-${Math.floor(v * 16)}`
          : `C-${Math.floor(h / 12)}-${Math.floor(s * 8)}-${Math.floor(v * 8)}`;
      addPixel(id, weight, r, g, b);
    }
  }

  if (bins.size === 0) {
    return { r: 127, g: 127, b: 127 };
  }

  let best = null;
  for (const value of bins.values()) {
    if (!best || value.weight > best.weight) best = value;
  }

  const denom = best.weight || 1;
  return {
    r: Math.round(best.r / denom),
    g: Math.round(best.g / denom),
    b: Math.round(best.b / denom),
  };
}

async function extractDominantColor(buffer) {
  const { data, info } = await sharp(buffer, {
    failOn: "none",
    limitInputPixels: 40_000_000,
  })
    .rotate()
    .resize(RESIZE_SIDE, RESIZE_SIDE, { fit: "inside", withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgb = dominantColorFromRaw(data, info.width, info.height, info.channels);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const exactHex = rgbToHex(rgb.r, rgb.g, rgb.b);
  const name = nearestPaletteName(rgb);
  return { exactHex, name, rgb, hsv };
}

function uniqueUrls(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const url = value.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function uniqueList(values) {
  return [...new Set(values.filter(Boolean))];
}

async function mapWithConcurrency(items, worker, concurrency = CONCURRENCY) {
  const queue = [...items];
  const results = [];
  let processed = 0;

  async function runWorker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      const result = await worker(item);
      results.push(result);
      processed += 1;
      if (processed % 25 === 0 || processed === items.length) {
        console.log(`Progression analyse images: ${processed}/${items.length}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const dbUrl = await resolveDatabaseUrl();
  if (!dbUrl) throw new Error("DATABASE_URL/POSTGRES_URL introuvable.");
  const sql = neon(dbUrl);

  const rows = await sql`
    SELECT id, slug, name, image, images, color, color_images
    FROM products
    ORDER BY id
  `;

  const products = rows.map((row) => {
    const images = Array.isArray(row.images) ? row.images : [];
    const urls = uniqueUrls([row.image, ...images]);
    return {
      id: String(row.id),
      slug: String(row.slug),
      name: String(row.name),
      image: typeof row.image === "string" ? row.image : "",
      urls,
      previousColor: typeof row.color === "string" ? row.color : "",
      previousColorImages:
        row.color_images && typeof row.color_images === "object" && !Array.isArray(row.color_images)
          ? row.color_images
          : {},
    };
  });

  const uniqueImageUrls = uniqueUrls(products.flatMap((p) => p.urls));
  const analysisCache = new Map();

  console.log(`Produits: ${products.length}`);
  console.log(`Images uniques a analyser: ${uniqueImageUrls.length}`);

  const imageAnalyses = await mapWithConcurrency(uniqueImageUrls, async (url) => {
    try {
      const buffer = await fetchImageBuffer(url);
      const analysis = await extractDominantColor(buffer);
      return { url, ok: true, ...analysis };
    } catch (error) {
      return {
        url,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  for (const item of imageAnalyses) {
    analysisCache.set(item.url, item);
  }

  const productReport = [];
  const failedImages = [];
  const updates = [];

  for (const product of products) {
    const imageDetails = [];
    const colorKeys = [];
    const colorImages = {};

    for (const url of product.urls) {
      const analysis = analysisCache.get(url);
      if (!analysis || !analysis.ok) {
        imageDetails.push({
          url,
          ok: false,
          error: analysis?.error || "analyse indisponible",
        });
        failedImages.push({ slug: product.slug, url, error: analysis?.error || "analyse indisponible" });
        continue;
      }

      imageDetails.push({
        url,
        ok: true,
        exactHex: analysis.exactHex,
        name: analysis.name,
        rgb: analysis.rgb,
      });

      // On enregistre la couleur exacte (hex) pour eviter les erreurs de labels.
      colorKeys.push(analysis.exactHex);
      if (!colorImages[analysis.exactHex]) colorImages[analysis.exactHex] = [];
      colorImages[analysis.exactHex].push(url);
    }

    const normalizedColorImages = {};
    for (const [key, urls] of Object.entries(colorImages)) {
      const uniq = uniqueUrls(urls);
      if (uniq.length > 0) normalizedColorImages[key] = uniq;
    }

    const finalColorKeys = uniqueList(colorKeys);
    const finalColor = finalColorKeys.join(", ");

    productReport.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      previousColor: product.previousColor,
      computedColor: finalColor,
      imageDetails,
    });

    updates.push({
      id: product.id,
      slug: product.slug,
      color: finalColor,
      colorImages: normalizedColorImages,
    });
  }

  const stats = {
    products: products.length,
    imagesAnalyzed: imageAnalyses.filter((i) => i.ok).length,
    imagesFailed: imageAnalyses.filter((i) => !i.ok).length,
    productsWithComputedColor: updates.filter((u) => u.color.trim()).length,
    productsWithoutComputedColor: updates.filter((u) => !u.color.trim()).length,
  };

  await mkdir(BACKUPS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(BACKUPS_DIR, `product-color-report-${stamp}.json`);

  await writeFile(
    reportPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        mode: apply ? "apply" : "dry-run",
        stats,
        failedImages,
        products: productReport,
      },
      null,
      2
    ),
    "utf-8"
  );

  let backupPath = null;
  if (apply) {
    backupPath = path.join(BACKUPS_DIR, `products-before-color-match-${stamp}.json`);
    const backupRows = products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      color: p.previousColor,
      color_images: p.previousColorImages,
    }));

    await writeFile(
      backupPath,
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          stats,
          backupRows,
          plannedUpdates: updates,
        },
        null,
        2
      ),
      "utf-8"
    );

    let updated = 0;
    for (const item of updates) {
      await sql`
        UPDATE products
        SET color = ${item.color || null},
            color_images = ${JSON.stringify(item.colorImages)}
        WHERE id = ${item.id}
      `;
      updated += 1;
      if (updated % 40 === 0 || updated === updates.length) {
        console.log(`Progression maj DB couleurs: ${updated}/${updates.length}`);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        stats,
        reportPath,
        backupPath,
        sample: productReport.slice(0, 12).map((p) => ({
          slug: p.slug,
          previousColor: p.previousColor,
          computedColor: p.computedColor,
          imageColors: p.imageDetails
            .filter((d) => d.ok)
            .slice(0, 3)
            .map((d) => ({ hex: d.exactHex, name: d.name })),
        })),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("color match failed:", error);
  process.exit(1);
});
