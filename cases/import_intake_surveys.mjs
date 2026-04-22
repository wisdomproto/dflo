// Import parsed intake surveys into Supabase.
//
// Usage:
//   node cases/import_intake_surveys.mjs [--dry-run] [chart_number ...]
//
// Reads cases/intake_surveys_parsed.json (produced by parse_intake_surveys.py).
// For every survey:
//   - Look up children by chart_number; skip if not in DB.
//   - Update 1st-class columns (name, birth_date, birth_week, ...) with any answered value.
//   - Merge answered survey fields into children.intake_survey JSONB.
//
// Only answered fields are written — blanks are left as-is.

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const INPUT_PATH = resolve(HERE, 'intake_surveys_parsed.json');
const V4_ENV_PATH = resolve(ROOT, 'v4', '.env.local');
const AI_ENV_PATH = resolve(ROOT, 'ai-server', '.env');

function loadEnv(path) {
  const out = {};
  try {
    const txt = readFileSync(path, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}

const v4Env = loadEnv(V4_ENV_PATH);
const aiEnv = loadEnv(AI_ENV_PATH);
const SUPABASE_URL = v4Env.VITE_SUPABASE_URL || aiEnv.SUPABASE_URL;
const SUPABASE_KEY = aiEnv.SUPABASE_SERVICE_ROLE_KEY || v4Env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}
const USING_SERVICE_ROLE = !!aiEnv.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const chartFilter = new Set(args.filter((a) => !a.startsWith('--')));

// ──────────────────────────────────────────────
// Answer → field converters

function parseNumeric(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // "185~187" → average; "5~6" → 5.5; "150" → 150
  const range = s.match(/^(\d+(?:\.\d+)?)\s*[~\-–]\s*(\d+(?:\.\d+)?)/);
  if (range) {
    const a = parseFloat(range[1]);
    const b = parseFloat(range[2]);
    return (a + b) / 2;
  }
  const single = s.match(/^(\d+(?:\.\d+)?)/);
  return single ? parseFloat(single[1]) : null;
}

function parseInteger(raw) {
  const n = parseNumeric(raw);
  return n == null ? null : Math.round(n);
}

function parseBirthDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // 2015.04.09 / 2015-04-09 / 2015/04/09
  const m = s.match(/^(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if (!m) return null;
  const yyyy = m[1];
  const mm = String(m[2]).padStart(2, '0');
  const dd = String(m[3]).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseYesNo(raw) {
  if (!raw) return null;
  const c = String(raw).trim().toLowerCase().charAt(0);
  if (c === 'a') return true;
  if (c === 'b') return false;
  return null;
}

function parseTanner(raw) {
  if (!raw) return null;
  const c = String(raw).trim().toLowerCase().charAt(0);
  const map = { a: 1, b: 2, c: 3, d: 4, e: 5 };
  return map[c] ?? null;
}

function parseGrowthFlags(raw) {
  // Q20: a→rapid_growth, b→slowed, c→puberty_concern
  if (!raw) return null;
  const c = String(raw).trim().toLowerCase().charAt(0);
  const flags = { rapid_growth: false, slowed: false, puberty_concern: false };
  if (c === 'a') flags.rapid_growth = true;
  else if (c === 'b') flags.slowed = true;
  else if (c === 'c') flags.puberty_concern = true;
  else return null;
  return flags;
}

const CAUSE_MAP = {
  a: 'parents_short',
  b: 'parents_height_gap',
  c: 'picky_eating',
  d: 'parents_early_stop',
  e: 'insufficient_sleep',
  f: 'chronic_illness',
};

function parseShortStatureCauses(raw) {
  // Raw may be "a" or "a,b,c" or "a b c"
  if (!raw) return { causes: null, other: null };
  const s = String(raw).trim().toLowerCase();
  // Collect each letter mention
  const letters = new Set();
  let other = null;
  for (const ch of s) {
    if (/[a-f]/.test(ch)) letters.add(ch);
    if (ch === 'g') other = 'other';
  }
  const causes = [...letters].map((c) => CAUSE_MAP[c]).filter(Boolean);
  return {
    causes: causes.length ? causes : null,
    other: other,
  };
}

function buildGrowthHistory(q11map) {
  // Default ages 8-16, null heights. Overwrite with docx values.
  const base = [8, 9, 10, 11, 12, 13, 14, 15, 16].map((age) => ({ age, height: null }));
  if (!q11map) return null;
  let touched = false;
  for (const [ageStr, raw] of Object.entries(q11map)) {
    const age = parseInt(ageStr, 10);
    const h = parseNumeric(raw);
    const entry = base.find((e) => e.age === age);
    if (entry && h != null) {
      entry.height = h;
      touched = true;
    }
  }
  return touched ? base : null;
}

function textOrNull(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  return s || null;
}

// ──────────────────────────────────────────────
// Build child patch + intake survey patch from parsed raw.

function buildPatches(raw) {
  const child = {};
  const survey = {};

  const name = textOrNull(raw.q1_raw);
  if (name) child.name = name;

  const birth = parseBirthDate(raw.q2_raw);
  if (birth) child.birth_date = birth;

  const week = parseInteger(raw.q3_raw);
  if (week != null) child.birth_week = week;

  const bw = parseNumeric(raw.q4_raw);
  if (bw != null) child.birth_weight = bw;

  const notes = textOrNull(raw.q5_raw);
  if (notes) child.birth_notes = notes;

  const grade = textOrNull(raw.q9_raw);
  if (grade) child.grade = grade;

  const rank = textOrNull(raw.q10_raw);
  if (rank) child.class_height_rank = rank;

  const desired = parseInteger(raw.q12_raw);
  if (desired != null) child.desired_height = desired;

  const father = parseInteger(raw.q13_raw);
  if (father != null) child.father_height = father;

  const mother = parseInteger(raw.q14_raw);
  if (mother != null) child.mother_height = mother;

  // Survey fields
  const growth = buildGrowthHistory(raw.q11_growth_history);
  if (growth) survey.growth_history = growth;

  const sports = parseYesNo(raw.q15_raw);
  if (sports != null) survey.sports_athlete = sports;

  const parents = parseYesNo(raw.q16_raw);
  if (parents != null) survey.parents_interested = parents;

  const child_interested = parseYesNo(raw.q17_raw);
  if (child_interested != null) survey.child_interested = child_interested;

  const past = parseYesNo(raw.q18_raw);
  if (past != null) survey.past_clinic_consult = past;

  const chronic = textOrNull(raw.q19_raw);
  if (chronic) survey.chronic_conditions = chronic;

  const flags = parseGrowthFlags(raw.q20_raw);
  if (flags) survey.growth_flags = flags;

  const tanner = parseTanner(raw.q21_raw);
  if (tanner != null) survey.tanner_stage = tanner;

  const { causes, other } = parseShortStatureCauses(raw.q22_raw);
  if (causes) survey.short_stature_causes = causes;
  if (other) survey.short_stature_other = other;

  return { child, survey };
}

// ──────────────────────────────────────────────

async function findChildByChartNumber(chartNumber) {
  const { data, error } = await supabase
    .from('children')
    .select('id, chart_number, name, intake_survey')
    .eq('chart_number', chartNumber)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function applyPatch(child, patches) {
  const { child: childPatch, survey: surveyPatch } = patches;

  // Merge survey (preserving any existing values)
  const currentSurvey = child.intake_survey ?? {};
  const mergedSurvey = {
    ...currentSurvey,
    ...surveyPatch,
    growth_flags: surveyPatch.growth_flags
      ? { ...(currentSurvey.growth_flags ?? {}), ...surveyPatch.growth_flags }
      : currentSurvey.growth_flags,
    updated_at: new Date().toISOString(),
  };

  const update = { ...childPatch };
  if (Object.keys(surveyPatch).length) update.intake_survey = mergedSurvey;
  update.updated_at = new Date().toISOString();

  if (DRY_RUN) {
    return { update, skipped: false };
  }

  const { error } = await supabase
    .from('children')
    .update(update)
    .eq('id', child.id);
  if (error) throw error;
  return { update, skipped: false };
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE'} | Auth: ${USING_SERVICE_ROLE ? 'service_role' : 'anon'}`);
  const surveys = JSON.parse(readFileSync(INPUT_PATH, 'utf8'));

  const stats = { total: 0, notFound: 0, noAnswers: 0, updated: 0, errors: 0 };
  const missing = [];

  for (const s of surveys) {
    if (chartFilter.size && !chartFilter.has(s.chart_number)) continue;
    stats.total++;
    try {
      const child = await findChildByChartNumber(s.chart_number);
      if (!child) {
        stats.notFound++;
        missing.push(`${s.chart_number} (${s.file})`);
        continue;
      }
      const patches = buildPatches(s.raw);
      const hasAny = Object.keys(patches.child).length || Object.keys(patches.survey).length;
      if (!hasAny) {
        stats.noAnswers++;
        console.log(`  [skip-empty] ${s.chart_number} ${child.name}`);
        continue;
      }
      const { update } = await applyPatch(child, patches);
      stats.updated++;
      const childKeys = Object.keys(patches.child);
      const surveyKeys = Object.keys(patches.survey);
      console.log(`  [ok] ${s.chart_number} ${child.name} · child[${childKeys.join(',')}] survey[${surveyKeys.join(',')}]`);
    } catch (e) {
      stats.errors++;
      console.error(`  [error] ${s.chart_number}: ${e.message}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(JSON.stringify(stats, null, 2));
  if (missing.length) {
    console.log('\nMissing chart_numbers (not in DB):');
    for (const m of missing) console.log(`  - ${m}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
