/**
 * Remappe les entrees `/api/media/...` presentes dans `products.images`
 * vers des URLs Blob, en conservant les blobs deja presents.
 *
 * Matching:
 * - On ordonne les slots media par timestamp produit (id base36).
 * - On ordonne les blobs libres par timestamp du pathname (`products/<ts>-...`).
 * - On applique un appariement optimal global (DP monotone) minimisant la somme
 *   des ecarts temporels absolus.
 *
 * Usage:
 *   node scripts/restore-media-entries-to-blob-optimal.mjs         # dry-run
 *   node scripts/restore-media-entries-to-blob-optimal.mjs --apply # applique
 */

import { neon } from "@neondatabase/serverless";
import { list } from "@vercel/blob";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BACKUPS_DIR = path.join(ROOT, "data", "backups");

function parseEnvValue(raw, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = raw.match(new RegExp(`^\\s*${escaped}\\s*=\\s*(.*)\\s*$`, "m"));
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
  if (typeof id !== "string" || id.length < 8) return 0;
  const prefix = id.slice(0, 8);
  const value = parseInt(prefix, 36);
  if (!Number.isFinite(value)) return 0;
  if (value < 1_600_000_000_000 || value > 1_900_000_000_000) return 0;
  return value;
}

function blobTimestampFromPath(pathname) {
  const match = String(pathname || "").match(/^products\/(\d{10,14})-/);
  if (!match?.[1]) return 0;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : 0;
}

function asStringArray(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

function summarize(values) {
  if (values.length === 0) {
    return { min: null, p50: null, p75: null, p90: null, p95: null, max: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const pick = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  return {
    min: sorted[0],
    p50: pick(0.5),
    p75: pick(0.75),
    p90: pick(0.9),
    p95: pick(0.95),
    max: sorted[sorted.length - 1],
  };
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
        ts,
      });
    }
    cursor = result.cursor;
    if (!result.hasMore) break;
  } while (true);
  blobs.sort((a, b) => a.ts - b.ts);
  return blobs;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const dbUrl = await resolveDatabaseUrl();
  if (!dbUrl) throw new Error("DATABASE_URL introuvable.");
  const blobToken = await resolveBlobToken();
  if (!blobToken) throw new Error("BLOB_READ_WRITE_TOKEN introuvable.");

  const sql = neon(dbUrl);
  const rows = await sql`SELECT id, slug, name, image, images FROM products ORDER BY id`;
  const products = rows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    image: typeof row.image === "string" ? row.image : "",
    images: asStringArray(row.images),
    ts: productTimestampFromId(String(row.id)),
  }));

  const blobs = await listProductBlobs(blobToken);

  const usedBlobUrls = new Set();
  for (const product of products) {
    const all = [product.image, ...product.images];
    for (const url of all) {
      if (typeof url === "string" && url.includes(".blob.vercel-storage.com")) {
        usedBlobUrls.add(url);
      }
    }
  }

  const freeBlobs = blobs.filter((blob) => !usedBlobUrls.has(blob.url));

  const slots = [];
  for (const product of products) {
    for (let index = 0; index < product.images.length; index += 1) {
      if (product.images[index].startsWith("/api/media/")) {
        slots.push({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          ts: product.ts,
          index,
        });
      }
    }
  }
  slots.sort(
    (a, b) =>
      a.ts - b.ts ||
      a.productId.localeCompare(b.productId) ||
      a.index - b.index
  );

  const slotCount = slots.length;
  const blobCount = freeBlobs.length;
  if (slotCount === 0) {
    console.log(
      JSON.stringify(
        {
          mode: apply ? "apply" : "dry-run",
          message: "Aucun slot /api/media a remapper.",
          productsTotal: products.length,
        },
        null,
        2
      )
    );
    return;
  }
  if (blobCount < slotCount) {
    throw new Error(
      `Pas assez de blobs libres (${blobCount}) pour ${slotCount} slots media.`
    );
  }

  // DP monotone: min sum |slot.ts - blob.ts|
  const n = slotCount;
  const m = blobCount;
  const INF = 1e30;
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const take = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));

  for (let j = 0; j <= m; j += 1) dp[0][j] = 0;
  for (let i = 1; i <= n; i += 1) dp[i][0] = INF;

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const skip = dp[i][j - 1];
      const cost = Math.abs(slots[i - 1].ts - freeBlobs[j - 1].ts);
      const use = dp[i - 1][j - 1] + cost;
      if (use < skip) {
        dp[i][j] = use;
        take[i][j] = 1;
      } else {
        dp[i][j] = skip;
      }
    }
  }

  const slotToBlobIdx = new Array(n).fill(-1);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (take[i][j] === 1) {
      slotToBlobIdx[i - 1] = j - 1;
      i -= 1;
      j -= 1;
    } else {
      j -= 1;
    }
  }
  if (i !== 0) {
    throw new Error("Backtrack DP impossible.");
  }

  const patchByProduct = new Map();
  const deltasMin = [];
  for (let k = 0; k < n; k += 1) {
    const slot = slots[k];
    const blob = freeBlobs[slotToBlobIdx[k]];
    const delta = Math.abs(slot.ts - blob.ts) / 60000;
    deltasMin.push(delta);
    if (!patchByProduct.has(slot.productId)) {
      const product = products.find((p) => p.id === slot.productId);
      patchByProduct.set(slot.productId, {
        id: slot.productId,
        slug: slot.slug,
        name: slot.name,
        image: product?.image || "",
        images: [...(product?.images || [])],
        replacements: [],
      });
    }
    const patch = patchByProduct.get(slot.productId);
    patch.images[slot.index] = blob.url;
    patch.replacements.push({
      index: slot.index,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      deltaMin: delta,
    });
  }

  const patches = Array.from(patchByProduct.values()).map((patch) => {
    const nextImages = patch.images.filter((u) => typeof u === "string" && u.trim());
    const nextImage = nextImages[0] || patch.image;
    return {
      ...patch,
      nextImage,
      nextImages,
    };
  });

  const summary = {
    mode: apply ? "apply" : "dry-run",
    productsTotal: products.length,
    slotsMapped: n,
    productsTouched: patches.length,
    freeBlobs: m,
    deltaMin: summarize(deltasMin),
    over10min: deltasMin.filter((d) => d > 10).length,
    over30min: deltasMin.filter((d) => d > 30).length,
  };

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          summary,
          sample: patches.slice(0, 20),
        },
        null,
        2
      )
    );
    return;
  }

  await mkdir(BACKUPS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUPS_DIR, `products-before-media-to-blob-${stamp}.json`);

  const backupRows = patches.map((patch) => {
    const current = products.find((p) => p.id === patch.id);
    return {
      id: patch.id,
      slug: patch.slug,
      name: patch.name,
      image: current?.image || "",
      images: current?.images || [],
    };
  });

  await writeFile(
    backupPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        summary,
        backupRows,
        patches,
      },
      null,
      2
    ),
    "utf-8"
  );

  for (const patch of patches) {
    await sql`
      UPDATE products
      SET image = ${patch.nextImage},
          images = ${JSON.stringify(patch.nextImages)}
      WHERE id = ${patch.id}
    `;
  }

  const [post] = await sql`
    SELECT count(*)::int AS media_count
    FROM products
    WHERE image LIKE '/api/media/%'
       OR COALESCE(images::text, '') LIKE '%/api/media/%'
  `;

  console.log(
    JSON.stringify(
      {
        ...summary,
        backupPath,
        remainingMediaRefs: Number(post?.media_count || 0),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("restore-media->blob failed:", error);
  process.exit(1);
});
