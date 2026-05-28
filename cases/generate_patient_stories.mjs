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
// Usage: node cases/generate_patient_stories.mjs [--limit=N] [--force] [--chart=N]
//   --limit=N   cap the run (useful for a quick sanity check)
//   --force     regenerate even if a story already exists
//   --chart=N   target only the patient with this chart_number (implies --force)

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { GoogleGenerativeAI } from '../ai-server/node_modules/@google/generative-ai/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

// 다른 cases 스크립트와 동일한 fallback 패턴: ai-server/.env 가 없으면
// v4/.env.local 에서 SUPABASE 키를 끌어옴. GEMINI_API_KEY 는 ai-server 측에만
// 있을 수 있어 둘 다 시도.
function loadEnv(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}
const aiEnv = loadEnv(resolve(ROOT, 'ai-server', '.env'));
const v4Env = loadEnv(resolve(ROOT, 'v4', '.env.local'));
const env = {
  SUPABASE_URL: aiEnv.SUPABASE_URL || v4Env.VITE_SUPABASE_URL,
  // service role 없으면 anon 으로 fallback (migration 013 의 patient_stories RLS
  // 가 anon ALL 허용이라 동작함). 다른 cases 스크립트와 동일한 패턴.
  SUPABASE_KEY:
    aiEnv.SUPABASE_SERVICE_ROLE_KEY ||
    v4Env.SUPABASE_SERVICE_ROLE_KEY ||
    v4Env.VITE_SUPABASE_ANON_KEY,
  GEMINI_API_KEY: aiEnv.GEMINI_API_KEY || v4Env.GEMINI_API_KEY,
};
if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
  console.error('× SUPABASE_URL / KEY 누락 — ai-server/.env 또는 v4/.env.local 확인');
  process.exit(2);
}
if (!env.GEMINI_API_KEY) {
  console.error('× GEMINI_API_KEY 누락 — ai-server/.env 또는 v4/.env.local 확인');
  process.exit(2);
}

const args = process.argv.slice(2);
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? '0') || 0;
const chartFilter = args.find((a) => a.startsWith('--chart='))?.split('=')[1] ?? null;
// --chart implies --force (사용자가 그 환자 톤만 다시 보고 싶다는 의도)
const force = args.includes('--force') || chartFilter != null;

const s = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
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
  // 환자 스토리는 가족에게 보여줄 따뜻한 기록이라 약품명·횟수 나열은 부적절.
  // 모델이 본문에 옮겨 적는 걸 막기 위해 컨텍스트에는 추상화된 신호만 제공.
  // 시술(PRO)은 스토리에서 다루지 않음 — 약/주사 중심.
  if (rxList.length === 0) return '처방 기록 없음';
  const cats = { MED: 0, INJ: 0 };
  for (const r of rxList) {
    const prefix = (r.code || '').slice(0, 3);
    if (cats[prefix] != null) cats[prefix] += r.count;
  }
  const hasInjection = cats.INJ > 0;
  // "꾸준히 / 자주 / 가끔" 정도의 빈도 신호 (약+주사 총합 기준)
  const total = cats.MED + cats.INJ;
  let rhythm = '간헐적';
  if (total > 200) rhythm = '매우 꾸준히';
  else if (total > 80) rhythm = '꾸준히';
  else if (total > 30) rhythm = '규칙적으로';
  return hasInjection
    ? `${rhythm} 약 치료에 주사 병행`
    : `${rhythm} 약 치료`;
}

function summariseLabs(labs) {
  // 검사도 마찬가지로 횟수·panel명 dump 금지. 정서적 신호만.
  if (labs.length === 0) return '검사 기록 없음';
  const flagged = new Set();
  for (const l of labs) for (const f of l.flagged) flagged.add(f);
  if (flagged.size === 0) return labs.length > 3 ? '여러 차례 정밀 검사로 컨디션을 살핌' : '검사로 상태 확인';
  return '검사에서 신경 써야 할 소견이 일부 확인됨';
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
  return `당신은 박완서·신경숙처럼 잔잔하고 따뜻한 한국어 단편을 쓰는 작가입니다.
한 소아 성장 클리닉의 진료 기록 한 줄을 보고, 그 너머의 가족과 시간을 상상해
짧은 산문 한 편을 씁니다. 의료 리포트가 아니라 문학적 회고입니다.

[고정 사실 — 모순되면 안 됨. 단, 본문에 숫자를 줄줄이 나열할 필요는 없음]
- 이름: ${ctx.name} (${ctx.gender}, 현재 ${ctx.ageNow ?? '-'}세)
- 부모키: 아빠 ${ctx.fatherH ?? '?'}cm, 엄마 ${ctx.motherH ?? '?'}cm / 희망키 ${ctx.desiredH ?? '?'}cm
- 진료 여정: ${ctx.firstVisit ?? '-'} ~ ${ctx.lastVisit ?? '-'} (총 ${ctx.visitCount}회)
- 키·뼈나이 변화: ${ctx.measurementsSummary}
- 치료 리듬: ${ctx.prescriptionsSummary}
- 검사 분위기: ${ctx.labsSummary}
- 첫 상담 인상: ${ctx.intakeSummary}

[상상력 펼치기 — 자유롭게 써도 되는 영역]
사실 데이터에 어긋나지 않는 한, 다음을 자유롭게 채워 넣어 됩니다.

- 첫 내원 날의 공기 (계절, 날씨, 진료실 문을 밀고 들어오던 모습, 아이가
  어떤 신발을 신었는지 같은 사소한 디테일)
- 부모가 클리닉을 찾기까지의 망설임, 부엌에서 나눈 짧은 대화, 학기 초
  반 친구들 옆에 서서 본인 키를 가늠하던 아이의 표정
- 진료실 풍경 — 키 재는 자, 측정 결과를 마주한 순간의 침묵, 부모가 받아
  적던 메모, 아이가 무심한 척 던지는 농담
- 학교에서의 자리 변화, 운동회 사진, 옷장 옆에 그어둔 키 자국, 여름에서
  겨울로 넘어갈 때마다 짧아진 바지단
- 비유와 메타포 한두 개 정도 (예: "키는 가끔 보이지 않는 곳에서 자란다",
  "겨울 동안 가지가 굵어지는 나무처럼")

[금지]
1. **약품명·약 횟수·주사 횟수·시술 횟수·검사 panel 이름·검사 횟수**
   본문에 절대 등장 금지. ("에이큐_G 48회", "혈액검사 9회", "주사 18회" 등
   전부 금지.) "꾸준한 약과 처치가 곁에 있었다" 식으로만 비춰주세요.
2. 의사·간호사 이름 지어내기 금지 ("원장님" 정도는 OK).
3. 홍보 톤, 광고 카피 톤, 과장된 효과 묘사 금지.

[숫자 사용 규칙]
- 시작 키 → 현재 키, 시작 뼈나이 → 현재 뼈나이 정도는 본문에 자연스럽게
  녹여도 좋습니다. 다만 "+N.Ncm" 식 통계 표기보다 "그 사이 한 뼘이 자라
  있었다" 처럼 문학적으로.
- 굳이 모든 수치를 다 쓸 필요 없음. 한두 개의 결정적 변화만 골라 쓰세요.

[형식]
- 한국어 산문, 350~500자.
- 3인칭 또는 작가 시점.
- 단락 2~4개. 각 단락에 작은 장면 하나씩.

[출력 — JSON]
{
  "title": "12자 이내 시적인 제목",
  "story": "본문 350~500자"
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

  let todo = allChildren.filter((c) => force || !done.has(c.id));
  if (chartFilter) {
    todo = todo.filter((c) => String(c.chart_number) === String(chartFilter));
    if (todo.length === 0) {
      console.error(`× chart_number=${chartFilter} 환자를 찾을 수 없습니다.`);
      process.exit(2);
    }
  }
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
