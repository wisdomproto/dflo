// Download all Supabase-hosted images referenced in website_sections.
// Usage: node migration/scripts/download-images.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const urls = JSON.parse(
  readFileSync(resolve(__dirname, '../data/image-urls.json'), 'utf-8')
);

const outDir = resolve(__dirname, '../images');
mkdirSync(outDir, { recursive: true });

// Preserve storage path structure: <bucket>/<path>
// e.g. content-images/banners/abc.jpg -> images/content-images/banners/abc.jpg
function extractPath(url) {
  const m = url.match(/\/storage\/v1\/object\/public\/(.+)$/);
  return m ? m[1] : null;
}

let success = 0, failed = 0;
const mapping = {}; // old URL -> relative path

for (const url of urls) {
  const relPath = extractPath(url);
  if (!relPath) { console.error('skip (not public storage):', url); failed++; continue; }

  const localPath = resolve(outDir, relPath);
  mkdirSync(dirname(localPath), { recursive: true });

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(localPath, buf);
    mapping[url] = relPath;
    console.log(`✓ ${relPath} (${(buf.length / 1024).toFixed(1)} KB)`);
    success++;
  } catch (e) {
    console.error(`✗ ${url}: ${e.message}`);
    failed++;
  }
}

writeFileSync(
  resolve(__dirname, '../data/image-mapping.json'),
  JSON.stringify(mapping, null, 2)
);

console.log(`\nDone. ${success} downloaded, ${failed} failed. Mapping → data/image-mapping.json`);
