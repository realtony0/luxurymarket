/**
 * Migre toutes les images Blob des produits vers media_assets (Postgres),
 * puis remplace les URLs produit par /api/media/{id}.
 *
 * Usage:
 *   set -a; source .env.local; node scripts/migrate-blob-to-db-media.mjs
 */
import { neon } from "@neondatabase/serverless";
import sharp from "sharp";
import crypto from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";
const MAX_IMAGE_SIDE = 1800;
const WEBP_QUALITY = 82;
const REQUEST_TIMEOUT_MS = 6000;
const FETCH_CONCURRENCY = 12;
const FALLBACK_IMAGE = "/IMG_5635.JPG";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

async function readEnvFileValue(filePath, key) {
  try {
    const raw = await readFile(filePath, "utf-8");
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^\\s*${escapedKey}\\s*=\\s*(.*)\\s*$`, "m");
    const match = raw.match(regex);
    if (!match?.[1]) return null;
    let value = match[1].trim();
    value = value.replace(/^['"]|['"]$/g, "").trim();
    return value || null;
  } catch {
    return null;
  }
}

async function resolveDatabaseUrl() {
  const candidates = [];
  if (process.env.DATABASE_URL) candidates.push(process.env.DATABASE_URL);
  if (process.env.POSTGRES_URL) candidates.push(process.env.POSTGRES_URL);

  const envLocal = path.join(__dirname, "..", ".env.local");
  const envFile = path.join(__dirname, "..", ".env");
  const fileCandidates = [
    await readEnvFileValue(envLocal, "DATABASE_URL"),
    await readEnvFileValue(envLocal, "POSTGRES_URL"),
    await readEnvFileValue(envFile, "DATABASE_URL"),
    await readEnvFileValue(envFile, "POSTGRES_URL"),
  ].filter(Boolean);

  candidates.push(...fileCandidates);

  for (const candidate of candidates) {
    const normalized = normalizeDatabaseUrl(candidate);
    if (normalized) return normalized;
  }

  return null;
}

function isBlobUrl(value) {
  if (typeof value !== "string") return false;
  const raw = value.trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      parsed.hostname.endsWith(BLOB_HOST_SUFFIX)
    );
  } catch {
    return false;
  }
}

function toUrlString(value) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v : null;
}

function uniqueUrls(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const normalized = toUrlString(value);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function replaceUrl(url, replacements) {
  const value = toUrlString(url);
  if (!value) return null;
  if (replacements.has(value)) return replacements.get(value);
  if (isBlobUrl(value)) return FALLBACK_IMAGE;
  return value;
}

async function optimizeToWebp(buffer) {
  return sharp(buffer, {
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

async function fetchBuffer(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
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
      throw new Error(`Invalid content-type: ${contentType || "unknown"}`);
    }
    const body = await response.arrayBuffer();
    return Buffer.from(body);
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const url = await resolveDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL/POSTGRES_URL invalide ou manquant.");
  }

  const sql = neon(url);
  console.log("Connexion DB OK.");

  await sql`
    CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,
      mime_type TEXT NOT NULL,
      bytes BYTEA NOT NULL,
      size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS media_assets_created_at_idx
    ON media_assets (created_at DESC)
  `;

  const rows = await sql`
    SELECT id, image, images, color_images
    FROM products
    ORDER BY id
  `;

  const products = rows.map((row) => ({
    id: String(row.id),
    image: toUrlString(row.image) || "",
    images: parseArray(row.images),
    colorImages: parseObject(row.color_images),
  }));

  const blobSet = new Set();
  for (const product of products) {
    if (isBlobUrl(product.image)) blobSet.add(product.image);
    for (const value of product.images) {
      const urlValue = toUrlString(value);
      if (urlValue && isBlobUrl(urlValue)) blobSet.add(urlValue);
    }
    for (const values of Object.values(product.colorImages)) {
      if (!Array.isArray(values)) continue;
      for (const value of values) {
        const urlValue = toUrlString(value);
        if (urlValue && isBlobUrl(urlValue)) blobSet.add(urlValue);
      }
    }
  }

  const blobUrls = Array.from(blobSet);
  console.log(`Blob URLs détectées: ${blobUrls.length}`);

  const replacements = new Map();
  const failures = [];
  let uploaded = 0;
  let processed = 0;
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= blobUrls.length) return;

      const blobUrl = blobUrls[index];
      try {
        const originalBuffer = await fetchBuffer(blobUrl);
        const optimized = await optimizeToWebp(originalBuffer);
        const mediaId = crypto.randomUUID();
        const hexBody = optimized.toString("hex");

        await sql`
          INSERT INTO media_assets (id, mime_type, bytes, size_bytes)
          VALUES (${mediaId}, ${"image/webp"}, decode(${hexBody}, 'hex'), ${optimized.byteLength})
        `;

        replacements.set(blobUrl, `/api/media/${mediaId}`);
        uploaded += 1;
      } catch (error) {
        failures.push({
          url: blobUrl,
          reason: error instanceof Error ? error.message : String(error),
        });
      } finally {
        processed += 1;
        if (processed % 20 === 0 || processed === blobUrls.length) {
          console.log(`Progression images: ${processed}/${blobUrls.length}`);
        }
      }
    }
  }

  const workers = Array.from({ length: Math.min(FETCH_CONCURRENCY, blobUrls.length) }, () => worker());
  await Promise.all(workers);

  let productsUpdated = 0;
  let blobRefsRemoved = 0;

  for (const product of products) {
    const nextImages = uniqueUrls(
      product.images.map((value) => replaceUrl(value, replacements)).filter(Boolean)
    );

    const nextColorImages = {};
    for (const [color, values] of Object.entries(product.colorImages)) {
      if (!Array.isArray(values)) continue;
      const replaced = uniqueUrls(values.map((value) => replaceUrl(value, replacements)).filter(Boolean));
      if (replaced.length > 0) {
        nextColorImages[color] = replaced;
      }
    }

    let nextImage = replaceUrl(product.image, replacements) || "";
    if (!nextImage) {
      nextImage = nextImages[0] || FALLBACK_IMAGE;
    }

    const mergedImages = uniqueUrls([nextImage, ...nextImages]);
    const finalImage = mergedImages[0] || FALLBACK_IMAGE;
    const finalImages = mergedImages.length > 0 ? mergedImages : [FALLBACK_IMAGE];

    const beforeBlobRefs = [
      product.image,
      ...product.images.map((v) => toUrlString(v)),
      ...Object.values(product.colorImages).flatMap((values) =>
        Array.isArray(values) ? values.map((v) => toUrlString(v)) : []
      ),
    ].filter((v) => v && isBlobUrl(v)).length;

    const afterBlobRefs = [
      finalImage,
      ...finalImages,
      ...Object.values(nextColorImages).flatMap((values) =>
        Array.isArray(values) ? values : []
      ),
    ].filter((v) => isBlobUrl(v)).length;

    const changed =
      finalImage !== product.image ||
      JSON.stringify(finalImages) !== JSON.stringify(parseArray(product.images)) ||
      JSON.stringify(nextColorImages) !== JSON.stringify(parseObject(product.colorImages));

    blobRefsRemoved += Math.max(0, beforeBlobRefs - afterBlobRefs);

    if (!changed) continue;

    await sql`
      UPDATE products
      SET image = ${finalImage},
          images = ${JSON.stringify(finalImages)},
          color_images = ${JSON.stringify(nextColorImages)}
      WHERE id = ${product.id}
    `;
    productsUpdated += 1;
  }

  const [blobRemain] = await sql`
    SELECT count(*)::int AS count
    FROM products
    WHERE image LIKE ${`%${BLOB_HOST_SUFFIX}%`}
       OR COALESCE(images::text, '') LIKE ${`%${BLOB_HOST_SUFFIX}%`}
       OR COALESCE(color_images::text, '') LIKE ${`%${BLOB_HOST_SUFFIX}%`}
  `;

  const [mediaTotals] = await sql`
    SELECT count(*)::int AS count, COALESCE(sum(size_bytes), 0)::bigint AS bytes
    FROM media_assets
  `;

  console.log("");
  console.log("Migration terminée.");
  console.log(`- Images Blob détectées: ${blobUrls.length}`);
  console.log(`- Images migrées en DB: ${uploaded}`);
  console.log(`- Échecs téléchargement: ${failures.length}`);
  console.log(`- Produits mis à jour: ${productsUpdated}`);
  console.log(`- Références Blob supprimées: ${blobRefsRemoved}`);
  console.log(`- Références Blob restantes: ${Number(blobRemain?.count || 0)}`);
  console.log(
    `- media_assets total: ${Number(mediaTotals?.count || 0)} images (${Number(
      mediaTotals?.bytes || 0
    )} bytes)`
  );

  if (failures.length > 0) {
    console.log("");
    console.log("Exemples d'échec (max 10):");
    for (const item of failures.slice(0, 10)) {
      console.log(`- ${item.url} -> ${item.reason}`);
    }
  }
}

main().catch((error) => {
  console.error("Migration échouée:", error);
  process.exit(1);
});
