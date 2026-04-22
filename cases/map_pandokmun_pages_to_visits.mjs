// Use the per-chart data.json written by the OCR pipeline to build a
// visit_id → [source_image, ...] map, then persist it under
//   children.intake_survey.raw_files.pandokmun_by_visit
// so VisitDetailPanel can render the page(s) for the selected visit.
//
//   node cases/map_pandokmun_pages_to_visits.mjs [--dry-run]

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OCR_DIR = resolve(HERE, '판독문_ocr');

function loadEnv(p) {
  try {
    return Object.fromEntries(
      readFileSync(p, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
    );
  } catch {
    return {};
  }
}
const v4 = loadEnv(resolve(ROOT, 'v4', '.env.local'));
const ai = loadEnv(resolve(ROOT, 'ai-server', '.env'));
const supabase = createClient(
  v4.VITE_SUPABASE_URL || ai.SUPABASE_URL,
  ai.SUPABASE_SERVICE_ROLE_KEY || v4.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);
const DRY = process.argv.includes('--dry-run');

async function main() {
  const { data: children } = await supabase.from('children').select('id, chart_number, intake_survey');
  const byChart = new Map(children.map((c) => [c.chart_number, c]));

  // Preload all visits so we can resolve ocr-only rows (visit_id=null) by
  // matching their date against a DB visit on the same day — the importer
  // generated those visits from the OCR row's date.
  const visitsByChild = new Map();
  {
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('visits')
        .select('id, child_id, visit_date')
        .range(from, from + 999);
      if (error) throw error;
      if (!data?.length) break;
      for (const v of data) {
        if (!visitsByChild.has(v.child_id)) visitsByChild.set(v.child_id, new Map());
        // If multiple visits share a date, keep them all so we can attach the
        // image to every matching visit rather than silently picking one.
        const map = visitsByChild.get(v.child_id);
        if (!map.has(v.visit_date)) map.set(v.visit_date, []);
        map.get(v.visit_date).push(v.id);
      }
      if (data.length < 1000) break;
      from += 1000;
    }
  }

  const charts = readdirSync(OCR_DIR).filter((e) => /^\d+$/.test(e));
  let patched = 0, mapped_visits = 0, no_child = 0, no_data = 0, resolved_via_date = 0;

  for (const chart of charts) {
    const child = byChart.get(chart);
    if (!child) { no_child++; continue; }
    const jp = join(OCR_DIR, chart, 'data.json');
    if (!existsSync(jp)) { no_data++; continue; }
    let data;
    try { data = JSON.parse(readFileSync(jp, 'utf8')); } catch { no_data++; continue; }
    const dateMap = visitsByChild.get(child.id) ?? new Map();
    const byVisit = {};
    const attach = (visitId, src) => {
      if (!byVisit[visitId]) byVisit[visitId] = [];
      if (!byVisit[visitId].includes(src)) byVisit[visitId].push(src);
    };
    for (const m of data.measurements ?? []) {
      if (!m.source_image) continue;
      if (m.visit_id) {
        attach(m.visit_id, m.source_image);
        continue;
      }
      // ocr-only row — the import created a visit with visit_date == m.date
      const candidates = m.date ? dateMap.get(m.date) : null;
      if (candidates?.length) {
        for (const vid of candidates) attach(vid, m.source_image);
        resolved_via_date++;
      }
    }
    const visitCount = Object.keys(byVisit).length;
    if (!visitCount) continue;
    mapped_visits += visitCount;

    if (DRY) { patched++; continue; }

    const survey = child.intake_survey ?? {};
    const merged = {
      ...survey,
      raw_files: {
        ...(survey.raw_files ?? {}),
        pandokmun_by_visit: byVisit,
      },
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('children')
      .update({ intake_survey: merged })
      .eq('id', child.id);
    if (error) {
      console.error(`  ${chart}: ${error.message}`);
      continue;
    }
    patched++;
    if (patched % 40 === 0) process.stdout.write('.');
  }

  console.log('\n=== Summary ===');
  console.log({ patched, mapped_visits, resolved_via_date, no_child, no_data });
}

main().catch((e) => { console.error(e); process.exit(1); });
