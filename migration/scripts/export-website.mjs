// Export tables via Supabase PostgREST using service_role key.
// Usage: node migration/scripts/export-website.mjs

import { writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../v4/.env.local');
const envText = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envText.split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const url = env.VITE_SUPABASE_URL;
const key = env['service_role key'];

if (!url || !key) {
  console.error('Missing Supabase URL or service role key');
  process.exit(1);
}

const outDir = resolve(__dirname, '../data');

async function exportTable(name) {
  const res = await fetch(`${url}/rest/v1/${name}?select=*`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) {
    console.error(`[${name}] ${res.status} ${res.statusText}: ${await res.text()}`);
    return null;
  }
  const data = await res.json();
  const file = resolve(outDir, `${name}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`[${name}] ${data.length} rows → ${file}`);
  return data;
}

const tables = ['website_sections', 'website_banners', 'growth_cases', 'growth_guides', 'recipes'];

console.log('Exporting Supabase tables (service_role)...\n');
for (const t of tables) {
  await exportTable(t);
}

// Collect image URLs from website_sections
try {
  const sections = JSON.parse(readFileSync(resolve(outDir, 'website_sections.json'), 'utf-8'));
  const imageUrls = new Set();
  function collectUrls(obj) {
    if (!obj) return;
    if (typeof obj === 'string') {
      if (obj.startsWith('http') && obj.includes('supabase')) imageUrls.add(obj);
      return;
    }
    if (Array.isArray(obj)) { obj.forEach(collectUrls); return; }
    if (typeof obj === 'object') Object.values(obj).forEach(collectUrls);
  }
  sections.forEach((s) => collectUrls(s.slides));
  writeFileSync(resolve(outDir, 'image-urls.json'), JSON.stringify([...imageUrls], null, 2));
  console.log(`\nSupabase-hosted image URLs in sections: ${imageUrls.size} → data/image-urls.json`);
} catch (e) {
  console.error('Image URL collection failed:', e.message);
}
