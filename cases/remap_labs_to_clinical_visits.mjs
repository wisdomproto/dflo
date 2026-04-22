// Re-point lab_tests.visit_id from lab-only visits (generated during the
// original lab OCR import) to the nearest "clinical" visit — one that has an
// actual measurement, notes, or is_intake flag. Clinically labs are drawn
// before the visit, so we prefer the next clinical visit within 90 days after
// collected_date, falling back to the previous visit within 30 days.
//
//   node cases/remap_labs_to_clinical_visits.mjs [--dry-run]
//
// After remap, any lab-only visit that loses all its labs is deleted.

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

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

async function fetchAll(table, sel) {
  let from = 0,
    out = [];
  while (true) {
    const { data, error } = await supabase.from(table).select(sel).range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}

async function main() {
  console.log(`Mode: ${DRY ? 'DRY RUN' : 'WRITE'}`);
  const visits = await fetchAll('visits', 'id, child_id, visit_date, notes, is_intake');
  const ms = await fetchAll('hospital_measurements', 'visit_id');
  const labs = await fetchAll('lab_tests', 'id, visit_id, child_id, collected_date');

  const visitHasMeasurement = new Set(ms.map((m) => m.visit_id));
  const visitById = new Map(visits.map((v) => [v.id, v]));
  const clinicalByChild = new Map();
  for (const v of visits) {
    const clinical = v.is_intake || visitHasMeasurement.has(v.id) || (v.notes && v.notes.trim());
    if (!clinical) continue;
    if (!clinicalByChild.has(v.child_id)) clinicalByChild.set(v.child_id, []);
    clinicalByChild.get(v.child_id).push(v);
  }

  let remapped = 0,
    skippedAlreadyClinical = 0,
    noMatch = 0,
    errors = 0;
  const reassigned = new Set(); // old visit ids that lost ≥1 lab
  const stillReferenced = new Set(); // old visit ids that still host a lab

  for (const lab of labs) {
    const host = visitById.get(lab.visit_id);
    if (!host) continue;
    const isClinical =
      host.is_intake || visitHasMeasurement.has(host.id) || (host.notes && host.notes.trim());
    if (isClinical) {
      skippedAlreadyClinical++;
      stillReferenced.add(host.id);
      continue;
    }

    const collected = new Date(lab.collected_date || host.visit_date).getTime();
    const clinicals = clinicalByChild.get(lab.child_id) ?? [];
    let best = null,
      bestScore = Infinity;
    for (const c of clinicals) {
      const diffDays = (new Date(c.visit_date).getTime() - collected) / (24 * 3600 * 1000);
      if (diffDays < -30 || diffDays > 90) continue;
      // Prefer visits on or after collected_date — weight past visits double.
      const score = diffDays >= 0 ? diffDays : -2 * diffDays;
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (!best) {
      noMatch++;
      stillReferenced.add(host.id);
      continue;
    }

    if (!DRY) {
      const { error } = await supabase
        .from('lab_tests')
        .update({ visit_id: best.id, updated_at: new Date().toISOString() })
        .eq('id', lab.id);
      if (error) {
        console.error(`lab ${lab.id} remap failed:`, error.message);
        errors++;
        stillReferenced.add(host.id);
        continue;
      }
    }
    remapped++;
    reassigned.add(host.id);
  }

  // Delete lab-only visits that no longer host any lab.
  const toDelete = [...reassigned].filter((vid) => !stillReferenced.has(vid));
  let deleted = 0;
  if (!DRY) {
    const CHUNK = 50;
    for (let i = 0; i < toDelete.length; i += CHUNK) {
      const slice = toDelete.slice(i, i + CHUNK);
      const { error } = await supabase.from('visits').delete().in('id', slice);
      if (error) {
        console.error('visit delete batch failed:', error.message);
        errors++;
      } else {
        deleted += slice.length;
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log({
    labs_total: labs.length,
    already_clinical: skippedAlreadyClinical,
    remapped,
    no_match_kept_on_original: noMatch,
    orphan_visits_to_delete: toDelete.length,
    orphan_visits_deleted: DRY ? 0 : deleted,
    errors,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
