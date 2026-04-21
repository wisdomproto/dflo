// Import 환자 리스트 xlsx → children + visits.
//
// Source: cases/성장치료 환자 리스트 260421.xlsx (병원 처방 로그, 한 행 = 한 처방)
// Per chart_number we take the first non-empty row's metadata:
//   성명, 주민번호, 주소, 우편번호, 휴대폰, 이메일
// Birth date + gender come from the RRN century digit.
// Every unique 처방일자 (YYYY-MM-DD) becomes a visit (is_intake=false); the
// 초재진구분 column marks '초진' rows as chief_complaint='초진'.
//
// Existing children/visits are preserved; we UPDATE children with newly
// available fields and INSERT only visits that don't already exist on that
// date.
//
// Contact fields (address / phone / email / zipcode / rrn) are stored inside
// children.intake_survey.contact until migration 009 promotes them to real
// columns.

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const ROSTER_JSON = resolve(HERE, '_patient_roster.json');
const AI_ENV = resolve(ROOT, 'ai-server', '.env');

const envTxt = readFileSync(AI_ENV, 'utf8');
const env = {};
for (const line of envTxt.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const s = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PARENT_EMAIL = 'ocr-import@187growth.com';

// ────────────────────────────────────────────────────────────────────
// Parse RRN → { birthDate, gender }

function parseRrn(rrn) {
  if (!rrn) return {};
  const m = String(rrn).trim().match(/^(\d{2})(\d{2})(\d{2})-?(\d)/);
  if (!m) return {};
  const [, yy, mm, dd, cent] = m;
  // 1/2 → 1900s male/female; 3/4 → 2000s male/female; 9/0 → 1800s or foreign
  let century;
  if (['1', '2'].includes(cent)) century = 1900;
  else if (['3', '4', '7', '8'].includes(cent)) century = 2000;
  else century = 1900;
  const year = century + parseInt(yy, 10);
  const gender = ['1', '3', '5', '7'].includes(cent) ? 'male' : 'female';
  return {
    birthDate: `${year}-${mm}-${dd}`,
    gender,
  };
}

function nonEmpty(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

// ────────────────────────────────────────────────────────────────────
// Load roster JSON (produced by dump_roster_to_json.py).

function loadRoster() {
  const raw = JSON.parse(readFileSync(ROSTER_JSON, 'utf8'));
  const patients = new Map();
  const visits = new Map();
  for (const p of raw.patients) {
    patients.set(p.chart_number, p);
    const dm = new Map();
    for (const v of p.visits) dm.set(v.date, { is_first: v.is_first });
    visits.set(p.chart_number, dm);
  }
  return { patients, visits };
}

// ────────────────────────────────────────────────────────────────────
// Upsert helpers

async function ensureParentUser() {
  const { data: existing } = await s
    .from('users')
    .select('id')
    .eq('email', PARENT_EMAIL)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await s
    .from('users')
    .insert({
      email: PARENT_EMAIL,
      name: '랩데이터 임포트 (placeholder)',
      role: 'parent',
      password: 'ocr-import-placeholder',
      is_active: true,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function loadExistingChildren() {
  const { data, error } = await s
    .from('children')
    .select('id, chart_number, name, birth_date, gender, intake_survey');
  if (error) throw error;
  const map = new Map();
  for (const c of data ?? []) {
    if (c.chart_number) map.set(c.chart_number, c);
  }
  return map;
}

async function loadExistingVisits(childIds) {
  const map = new Map(); // child_id → Set<'YYYY-MM-DD'>
  if (!childIds.length) return map;
  const CHUNK = 100;
  for (let i = 0; i < childIds.length; i += CHUNK) {
    const slice = childIds.slice(i, i + CHUNK);
    const { data, error } = await s
      .from('visits')
      .select('child_id, visit_date, is_intake')
      .in('child_id', slice)
      .eq('is_intake', false);
    if (error) throw error;
    for (const v of data ?? []) {
      const set = map.get(v.child_id) ?? new Set();
      set.add(v.visit_date);
      map.set(v.child_id, set);
    }
  }
  return map;
}

// ────────────────────────────────────────────────────────────────────
// Main

async function main() {
  console.log('Loading roster JSON...');
  const { patients, visits } = loadRoster();
  console.log(`  ${patients.size} unique charts, ${[...visits.values()].reduce((sum, m) => sum + m.size, 0)} unique visit-dates`);

  const parentId = await ensureParentUser();
  const existingChildren = await loadExistingChildren();
  console.log(`  DB already has ${existingChildren.size} charted children`);

  // ── Upsert children ──
  const stats = {
    children_updated: 0,
    children_created: 0,
    children_errored: 0,
    visits_inserted: 0,
    visits_existing: 0,
    visits_errored: 0,
  };

  // Pre-load existing visits for all charts we'll touch.
  const existingChildIds = [...existingChildren.values()].map((c) => c.id);
  const existingVisits = await loadExistingVisits(existingChildIds);

  const chartToChildId = new Map();

  for (const [chart, p] of patients) {
    const rrnInfo = parseRrn(p.rrn);
    const contact = {
      address: p.address ?? null,
      zipcode: p.zipcode ?? null,
      phone: p.phone ?? null,
      email: p.email ?? null,
      rrn: p.rrn ?? null,
    };
    const existing = existingChildren.get(chart);
    if (existing) {
      // UPDATE: fill in any missing demographic fields + stash contact into intake_survey.
      const patch = {};
      // Only overwrite name if current name is a placeholder ('환자 <chart>') or the
      // OCR mojibake doesn't match the clean Excel version.
      const placeholderName = /^환자\s/.test(existing.name ?? '');
      if (p.name && (placeholderName || !existing.name)) patch.name = p.name;
      if (rrnInfo.birthDate && !existing.birth_date) patch.birth_date = rrnInfo.birthDate;
      if (rrnInfo.gender && !existing.gender) patch.gender = rrnInfo.gender;
      const mergedSurvey = {
        ...(existing.intake_survey ?? {}),
        contact,
      };
      patch.intake_survey = mergedSurvey;
      const { error } = await s.from('children').update(patch).eq('id', existing.id);
      if (error) {
        console.error(`  update ${chart}: ${error.message}`);
        stats.children_errored += 1;
        continue;
      }
      stats.children_updated += 1;
      chartToChildId.set(chart, existing.id);
    } else {
      // CREATE new child.
      const { data, error } = await s
        .from('children')
        .insert({
          parent_id: parentId,
          name: p.name || `환자 ${chart}`,
          gender: rrnInfo.gender ?? 'male',
          birth_date: rrnInfo.birthDate ?? '2010-01-01',
          chart_number: chart,
          intake_survey: { contact },
          is_active: true,
        })
        .select('id')
        .single();
      if (error) {
        console.error(`  insert ${chart}: ${error.message}`);
        stats.children_errored += 1;
        continue;
      }
      stats.children_created += 1;
      chartToChildId.set(chart, data.id);
    }
  }

  console.log(
    `  children: ${stats.children_created} created, ${stats.children_updated} updated, ${stats.children_errored} err`,
  );

  // ── Insert missing visits ──
  // Collect all new visit rows first, then insert in chunks.
  const visitRowsToInsert = [];
  for (const [chart, dateMap] of visits) {
    const childId = chartToChildId.get(chart);
    if (!childId) continue;
    const existingDates = existingVisits.get(childId) ?? new Set();
    for (const [date, { is_first }] of dateMap) {
      if (existingDates.has(date)) {
        stats.visits_existing += 1;
        continue;
      }
      visitRowsToInsert.push({
        child_id: childId,
        visit_date: date,
        is_intake: false,
        chief_complaint: is_first ? '초진' : null,
        notes: 'Imported from eone roster xlsx',
      });
    }
  }

  const CHUNK = 200;
  for (let i = 0; i < visitRowsToInsert.length; i += CHUNK) {
    const slice = visitRowsToInsert.slice(i, i + CHUNK);
    const { error } = await s.from('visits').insert(slice);
    if (error) {
      console.error(`  visit batch ${i}: ${error.message}`);
      // Fall back to per-row insert to avoid losing the whole batch.
      for (const r of slice) {
        const { error: e2 } = await s.from('visits').insert(r);
        if (e2) stats.visits_errored += 1;
        else stats.visits_inserted += 1;
      }
    } else {
      stats.visits_inserted += slice.length;
    }
    if (i % (CHUNK * 5) === 0) {
      console.log(`  visits progress: ${Math.min(i + CHUNK, visitRowsToInsert.length)}/${visitRowsToInsert.length}`);
    }
  }

  console.log(
    `\n── Summary ──\n` +
      `  children created : ${stats.children_created}\n` +
      `  children updated : ${stats.children_updated}\n` +
      `  children errored : ${stats.children_errored}\n` +
      `  visits inserted  : ${stats.visits_inserted}\n` +
      `  visits existing  : ${stats.visits_existing}\n` +
      `  visits errored   : ${stats.visits_errored}`,
  );
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
