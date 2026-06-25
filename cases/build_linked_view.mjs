// 연결된 후보 8명(확실+유력+다나카)의 원본 스캔+추출데이터를 한 페이지용 JSON으로 모음.
// -> v4/public/intake-review/linked.json  (linked.html 이 읽음)
import { readFileSync, writeFileSync } from 'node:fs';

const FIELDS = ['gender', 'gestational_weeks', 'birth_weight_kg', 'birth_notes', 'current_height_cm', 'last_year_growth_cm', 'current_weight_kg', 'grade', 'class_height_rank', 'father_height_cm', 'mother_height_cm', 'past_growth_clinic', 'parents_interested', 'child_interested', 'desired_height_cm', 'sports_athlete', 'past_clinic_visits', 'puberty_note', 'causes', 'growth_history', 'labs'];
const EXTRA = new Set(['26043']);

const matches = JSON.parse(readFileSync('cases/intake_candidate_matches.json', 'utf8'));
const data = JSON.parse(readFileSync('v4/public/intake-review/data.json', 'utf8'));
const byId = new Map(data.map((r) => [r.id, r]));

const linkable = matches.filter((m) => m.type.startsWith('확실') || m.type.startsWith('유력') || EXTRA.has(String(m.cand_chart)));
const out = linkable.map((m) => {
  const rec = byId.get((m.intake_ref || '').replace('#', '_')) || {};
  const fields = {};
  for (const k of FIELDS) if (rec[k] != null && rec[k] !== '') fields[k] = rec[k];
  return {
    chart: m.cand_chart, cand_name: m.cand_name, cand_birth: m.cand_birth, cand_gender: m.cand_gender, cand_status: m.cand_status,
    match_type: m.type,
    name_read: rec.name ?? m.intake_name, birth_read: rec.birth_date ?? m.intake_birth,
    images: rec.images || [], fields,
    low_confidence: rec.low_confidence || [], needs_review: rec.needs_review || [],
  };
});

writeFileSync('v4/public/intake-review/linked.json', JSON.stringify(out, null, 1), 'utf8');
console.log(`linked.json — ${out.length}명`);
out.forEach((o) => console.log(`  #${o.chart} ${o.cand_name} ← ${o.name_read} (${o.match_type.split(' ')[0]}, 이미지 ${o.images.length})`));
