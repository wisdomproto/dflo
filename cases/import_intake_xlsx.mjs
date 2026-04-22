// Import Google Forms intake responses into Supabase.
//
// Usage:
//   node cases/import_intake_xlsx.mjs [--dry-run]
//
// Matches by exact (name, birth_date). Skips records that don't match, and
// skips children whose DB row has a different dob from the xlsx row.
// Only writes answered fields — blanks leave existing DB values untouched.

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const INPUT = resolve(HERE, 'intake_xlsx_parsed.json');

function loadEnv(p) {
  try {
    const t = readFileSync(p, 'utf8');
    const o = {};
    for (const l of t.split(/\r?\n/)) {
      const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return o;
  } catch {
    return {};
  }
}

const v4 = loadEnv(resolve(ROOT, 'v4', '.env.local'));
const ai = loadEnv(resolve(ROOT, 'ai-server', '.env'));
const URL = v4.VITE_SUPABASE_URL || ai.SUPABASE_URL;
const KEY = ai.SUPABASE_SERVICE_ROLE_KEY || v4.VITE_SUPABASE_ANON_KEY;
if (!URL || !KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}
const supabase = createClient(URL, KEY, { auth: { persistSession: false } });
const DRY_RUN = process.argv.includes('--dry-run');

// ──────────────────────────────────────────────
// Coercers

function parseNum(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s === '평균') return null;
  // "185이상" / "185.0" / "3.2" / "3.8kg" / "3~5cm"
  const range = s.match(/(\d+(?:\.\d+)?)\s*[~\-–]\s*(\d+(?:\.\d+)?)/);
  if (range) return (parseFloat(range[1]) + parseFloat(range[2])) / 2;
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}
const parseInt_ = (r) => {
  const n = parseNum(r);
  return n == null ? null : Math.round(n);
};

function parseYesNo(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s === '예') return true;
  if (s === '아니오') return false;
  return null;
}

// Roman numerals at start: "Ⅰ." "Ⅱ." "Ⅲ." "Ⅳ." "Ⅴ." (U+2160..)
function parseTanner(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const map = { 'Ⅰ': 1, 'Ⅱ': 2, 'Ⅲ': 3, 'Ⅳ': 4, 'Ⅴ': 5, I: 1, II: 2, III: 3, IV: 4, V: 5 };
  for (const [k, v] of Object.entries(map)) {
    if (s.startsWith(k)) return v;
  }
  return null;
}

function parseGrowthPattern(raw) {
  if (!raw) return null;
  const s = String(raw);
  const flags = { rapid_growth: false, slowed: false, puberty_concern: false };
  let touched = false;
  if (s.includes('많이 자랐')) { flags.rapid_growth = true; touched = true; }
  if (s.includes('급격히 줄')) { flags.slowed = true; touched = true; }
  if (s.includes('성조숙')) { flags.puberty_concern = true; touched = true; }
  return touched ? flags : null;
}

// Map Google Forms short-stature option text → enum code. Text is lenient:
// forms use slightly different punctuation ("밥을 잘 먹지 않고 편식을 해요." vs
// "밥을 잘 먹지 않고, 편식을 해요."), so match on stable substrings.
function parseShortStature(raw) {
  if (!raw) return { causes: null, other: null };
  const s = String(raw);
  const causes = [];
  if (s.includes('부모님의 키가 작')) causes.push('parents_short');
  if (s.includes('키 차이가 커') || s.includes('키 차이가 큰')) causes.push('parents_height_gap');
  if (s.includes('편식')) causes.push('picky_eating');
  if (s.includes('성장이 빨리 멈')) causes.push('parents_early_stop');
  if (s.includes('수면시간이 부족')) causes.push('insufficient_sleep');
  if (s.includes('지속적으로 치료') || s.includes('치료받는 질환')) causes.push('chronic_illness');
  // Anything after the known options in a comma-split — preserve as "other"
  const knownMarkers = [
    '부모님의 키가 작', '키 차이가 커', '키 차이가 큰', '편식',
    '성장이 빨리 멈', '수면시간이 부족', '지속적으로 치료', '치료받는 질환',
  ];
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  const otherParts = parts.filter((p) => !knownMarkers.some((m) => p.includes(m)));
  const other = otherParts.length ? otherParts.join(', ') : null;
  return { causes: causes.length ? [...new Set(causes)] : null, other };
}

function buildGrowthHistory(map) {
  if (!map) return null;
  const base = [8, 9, 10, 11, 12, 13, 14, 15, 16].map((age) => ({ age, height: null }));
  let touched = false;
  for (const [ageStr, raw] of Object.entries(map)) {
    const age = parseInt(ageStr, 10);
    const h = parseNum(raw);
    const e = base.find((b) => b.age === age);
    if (e && h != null) {
      e.height = h;
      touched = true;
    }
  }
  return touched ? base : null;
}

// ──────────────────────────────────────────────
// Patch builder

function buildPatches(row) {
  const child = {};
  const survey = {};

  const bw = parseNum(row.birth_week_raw);
  if (bw != null) child.birth_week = Math.round(bw);

  const bwt = parseNum(row.birth_weight_raw);
  if (bwt != null) child.birth_weight = bwt;

  if (row.birth_notes) child.birth_notes = row.birth_notes;
  if (row.grade) child.grade = row.grade;
  if (row.class_height_rank) child.class_height_rank = row.class_height_rank;

  const dh = parseInt_(row.desired_height_raw);
  if (dh != null) child.desired_height = dh;

  const fh = parseInt_(row.father_height_raw);
  if (fh != null) child.father_height = fh;

  const mh = parseInt_(row.mother_height_raw);
  if (mh != null) child.mother_height = mh;

  const pi = parseYesNo(row.parents_interested_raw);
  if (pi != null) survey.parents_interested = pi;

  const ci = parseYesNo(row.child_interested_raw);
  if (ci != null) survey.child_interested = ci;

  const pc = parseYesNo(row.past_clinic_consult_raw);
  if (pc != null) survey.past_clinic_consult = pc;

  if (row.chronic_conditions) survey.chronic_conditions = row.chronic_conditions;

  const sa = parseYesNo(row.sports_athlete_raw);
  if (sa != null) survey.sports_athlete = sa;

  if (row.sports_event) survey.sports_event = row.sports_event;

  const flags = parseGrowthPattern(row.growth_pattern_raw);
  if (flags) survey.growth_flags = flags;

  const { causes, other } = parseShortStature(row.short_stature_raw);
  if (causes) survey.short_stature_causes = causes;
  if (other) survey.short_stature_other = other;

  // Tanner: pick column that matches reported gender; fall back to whichever filled.
  const tannerText = row.tanner_male_raw || row.tanner_female_raw;
  const tanner = parseTanner(tannerText);
  if (tanner != null) survey.tanner_stage = tanner;

  const gh = buildGrowthHistory(row.growth_history_raw);
  if (gh) survey.growth_history = gh;

  return { child, survey };
}

// ──────────────────────────────────────────────

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'}`);
  const rows = JSON.parse(readFileSync(INPUT, 'utf8'));
  const { data: children, error } = await supabase
    .from('children')
    .select('id, chart_number, name, birth_date, intake_survey');
  if (error) throw error;
  const byKey = new Map(children.map((c) => [`${c.name}|${c.birth_date}`, c]));

  const stats = { total: 0, noMatch: 0, emptyPatch: 0, updated: 0, errors: 0 };
  for (const r of rows) {
    stats.total++;
    const key = `${r.name}|${r.birth_date}`;
    const child = byKey.get(key);
    if (!child) {
      stats.noMatch++;
      continue;
    }
    const patch = buildPatches(r);
    const childKeys = Object.keys(patch.child);
    const surveyKeys = Object.keys(patch.survey);
    if (!childKeys.length && !surveyKeys.length) {
      stats.emptyPatch++;
      continue;
    }
    const currentSurvey = child.intake_survey ?? {};
    const mergedSurvey = {
      ...currentSurvey,
      ...patch.survey,
      growth_flags: patch.survey.growth_flags
        ? { ...(currentSurvey.growth_flags ?? {}), ...patch.survey.growth_flags }
        : currentSurvey.growth_flags,
      updated_at: new Date().toISOString(),
    };
    const update = { ...patch.child };
    if (surveyKeys.length) update.intake_survey = mergedSurvey;
    update.updated_at = new Date().toISOString();
    try {
      if (!DRY_RUN) {
        const { error: upErr } = await supabase.from('children').update(update).eq('id', child.id);
        if (upErr) throw upErr;
      }
      stats.updated++;
      console.log(`  [ok] ${child.chart_number} ${child.name} (${child.birth_date}) · child[${childKeys.join(',')}] survey[${surveyKeys.join(',')}]`);
    } catch (e) {
      stats.errors++;
      console.error(`  [error] ${child.name}: ${e.message}`);
    }
  }
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
