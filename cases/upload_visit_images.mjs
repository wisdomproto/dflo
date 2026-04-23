// Upload cases/영상데이터/{chart}/{YYYYMMDD}/*.webp into Supabase Storage
// (`xray-images` bucket) and insert rows into `visit_images`.
//
// Visit matching: for each chart+date folder, find the visit for that child
// with the closest visit_date (window ±30 days). If none fits, create a new
// visit on the date (notes='Auto-created from image import', is_intake=false).
//
// Storage path convention: `{child_id}/{YYYYMMDD}/{filename}` — keeps RLS
// scoped to child folder and lets us reuse the same bucket as the hand
// X-rays.
//
// Usage:
//   node cases/upload_visit_images.mjs [--dry-run] [--chart 12345] [--limit-files N]
//     [--concurrency 8]
//
// Prereqs: migration 011 applied.

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const IMAGES_ROOT = resolve(HERE, '영상데이터');
const BUCKET = 'xray-images';

function loadEnv(p){const o={};try{for(const l of readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)o[m[1]]=m[2].replace(/^["']|["']$/g,'');}}catch{}return o;}
const v = loadEnv(resolve(ROOT,'v4','.env.local'));
const a = loadEnv(resolve(ROOT,'ai-server','.env'));
const sb = createClient(
  v.VITE_SUPABASE_URL || a.SUPABASE_URL,
  a.SUPABASE_SERVICE_ROLE_KEY || v.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const LIMIT = args.includes('--limit-files') ? parseInt(args[args.indexOf('--limit-files') + 1], 10) : null;
const CHART_ONLY = args.includes('--chart') ? args[args.indexOf('--chart') + 1] : null;
const CONC = args.includes('--concurrency') ? parseInt(args[args.indexOf('--concurrency') + 1], 10) : 8;
const WINDOW_DAYS = 30;

function daysBetween(a, b) { return Math.abs((new Date(a) - new Date(b)) / 86400000); }
function fmtDate(yyyymmdd) {
  if (!/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(0,4)}-${yyyymmdd.slice(4,6)}-${yyyymmdd.slice(6,8)}`;
}

async function fetchAll(table, cols, filter) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(cols).range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

console.log('Loading reference data…');
const children = await fetchAll('children', 'id, chart_number, name');
const childByChart = new Map(
  children
    .filter((c) => c.chart_number)
    .map((c) => [String(c.chart_number).trim(), c]),
);
console.log(`  children with chart: ${childByChart.size}`);

const visits = await fetchAll('visits', 'id, child_id, visit_date, is_intake');
const visitsByChild = new Map();
for (const vv of visits) {
  if (vv.is_intake) continue;
  if (!visitsByChild.has(vv.child_id)) visitsByChild.set(vv.child_id, []);
  visitsByChild.get(vv.child_id).push({ id: vv.id, date: vv.visit_date });
}
for (const arr of visitsByChild.values()) arr.sort((x, y) => x.date.localeCompare(y.date));
console.log(`  visit groups: ${visitsByChild.size}`);

// Existing visit_images (dedup: image_path has UNIQUE index)
const existing = await fetchAll('visit_images', 'image_path');
const existingPaths = new Set(existing.map((r) => r.image_path));
console.log(`  existing visit_images: ${existingPaths.size}`);

// ─── Scan filesystem ────────────────────────────────────────────────
console.log('\nScanning filesystem…');
const tasks = [];                // {child, dateStr, filePath, filename}
const needNewVisit = new Map();  // key `${childId}|${dateStr}` -> {child_id, visit_date}

const chartDirs = readdirSync(IMAGES_ROOT).filter((name) => {
  const full = join(IMAGES_ROOT, name);
  return statSync(full).isDirectory();
});

let totalFiles = 0, skippedNoChart = 0;
for (const chart of chartDirs) {
  if (CHART_ONLY && chart !== CHART_ONLY) continue;
  const chartDir = join(IMAGES_ROOT, chart);
  const child = childByChart.get(chart);
  if (!child) {
    skippedNoChart++;
    continue;
  }
  const dateDirs = readdirSync(chartDir).filter((d) => {
    const full = join(chartDir, d);
    return statSync(full).isDirectory();
  });
  for (const dd of dateDirs) {
    const dateStr = fmtDate(dd);
    if (!dateStr) continue;
    const visitList = visitsByChild.get(child.id) || [];
    let best = null, bestDiff = Infinity;
    for (const vv of visitList) {
      const d = daysBetween(vv.date, dateStr);
      if (d < bestDiff) { bestDiff = d; best = vv; }
    }
    let visitId;
    if (best && bestDiff <= WINDOW_DAYS) {
      visitId = best.id;
    } else {
      const key = `${child.id}|${dateStr}`;
      if (!needNewVisit.has(key)) needNewVisit.set(key, { child_id: child.id, visit_date: dateStr });
      visitId = `PENDING:${key}`;
    }
    const files = readdirSync(join(chartDir, dd))
      .filter((f) => f.toLowerCase().endsWith('.webp'));
    for (const f of files) {
      totalFiles++;
      // Storage keys must be ASCII-safe; strip the Korean name segment from
      // `{chart}_{name}_{date}_CR_{series}_{idx}.webp` and keep the rest.
      const safe = f
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/__+/g, '_')
        .replace(/^_+|_+(?=\.)/g, '');
      const imagePath = `${child.id}/${dd}/${safe}`;
      if (existingPaths.has(imagePath)) continue;
      tasks.push({
        child_id: child.id,
        chart,
        patient_name: child.name,
        date_str: dateStr,
        date_folder: dd,
        visit_id: visitId,
        local_path: join(chartDir, dd, f),
        filename: f,
        image_path: imagePath,
      });
      if (LIMIT && tasks.length >= LIMIT) break;
    }
    if (LIMIT && tasks.length >= LIMIT) break;
  }
  if (LIMIT && tasks.length >= LIMIT) break;
}

console.log(`  charts skipped (not in DB): ${skippedNoChart}`);
console.log(`  total files found: ${totalFiles}`);
console.log(`  files already uploaded: ${totalFiles - tasks.length}`);
console.log(`  files to upload: ${tasks.length}`);
console.log(`  new visits to create: ${needNewVisit.size}`);

if (DRY) { console.log('\n--dry-run: no writes.'); process.exit(0); }

// ─── Create new visits, remap pending ids ───────────────────────────
console.log('\nCreating new visits…');
const pendingKeyToId = new Map();
const pendingList = Array.from(needNewVisit.values()).map((v, i) => ({
  ...v, _k: `${v.child_id}|${v.visit_date}`,
}));
for (let i = 0; i < pendingList.length; i += 500) {
  const chunk = pendingList.slice(i, i + 500).map((v) => ({
    child_id: v.child_id,
    visit_date: v.visit_date,
    notes: 'Auto-created from image import',
    is_intake: false,
  }));
  const { data, error } = await sb.from('visits').insert(chunk).select('id, child_id, visit_date');
  if (error) { console.error('visit insert batch', error.message); continue; }
  for (const row of data) pendingKeyToId.set(`${row.child_id}|${row.visit_date}`, row.id);
  process.stdout.write(`\r  created ${pendingKeyToId.size}/${pendingList.length}`);
}
process.stdout.write('\n');

for (const t of tasks) {
  if (typeof t.visit_id === 'string' && t.visit_id.startsWith('PENDING:')) {
    const key = t.visit_id.slice('PENDING:'.length);
    const id = pendingKeyToId.get(key);
    if (id) t.visit_id = id; else t.visit_id = null;
  }
}

// ─── Parse filename → series_id + image_index ───────────────────────
function parseFilename(name) {
  // {chart}_{name}_{yyyymmdd}_CR_{series}_{idx}.webp
  const m = name.match(/CR_(\d+)_(\d+)\.[^.]+$/i);
  if (!m) return { series_id: null, image_index: null };
  return { series_id: m[1], image_index: parseInt(m[2], 10) };
}

// ─── Parallel upload + insert ───────────────────────────────────────
console.log(`\nUploading ${tasks.length} images (concurrency=${CONC})…`);
const validTasks = tasks.filter((t) => t.visit_id);
let okCount = 0, failCount = 0;
const failures = [];
let idx = 0;
const pending = new Set();
async function worker() {
  while (true) {
    const i = idx++;
    if (i >= validTasks.length) break;
    const t = validTasks[i];
    pending.add(i);
    try {
      const buf = readFileSync(t.local_path);
      // Storage upload
      const { error: upErr } = await sb.storage.from(BUCKET).upload(t.image_path, buf, {
        upsert: false,
        contentType: 'image/webp',
      });
      // "already exists" is fine — continue to DB insert for dedup safety
      if (upErr && !/already exists/i.test(upErr.message || '')) {
        throw new Error(`storage: ${upErr.message}`);
      }
      const parsed = parseFilename(t.filename);
      const { error: dbErr } = await sb.from('visit_images').insert({
        visit_id: t.visit_id,
        child_id: t.child_id,
        image_path: t.image_path,
        source_file: t.filename,
        series_id: parsed.series_id,
        image_index: parsed.image_index,
      });
      if (dbErr && !/duplicate key/i.test(dbErr.message || '')) {
        throw new Error(`db: ${dbErr.message}`);
      }
      okCount++;
    } catch (e) {
      failCount++;
      failures.push({ file: t.image_path, error: e.message });
    } finally {
      pending.delete(i);
    }
    if ((okCount + failCount) % 50 === 0) {
      process.stdout.write(`\r  ${okCount + failCount}/${validTasks.length}  ok=${okCount} fail=${failCount}`);
    }
  }
}

await Promise.all(Array.from({ length: CONC }, () => worker()));
process.stdout.write(`\r  ${okCount + failCount}/${validTasks.length}  ok=${okCount} fail=${failCount}\n`);

if (failures.length) {
  console.log('\nFirst 10 failures:');
  for (const f of failures.slice(0, 10)) console.log(`  ${f.file}: ${f.error}`);
  console.log(`(total failures: ${failures.length})`);
}
console.log('Done.');
