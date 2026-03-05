/**
 * Restaure les produits impactes par le fallback "/IMG_5635.JPG" en les
 * reconnectant a des URLs Blob publiques.
 *
 * Strategie:
 * 1) Si un produit a deja d'autres images valides, on retire seulement le fallback.
 * 2) Si un produit n'a que le fallback, on assigne l'image Blob la plus proche
 *    temporellement (timestamp ID produit <-> timestamp pathname Blob).
 *
 * Usage:
 *   node scripts/restore-products-fallback-to-blob.mjs          # dry-run
 *   node scripts/restore-products-fallback-to-blob.mjs --apply  # applique en DB
 */

import { neon } from "@neondatabase/serverless";
import { list } from "@vercel/blob";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const FALLBACK_IMAGE = "/IMG_5635.JPG";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BACKUPS_DIR = path.join(ROOT, "data", "backups");

function parseEnvValue(raw, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^\\s*${escapedKey}\\s*=\\s*(.*)\\s*$`, "m");
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
  const envRaw = await readFileIfExists(path.join(ROOT, ".env"));
  if (envRaw) {
    candidates.push(parseEnvValue(envRaw, "DATABASE_URL"));
    candidates.push(parseEnvValue(envRaw, "POSTGRES_URL"));
  }
  for (const candidate of candidates) {
    const normalized = normalizeDatabaseUrl(candidate);
    if (normalized) return normalized;
  }
  return null;
}

async function resolveBlobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const vercelProdRaw = await readFileIfExists(path.join(ROOT, ".vercel", ".env.production.local"));
  if (vercelProdRaw) {
    const token = parseEnvValue(vercelProdRaw, "BLOB_READ_WRITE_TOKEN");
    if (token) return token;
  }
  const envLocalRaw = await readFileIfExists(path.join(ROOT, ".env.local"));
  if (envLocalRaw) {
    const token = parseEnvValue(envLocalRaw, "BLOB_READ_WRITE_TOKEN");
    if (token) return token;
  }
  return null;
}

function productTimestampFromId(id) {
  if (typeof id !== "string" || id.length < 8) return null;
  const prefix = id.slice(0, 8);
  const value = parseInt(prefix, 36);
  if (!Number.isFinite(value)) return null;
  if (value < 1_600_000_000_000 || value > 1_900_000_000_000) return null;
  return value;
}

function blobTimestampFromPath(pathname) {
  if (typeof pathname !== "string") return null;
  const match = pathname.match(/^products\/(\d{10,14})-/);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return value;
}

function uniqueUrls(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const url = value.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function asImageArray(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

function asColorMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function cleanColorMap(colorMap) {
  const out = {};
  for (const [color, values] of Object.entries(colorMap)) {
    if (!Array.isArray(values)) continue;
    const cleaned = uniqueUrls(values.filter((v) => v !== FALLBACK_IMAGE));
    if (cleaned.length > 0) out[color] = cleaned;
  }
  return out;
}

function hasFallback(row) {
  if (row.image === FALLBACK_IMAGE) return true;
  if (row.images.some((u) => u === FALLBACK_IMAGE)) return true;
  for (const values of Object.values(row.colorImages)) {
    if (!Array.isArray(values)) continue;
    if (values.some((u) => u === FALLBACK_IMAGE)) return true;
  }
  return false;
}

async function listProductBlobs(token) {
  let cursor;
  const blobs = [];
  do {
    const result = await list({ token, limit: 1000, cursor });
    for (const blob of result.blobs) {
      if (!blob.pathname.startsWith("products/")) continue;
      const ts = blobTimestampFromPath(blob.pathname);
      if (!ts) continue;
      blobs.push({
        url: blob.url,
        pathname: blob.pathname,
        uploadedAt: blob.uploadedAt,
        size: blob.size,
        ts,
      });
    }
    cursor = result.cursor;
    if (!result.hasMore) break;
  } while (true);
  blobs.sort((a, b) => a.ts - b.ts);
  return blobs;
}

function buildPlan(products, blobs) {
  const safeFixes = [];
  const needsAssignment = [];

  for (const product of products) {
    if (!hasFallback(product)) continue;

    const cleanedImages = uniqueUrls(product.images.filter((u) => u !== FALLBACK_IMAGE));
    const cleanedColorImages = cleanColorMap(product.colorImages);
    const alternatives = uniqueUrls([
      ...(product.image && product.image !== FALLBACK_IMAGE ? [product.image] : []),
      ...cleanedImages,
      ...Object.values(cleanedColorImages).flatMap((values) => (Array.isArray(values) ? values : [])),
    ]);

    if (alternatives.length > 0) {
      const nextImage = alternatives[0];
      const nextImages = uniqueUrls([nextImage, ...cleanedImages]);
      safeFixes.push({
        id: product.id,
        slug: product.slug,
        name: product.name,
        reason: "remove_fallback_keep_existing",
        nextImage,
        nextImages: nextImages.length > 0 ? nextImages : [nextImage],
        nextColorImages: cleanedColorImages,
      });
    } else {
      needsAssignment.push({
        id: product.id,
        slug: product.slug,
        name: product.name,
        ts: product.ts,
      });
    }
  }

  needsAssignment.sort((a, b) => (a.ts || 0) - (b.ts || 0));

  const usedBlobIndexes = new Set();
  const assignedFixes = [];
  for (const product of needsAssignment) {
    if (!product.ts) continue;
    let best = null;
    for (let i = 0; i < blobs.length; i += 1) {
      if (usedBlobIndexes.has(i)) continue;
      const delta = Math.abs(blobs[i].ts - product.ts);
      if (!best || delta < best.delta) {
        best = { index: i, delta, blob: blobs[i] };
      }
    }
    if (!best) continue;
    usedBlobIndexes.add(best.index);
    assignedFixes.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      reason: "assign_blob_by_timestamp",
      deltaMs: best.delta,
      assignedBlob: best.blob.url,
      assignedBlobPathname: best.blob.pathname,
      nextImage: best.blob.url,
      nextImages: [best.blob.url],
      nextColorImages: {},
    });
  }

  return {
    safeFixes,
    assignedFixes,
    totalFallbackProducts: safeFixes.length + needsAssignment.length,
    unresolvedCount: needsAssignment.length - assignedFixes.length,
  };
}

function summarizeDeltas(fixes) {
  const minutes = fixes
    .map((item) => Number(item.deltaMs || 0) / 60000)
    .sort((a, b) => a - b);
  if (minutes.length === 0) {
    return { min: null, p50: null, p75: null, p90: null, p95: null, max: null };
  }
  const percentile = (p) => minutes[Math.min(minutes.length - 1, Math.floor(minutes.length * p))];
  return {
    min: minutes[0],
    p50: percentile(0.5),
    p75: percentile(0.75),
    p90: percentile(0.9),
    p95: percentile(0.95),
    max: minutes[minutes.length - 1],
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const dbUrl = await resolveDatabaseUrl();
  if (!dbUrl) throw new Error("DATABASE_URL/POSTGRES_URL introuvable.");
  const blobToken = await resolveBlobToken();
  if (!blobToken) throw new Error("BLOB_READ_WRITE_TOKEN introuvable.");

  const sql = neon(dbUrl);
  const rows = await sql`SELECT id, slug, name, image, images, color_images FROM products ORDER BY id`;
  const products = rows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    image: typeof row.image === "string" ? row.image : "",
    images: asImageArray(row.images),
    colorImages: asColorMap(row.color_images),
    ts: productTimestampFromId(String(row.id)),
    raw: {
      image: row.image,
      images: row.images,
      color_images: row.color_images,
    },
  }));

  const blobs = await listProductBlobs(blobToken);
  const plan = buildPlan(products, blobs);
  const allFixes = [...plan.safeFixes, ...plan.assignedFixes];
  const deltas = summarizeDeltas(plan.assignedFixes);

  const summary = {
    mode: apply ? "apply" : "dry-run",
    productsTotal: products.length,
    blobsTotal: blobs.length,
    fallbackProducts: plan.totalFallbackProducts,
    safeFixes: plan.safeFixes.length,
    assignedByTimestamp: plan.assignedFixes.length,
    unresolved: plan.unresolvedCount,
    assignmentDeltaMinutes: deltas,
  };

  if (!apply) {
    console.log(JSON.stringify({ summary, sample: allFixes.slice(0, 20) }, null, 2));
    return;
  }

  await mkdir(BACKUPS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUPS_DIR, `products-before-blob-restore-${stamp}.json`);

  const affectedById = new Set(allFixes.map((item) => item.id));
  const backupRows = products
    .filter((p) => affectedById.has(p.id))
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      image: p.raw.image,
      images: p.raw.images,
      color_images: p.raw.color_images,
    }));

  await writeFile(
    backupPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        summary,
        backupRows,
        plannedFixes: allFixes,
      },
      null,
      2
    ),
    "utf-8"
  );

  let updated = 0;
  for (const fix of allFixes) {
    await sql`
      UPDATE products
      SET image = ${fix.nextImage},
          images = ${JSON.stringify(fix.nextImages)},
          color_images = ${JSON.stringify(fix.nextColorImages)}
      WHERE id = ${fix.id}
    `;
    updated += 1;
  }

  const [postCheck] = await sql`
    SELECT count(*)::int AS count
    FROM products
    WHERE image = ${FALLBACK_IMAGE}
       OR COALESCE(images::text, '') LIKE ${`%${FALLBACK_IMAGE}%`}
       OR COALESCE(color_images::text, '') LIKE ${`%${FALLBACK_IMAGE}%`}
  `;

  console.log(
    JSON.stringify(
      {
        ...summary,
        updated,
        remainingFallbackProducts: Number(postCheck?.count || 0),
        backupPath,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("restore failed:", error);
  process.exit(1);
});
