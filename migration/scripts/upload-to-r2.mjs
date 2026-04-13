// Upload migration/data/website.json + migration/images/** to R2.
// Reads credentials from ai-server/.env
// Usage: node migration/scripts/upload-to-r2.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load ai-server/.env
const envPath = resolve(__dirname, '../../ai-server/.env');
const envText = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envText.split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]; })
);

const {
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL,
} = env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('Missing R2_* env vars in ai-server/.env');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});
const publicUrl = (R2_PUBLIC_URL || '').replace(/\/$/, '');

function contentTypeOf(name) {
  const ext = name.toLowerCase().split('.').pop();
  return {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif', json: 'application/json',
  }[ext] || 'application/octet-stream';
}

async function put(key, buf, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buf,
    ContentType: contentType,
    CacheControl: contentType === 'application/json' ? 'no-cache' : 'public, max-age=31536000, immutable',
  }));
  console.log(`  ✓ ${key} → ${publicUrl}/${key}`);
}

// 1) Build website.json (transform image URLs to R2 URLs)
const sectionsRaw = JSON.parse(
  readFileSync(resolve(__dirname, '../data/website_sections.json'), 'utf-8')
);
const imageMapping = JSON.parse(
  readFileSync(resolve(__dirname, '../data/image-mapping.json'), 'utf-8')
);

// Rewrite Supabase image URLs → R2 public URLs inside the JSON
function rewrite(obj) {
  if (typeof obj === 'string') {
    const relPath = imageMapping[obj];
    if (relPath) return `${publicUrl}/images/${relPath}`;
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(rewrite);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = rewrite(v);
    return out;
  }
  return obj;
}

const sections = sectionsRaw
  .map((row) => ({
    id: row.id,
    order_index: row.order_index,
    title: row.title || '',
    slides: rewrite(row.slides || []),
    showNav: row.show_nav ?? true,
  }))
  .sort((a, b) => a.order_index - b.order_index);

console.log(`\nUploading website.json (${sections.length} sections)...`);
await put('website.json', JSON.stringify(sections, null, 2), 'application/json');

// 2) Upload all images preserving bucket/folder path → images/<original-bucket>/<path>
const imagesDir = resolve(__dirname, '../images');
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = resolve(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
const files = walk(imagesDir);
console.log(`\nUploading ${files.length} images...`);
for (const f of files) {
  const rel = relative(imagesDir, f).replace(/\\/g, '/');
  const key = `images/${rel}`;
  await put(key, readFileSync(f), contentTypeOf(f));
}

console.log('\n✅ Done. Public base:', publicUrl);
console.log('   website.json:', `${publicUrl}/website.json`);
