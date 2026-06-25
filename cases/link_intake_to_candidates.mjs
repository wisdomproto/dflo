// 매칭된 인테이크(스캔 초진기록지)를 치료사례 후보 children.intake_survey 에 비파괴 연결.
// - 신뢰 매칭만: 확실(이름+생일) + 유력(생일+이름1글자차) + EXTRA_CHARTS(수동 승인 birth-only).
// - 기존 intake_survey/1차 컬럼은 건드리지 않고 intake_survey.scanned_intake 하위키에만 기록(OCR=미검증).
// - 쓰기 전 prior intake_survey 백업(cases/intake_link_backup.json). 되돌리기 쉬움.
// Usage: node cases/link_intake_to_candidates.mjs            (dry-run, 기본)
//        node cases/link_intake_to_candidates.mjs --write    (실제 DB 쓰기)
import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const loadEnv = (p) => { const o = {}; try { for (const l of readFileSync(p, 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {} return o; };
const v4Env = loadEnv(resolve(ROOT, 'v4', '.env.local'));
const aiEnv = loadEnv(resolve(ROOT, 'ai-server', '.env'));
const SUPABASE_URL = v4Env.VITE_SUPABASE_URL || aiEnv.SUPABASE_URL;
const SUPABASE_KEY = aiEnv.SUPABASE_SERVICE_ROLE_KEY || v4Env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing Supabase credentials'); process.exit(1); }
const USING_SR = !!aiEnv.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const WRITE = process.argv.includes('--write');
const EXTRA_CHARTS = new Set(['26043']); // 손글씨 이름이 심하게 오독돼 생일만 일치한 케이스, 원본 대조 후 수동 승인.

const FIELDS = ['gender', 'gestational_weeks', 'birth_weight_kg', 'birth_notes', 'current_height_cm', 'last_year_growth_cm', 'current_weight_kg', 'grade', 'class_height_rank', 'father_height_cm', 'mother_height_cm', 'past_growth_clinic', 'parents_interested', 'child_interested', 'desired_height_cm', 'sports_athlete', 'past_clinic_visits', 'puberty_note', 'causes', 'growth_history', 'labs'];

const matches = JSON.parse(readFileSync(resolve(HERE, 'intake_candidate_matches.json'), 'utf8'));
const consolidated = JSON.parse(readFileSync(resolve(HERE, 'intake_surveys_consolidated.json'), 'utf8'));
const byRef = new Map();
for (const p of consolidated) { const k = (p.page_refs || [])[0] || (p.chart_numbers || [])[0]; if (k) byRef.set(k, p); }

const linkable = matches.filter((m) => m.type.startsWith('확실') || m.type.startsWith('유력') || EXTRA_CHARTS.has(String(m.cand_chart)));

console.log(`Mode: ${WRITE ? 'WRITE' : 'DRY-RUN'} | Auth: ${USING_SR ? 'service_role' : 'anon'} | 연결 대상 ${linkable.length}건`);
console.log('(확실+유력 자동 + 수동승인 차트 ' + [...EXTRA_CHARTS].join(',') + ')\n');

const backup = [];
let ok = 0, skip = 0, err = 0;
for (const m of matches) {
  const isLinkable = m.type.startsWith('확실') || m.type.startsWith('유력') || EXTRA_CHARTS.has(String(m.cand_chart));
  if (!isLinkable) continue;
  const rec = byRef.get(m.intake_ref);
  if (!rec) { console.log(`  [skip] ${m.intake_name} ${m.intake_ref}: consolidated 레코드 못 찾음`); skip++; continue; }
  try {
    const { data: child, error } = await supabase.from('children').select('id, chart_number, name, intake_survey').eq('chart_number', String(m.cand_chart)).maybeSingle();
    if (error) throw error;
    if (!child) { console.log(`  [skip] #${m.cand_chart} ${m.cand_name}: children 없음`); skip++; continue; }

    const fields = {};
    for (const f of FIELDS) if (rec[f] != null && rec[f] !== '' && !(Array.isArray(rec[f]) && !rec[f].length) && !(typeof rec[f] === 'object' && !Array.isArray(rec[f]) && rec[f] && !Object.keys(rec[f]).length)) fields[f] = rec[f];

    const scanned = {
      scanned: true,
      match_type: m.type,
      source: rec.sources || [],
      page_refs: rec.page_refs || [],
      name_read: rec.name, birth_read: rec.birth_date,
      fields,
      low_confidence: rec.low_confidence || [],
      needs_review: rec.needs_review || [],
      verified: false,
      linked_at: new Date().toISOString(),
    };
    const cur = child.intake_survey || {};
    const had = !!cur.scanned_intake;
    const hadOther = Object.keys(cur).filter((k) => k !== 'scanned_intake' && k !== 'updated_at').length;
    const merged = { ...cur, scanned_intake: scanned, updated_at: new Date().toISOString() };

    backup.push({ chart_number: child.chart_number, child_id: child.id, name: child.name, prior_intake_survey: child.intake_survey ?? null });

    console.log(`  [${WRITE ? 'write' : 'plan'}] #${child.chart_number} ${child.name}  ← 스캔 "${rec.name}" (${m.type.split(' ')[0]})`);
    console.log(`           필드 ${Object.keys(fields).length}개 · 저신뢰 ${scanned.low_confidence.length} · 검토 ${scanned.needs_review.length} · 기존문진 ${hadOther ? hadOther + '키 보존' : '없음'}${had ? ' · scanned_intake 덮어씀' : ''}`);

    if (WRITE) {
      const { error: uerr } = await supabase.from('children').update({ intake_survey: merged, updated_at: new Date().toISOString() }).eq('id', child.id);
      if (uerr) throw uerr;
    }
    ok++;
  } catch (e) { console.error(`  [error] #${m.cand_chart}: ${e.message}`); err++; }
}

// 백업은 실제 쓰기 때만 저장(되돌리기용)
if (WRITE && backup.length) {
  writeFileSync(resolve(HERE, 'intake_link_backup.json'), JSON.stringify(backup, null, 2), 'utf8');
  console.log(`\n백업 ${backup.length}건 -> cases/intake_link_backup.json (되돌리기용)`);
}
console.log(`\n=== ${WRITE ? '완료' : 'DRY-RUN'} === ok ${ok} · skip ${skip} · err ${err}`);
if (!WRITE) console.log('실제 적용: node cases/link_intake_to_candidates.mjs --write');
