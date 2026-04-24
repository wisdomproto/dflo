// Generate a narrative "patient story" for every child and cache it in
// patient_stories. 70% fact (pulled live from DB) + 30% fiction (warm
// family/emotional framing). Resumable: patients already in the table are
// skipped on rerun.
//
// Gemini 2.5 Flash free tier: 15 RPM / 1,500 RPD. We stay well under:
//   - 5s between requests (12 RPM).
//   - Exponential backoff on 429 (60s → 120s → 240s, 3 tries).
//   - If all retries fail with RESOURCE_EXHAUSTED, exit gracefully so the
//     operator can resume tomorrow (or so Claude can finish manually).
//
// Usage: node cases/generate_patient_stories.mjs [--limit=N] [--force]
//   --limit=N   cap the run (useful for a quick sanity check)
//   --force     regenerate even if a story already exists

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { GoogleGenerativeAI } from '../ai-server/node_modules/@google/generative-ai/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const AI_ENV = resolve(ROOT, 'ai-server', '.env');

const env = {};
for (const line of readFileSync(AI_ENV, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const args = process.argv.slice(2);
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? '0') || 0;
const force = args.includes('--force');

const s = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const MODEL_NAME = 'gemini-2.5-flash';
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

const DELAY_MS = 5000;      // 5s between successful calls
const BACKOFF_BASE_MS = 60_000;
const MAX_RETRIES = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ────────────────────────────────────────────────────────────────────
// Data loaders (mirrors ai-server/routes/patientAnalysis buildInput,
// simplified — we only need enough for narrative).

async function fetchPaged(table, cols, childId) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await s
      .from(table)
      .select(cols)
      .eq('child_id', childId)
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

function calcAge(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age -= 1;
  return age;
}

function summariseMeasurements(ms) {
  if (ms.length === 0) return '측정 기록 없음';
  const first = ms[0];
  const last = ms[ms.length - 1];
  const dH = first.height != null && last.height != null ? (last.height - first.height).toFixed(1) : null;
  const months = first.measured_date && last.measured_date
    ? Math.round((new Date(last.measured_date) - new Date(first.measured_date)) / (30 * 86400_000))
    : null;
  const baFirst = ms.find((m) => m.bone_age != null);
  const baLast = [...ms].reverse().find((m) => m.bone_age != null);
  const pahLast = [...ms].reverse().find((m) => m.pah != null);
  const parts = [
    `첫 측정: ${first.measured_date} ${first.height ?? '-'}cm`,
    `최근 측정: ${last.measured_date} ${last.height ?? '-'}cm`,
  ];
  if (dH != null && months != null) parts.push(`${months}개월간 +${dH}cm`);
  if (baFirst?.bone_age != null && baLast?.bone_age != null) {
    parts.push(`뼈나이 ${baFirst.bone_age.toFixed(1)} → ${baLast.bone_age.toFixed(1)}`);
  }
  if (pahLast?.pah != null) parts.push(`최근 예측 성인키 ${pahLast.pah.toFixed(1)}cm`);
  return parts.join(', ');
}

function summarisePrescriptions(rxList) {
  if (rxList.length === 0) return '처방 기록 없음';
  const top = rxList.slice(0, 5).map((r) => `${r.name}×${r.count}회`).join(', ');
  const cats = { MED: 0, INJ: 0, PRO: 0 };
  for (const r of rxList) {
    const prefix = (r.code || '').slice(0, 3);
    if (cats[prefix] != null) cats[prefix] += r.count;
  }
  const catStr = Object.entries(cats)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => ({ MED: '약품', INJ: '주사', PRO: '시술' }[k] + ` ${n}회`))
    .join(' · ');
  return `총 ${rxList.length}종, ${catStr}. 주요: ${top}`;
}

function summariseLabs(labs) {
  if (labs.length === 0) return '검사 기록 없음';
  const byType = {};
  const flagged = new Set();
  for (const l of labs) {
    byType[l.panel_type] = (byType[l.panel_type] ?? 0) + 1;
    for (const f of l.flagged) flagged.add(f);
  }
  const typeStr = Object.entries(byType).map(([k, n]) => `${k}×${n}`).join(', ');
  const flagStr = [...flagged].slice(0, 6).join(', ');
  return flagStr ? `${typeStr} (이상 소견: ${flagStr})` : typeStr;
}

function summariseIntake(intake) {
  if (!intake) return '초진 설문 없음';
  const parts = [];
  if (intake.growth_flags?.slowed) parts.push('성장 둔화 체크');
  if (intake.growth_flags?.rapid_growth) parts.push('급성장 체크');
  if (intake.growth_flags?.puberty_concern) parts.push('사춘기 걱정 체크');
  if (intake.tanner_stage) parts.push(`Tanner ${intake.tanner_stage}`);
  if (intake.chronic_conditions) parts.push(`과거력: ${intake.chronic_conditions}`);
  if (Array.isArray(intake.short_stature_causes) && intake.short_stature_causes.length) {
    parts.push(`부모 판단 원인: ${intake.short_stature_causes.join(', ')}`);
  }
  if (intake.sports_athlete) parts.push('체육 특기생');
  return parts.length ? parts.join(' | ') : '주요 체크 없음';
}

async function buildContext(child) {
  const [visits, measRows, rxRows, labRows] = await Promise.all([
    fetchPaged('visits', 'id, visit_date, notes, is_intake, chief_complaint', child.id),
    fetchPaged('hospital_measurements', 'visit_id, measured_date, height, weight, bone_age, pah', child.id),
    fetchPaged('prescriptions', 'medication_id, dose, duration_days, visit_id, created_at', child.id),
    fetchPaged('lab_tests', 'collected_date, test_type, result_data', child.id),
  ]);

  const nonIntakeVisits = visits.filter((v) => !v.is_intake).sort((a, b) => a.visit_date.localeCompare(b.visit_date));
  const visitById = new Map(nonIntakeVisits.map((v) => [v.id, v]));
  const measurements = measRows
    .filter((m) => visitById.has(m.visit_id))
    .sort((a, b) => a.measured_date.localeCompare(b.measured_date));

  const medIds = [...new Set(rxRows.map((r) => r.medication_id).filter(Boolean))];
  const meds = [];
  for (let i = 0; i < medIds.length; i += 100) {
    const { data } = await s.from('medications').select('id, code, name').in('id', medIds.slice(i, i + 100));
    if (data) meds.push(...data);
  }
  const medMap = new Map(meds.map((m) => [m.id, m]));
  const rxAgg = new Map();
  for (const r of rxRows) {
    const med = medMap.get(r.medication_id);
    if (!med) continue;
    const key = med.code;
    const cur = rxAgg.get(key) ?? { code: med.code, name: med.name, count: 0, first_date: null, last_date: null };
    cur.count += 1;
    const d = visitById.get(r.visit_id)?.visit_date ?? null;
    if (d && (!cur.first_date || d < cur.first_date)) cur.first_date = d;
    if (d && (!cur.last_date || d > cur.last_date)) cur.last_date = d;
    rxAgg.set(key, cur);
  }
  const prescriptions = [...rxAgg.values()].sort((a, b) => b.count - a.count);

  const labs = labRows
    .map((l) => {
      const pt = l.result_data?.panel_type || l.test_type;
      const rows = l.result_data?.rows || [];
      const flagged = rows
        .filter((r) => r.flag && r.flag !== 'N' && r.flag !== 'normal' && r.flag !== '')
        .map((r) => r.name)
        .filter(Boolean);
      return { date: l.collected_date, panel_type: pt, flagged };
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return {
    name: child.name,
    chart: child.chart_number,
    gender: child.gender === 'male' ? '남' : child.gender === 'female' ? '여' : '-',
    ageNow: calcAge(child.birth_date),
    birth: child.birth_date,
    fatherH: child.father_height,
    motherH: child.mother_height,
    desiredH: child.desired_height,
    firstVisit: nonIntakeVisits[0]?.visit_date ?? null,
    lastVisit: nonIntakeVisits[nonIntakeVisits.length - 1]?.visit_date ?? null,
    visitCount: nonIntakeVisits.length,
    measurementsSummary: summariseMeasurements(measurements),
    prescriptionsSummary: summarisePrescriptions(prescriptions),
    labsSummary: summariseLabs(labs),
    intakeSummary: summariseIntake(child.intake_survey),
  };
}

// ────────────────────────────────────────────────────────────────────
// Prompt

function buildPrompt(ctx) {
  return `당신은 소아 성장 클리닉(연세새봄의원 187 성장 클리닉)의 진료 기록을 바탕으로
따뜻하고 진솔한 내러티브를 쓰는 작가입니다.

[사실 데이터 — 이 부분은 반드시 그대로 반영]
- 이름: ${ctx.name}
- 차트번호: ${ctx.chart}
- 성별: ${ctx.gender}, 현재 나이: ${ctx.ageNow ?? '-'}세
- 부모키: 아빠 ${ctx.fatherH ?? '?'}cm, 엄마 ${ctx.motherH ?? '?'}cm / 희망키: ${ctx.desiredH ?? '?'}cm
- 첫 내원: ${ctx.firstVisit ?? '-'} / 최근 내원: ${ctx.lastVisit ?? '-'} / 총 ${ctx.visitCount}회
- 측정 요약: ${ctx.measurementsSummary}
- 처방 요약: ${ctx.prescriptionsSummary}
- 검사 요약: ${ctx.labsSummary}
- 초진 설문 요약: ${ctx.intakeSummary}

[글쓰기 규칙]
1. 70% 사실(위 데이터) + 30% 픽션(가족 분위기, 아이 성격, 상담실 풍경, 부모 심리).
   단 픽션은 사실과 모순되지 않아야 한다.
2. 한국어, 자연스러운 3인칭 서술체.
3. 분량: 500~700자 한국어 (약 300 단어 수준).
4. 구성: 도입(환자 배경·계기) → 전개(치료 여정과 수치 변화) → 마무리(현재 상태와 전망).
5. 병원명은 필요할 때만 짧게 언급 가능. 가짜 의사/간호사 이름은 만들지 말 것("원장님"은 OK).
6. 측정값·뼈나이·예측 성인키·처방 횟수는 반드시 사실 데이터에서 가져올 것.
7. 홍보성 과장 금지. 진솔한 기록 톤 유지.

[출력 형식 — 반드시 JSON]
{
  "title": "12자 이내 짧은 제목",
  "story": "본문 500~700자"
}`;
}

// ────────────────────────────────────────────────────────────────────
// Gemini call with retry

function isQuotaError(err) {
  const msg = String(err?.message || err);
  return /RESOURCE_EXHAUSTED|429|quota|rate[-_ ]?limit/i.test(msg);
}

async function generateStory(ctx) {
  const prompt = buildPrompt(ctx);
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const r = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      const text = r.response.text();
      const parsed = JSON.parse(text);
      if (!parsed.title || !parsed.story) throw new Error('malformed response: missing title/story');
      return parsed;
    } catch (e) {
      lastErr = e;
      if (isQuotaError(e)) {
        const wait = BACKOFF_BASE_MS * Math.pow(2, attempt);
        console.warn(`  [quota] attempt ${attempt + 1} hit rate limit. Waiting ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      // non-quota error: bubble up immediately
      throw e;
    }
  }
  throw lastErr;
}

// ────────────────────────────────────────────────────────────────────
// Main

async function main() {
  // Probe patient_stories table — fail fast with a clear message if
  // migration 013 hasn't been applied yet.
  {
    const { error } = await s.from('patient_stories').select('id').limit(1);
    if (error) {
      console.error('× patient_stories table check failed:', error.message);
      console.error('  Apply migration 013 in Supabase Dashboard → SQL Editor');
      console.error('  File: v4/scripts/migrations/013_patient_stories.sql');
      process.exit(2);
    }
  }

  // Load all children (chart + survey + demographics)
  let allChildren = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await s
      .from('children')
      .select('id, chart_number, name, gender, birth_date, father_height, mother_height, desired_height, intake_survey')
      .order('chart_number', { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allChildren.push(...data);
    if (data.length < 1000) break;
  }
  console.log(`Loaded ${allChildren.length} children from DB`);

  // Load already-done story child_ids
  let done = new Set();
  if (!force) {
    const { data } = await s.from('patient_stories').select('child_id');
    done = new Set((data || []).map((r) => r.child_id));
    console.log(`  ${done.size} already have a story (skipping unless --force)`);
  }

  const todo = allChildren.filter((c) => force || !done.has(c.id));
  if (limit > 0) todo.splice(limit);
  console.log(`  ${todo.length} to generate\n`);

  const stats = { ok: 0, err: 0, quota: 0 };
  for (let i = 0; i < todo.length; i++) {
    const child = todo[i];
    const head = `[${i + 1}/${todo.length}] #${child.chart_number} ${child.name}`;
    try {
      const ctx = await buildContext(child);
      if (ctx.visitCount === 0) {
        console.log(`${head}  → skip (no visits)`);
        continue;
      }
      process.stdout.write(`${head}  → generating...`);
      const started = Date.now();
      const { title, story } = await generateStory(ctx);
      const ms = Date.now() - started;
      const { error } = await s.from('patient_stories').upsert(
        { child_id: child.id, title, story, model: MODEL_NAME, source: 'gemini', generated_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: 'child_id' },
      );
      if (error) throw error;
      process.stdout.write(` ok (${ms}ms, "${title}")\n`);
      stats.ok += 1;
    } catch (e) {
      console.error(`\n  [err] ${head}: ${e.message}`);
      stats.err += 1;
      if (isQuotaError(e)) {
        stats.quota += 1;
        console.error('  → quota exhausted after retries. Stopping so operator (or Claude) can continue manually.');
        break;
      }
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n── Summary ──`);
  console.log(`  ok      : ${stats.ok}`);
  console.log(`  errored : ${stats.err}`);
  console.log(`  quota stopped : ${stats.quota > 0 ? 'YES' : 'no'}`);
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
