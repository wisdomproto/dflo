// 생년월일 매칭 검토 툴 데이터 빌드.
// intake(데이터+이미지) + 매칭 등급/후보 + 환자 로스터를 합쳐
// v4/public/intake-review/match-review-data.json 으로 출력.
// read-only(조회만). 산출 JSON 은 PHI → gitignore(intake-review/ 전체).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const BASE = 'https://txirmofdvuljkrjkpzdg.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4aXJtb2ZkdnVsamtyamtwemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTE0MjMsImV4cCI6MjA5MTgyNzQyM30.yBEnRDrresPy-pexp8DLhRo-8MlXjxvEC3Wh3hIqqfQ';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

async function rest(path) {
  const out = []; let from = 0; const P = 1000;
  while (true) {
    const r = await fetch(`${BASE}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + P - 1}` } });
    if (!r.ok) throw new Error(path + ' ' + r.status + ' ' + await r.text());
    const rows = await r.json(); out.push(...rows);
    if (rows.length < P) break; from += P;
  }
  return out;
}

const data = JSON.parse(readFileSync(resolve(ROOT, 'v4/public/intake-review/data.json'), 'utf8'));        // intake + images (221, 순서 일치)
const matches = JSON.parse(readFileSync(resolve(HERE, 'intake_birthdate_matches.json'), 'utf8'));          // 등급 + 후보 (idx 일치)
const childrenRaw = await rest('children?select=id,name,chart_number,gender,birth_date,treatment_status,intake_survey');

const linkedSet = new Set();
const children = childrenRaw.map((c) => {
  const linked = !!(c.intake_survey && c.intake_survey.scanned_intake);
  if (linked) linkedSet.add(c.id);
  return { id: c.id, chart: c.chart_number, name: c.name, gender: c.gender, birth: (c.birth_date || '').slice(0, 10), ts: c.treatment_status, linked };
});

const CONFIDENT = (t) => t.startsWith('확실') || t.startsWith('유력');

const records = matches.map((m) => {
  const d = data[m.idx] || {};
  const cands = (m.matches || []).map((x) => ({
    id: x.id, chart: x.chart, name: x.db_name, gender: x.db_gender, birth: x.db_birth,
    name_sig: x.name_sig, name_partial: x.name_partial, gender_ok: x.gender_ok, linked: linkedSet.has(x.id),
  }));
  return {
    idx: m.idx,
    tier: m.tier,
    images: d.images || [],
    default_child_id: CONFIDENT(m.tier) && cands[0] ? cands[0].id : null,  // 확실/유력만 자동선택, 나머지는 수동
    candidates: cands,
    intake: {
      name: d.name ?? null, birth_date: d.birth_date ?? null, birth_norm: m.intake_birth ?? null, gender: d.gender ?? null,
      grade: d.grade ?? null, class_height_rank: d.class_height_rank ?? null,
      father_height_cm: d.father_height_cm ?? null, mother_height_cm: d.mother_height_cm ?? null, desired_height_cm: d.desired_height_cm ?? null,
      current_height_cm: d.current_height_cm ?? null, last_year_growth_cm: d.last_year_growth_cm ?? null, current_weight_kg: d.current_weight_kg ?? null,
      gestational_weeks: d.gestational_weeks ?? null, birth_weight_kg: d.birth_weight_kg ?? null, birth_notes: d.birth_notes ?? null,
      past_growth_clinic: d.past_growth_clinic ?? null, parents_interested: d.parents_interested ?? null, child_interested: d.child_interested ?? null,
      sports_athlete: d.sports_athlete ?? null, past_clinic_visits: d.past_clinic_visits ?? null, puberty_note: d.puberty_note ?? null,
      causes: d.causes ?? [], labs: d.labs ?? {}, growth_history: d.growth_history ?? {},
      low_confidence: d.low_confidence ?? [], needs_review: d.needs_review ?? [],
      sources: d.sources ?? [], page_refs: d.page_refs ?? [],
    },
  };
});

const tierCounts = {};
for (const r of records) tierCounts[r.tier] = (tierCounts[r.tier] || 0) + 1;

const out = { generated_at: new Date().toISOString(), tier_counts: tierCounts, children, records };
writeFileSync(resolve(ROOT, 'v4/public/intake-review/match-review-data.json'), JSON.stringify(out), 'utf8');
console.log(`children ${children.length} (이미 연결 ${linkedSet.size}) · records ${records.length}`);
console.log('등급:', Object.entries(tierCounts).map(([k, v]) => `${k} ${v}`).join(' · '));
console.log('→ v4/public/intake-review/match-review-data.json');
