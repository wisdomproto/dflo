// ================================================
// embedder — 환자 데이터를 정규화 텍스트로 만들고 Gemini 임베딩 생성·저장
// ================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { embedText } from './gemini.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

interface ChildRow {
  id: string;
  chart_number: string | null;
  name: string | null;
  gender: 'male' | 'female';
  birth_date: string;
  father_height: number | null;
  mother_height: number | null;
  desired_height: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intake_survey: any;
}

interface VisitRow {
  id: string;
  visit_date: string;
  notes?: string | null;
  is_intake?: boolean | null;
}

interface MeasurementRow {
  visit_id: string;
  measured_date: string;
  height: number | null;
  weight: number | null;
  bone_age: number | null;
  pah: number | null;
}

interface PrescriptionRow {
  visit_id: string;
  medication_id: string;
  dose: string | null;
}

interface MedRow {
  id: string;
  name: string;
}

interface LabRow {
  visit_id: string;
  test_type: string;
  collected_date: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result_data: any;
}

const SHORT_STATURE_LABELS: Record<string, string> = {
  parents_short: '부모 키 작음',
  parents_height_gap: '부모 키 차이 큼',
  picky_eating: '편식',
  parents_early_stop: '부모 일찍 성장 멈춤',
  insufficient_sleep: '수면 부족',
  chronic_illness: '만성 질환',
};

function ageOn(birth: string, on: string): number {
  const b = new Date(birth);
  const o = new Date(on);
  if (Number.isNaN(b.getTime()) || Number.isNaN(o.getTime())) return 0;
  const diff = o.getTime() - b.getTime();
  return Math.round((diff / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
}

/**
 * 환자 데이터를 검색에 유리한 한국어 정규화 텍스트로 변환.
 * 임상적으로 중요한 신호 (나이, 성별, 부모 키, 뼈나이, 키 추이, 처방 패턴, 알러지 클래스)
 * 가 모두 포함되도록 구성.
 */
function buildPatientText(input: {
  child: ChildRow;
  visits: VisitRow[];
  measurements: MeasurementRow[];
  prescriptions: PrescriptionRow[];
  medMap: Map<string, MedRow>;
  labs: LabRow[];
}): string {
  const { child, visits, measurements, prescriptions, medMap, labs } = input;
  const chunks: string[] = [];

  // 인구학적 정보
  const today = new Date().toISOString().slice(0, 10);
  const ageNow = ageOn(child.birth_date, today);
  chunks.push(
    `환자: ${child.gender === 'male' ? '남아' : '여아'} 만 ${ageNow.toFixed(1)}세 (생일 ${child.birth_date}).`,
  );
  if (child.father_height || child.mother_height) {
    chunks.push(
      `부모 키: 父 ${child.father_height ?? '?'}cm / 母 ${child.mother_height ?? '?'}cm.`,
    );
    if (child.father_height && child.mother_height) {
      const adj = child.gender === 'male' ? 6.5 : -6.5;
      const mph = (child.father_height + child.mother_height) / 2 + adj;
      chunks.push(`MPH (중간부모키): ${mph.toFixed(1)}cm.`);
    }
  }
  if (child.desired_height) chunks.push(`희망 키: ${child.desired_height}cm.`);

  // intake_survey
  const survey = child.intake_survey;
  if (survey) {
    if (survey.tanner_stage) chunks.push(`사춘기: Tanner ${survey.tanner_stage}단계.`);
    if (survey.growth_flags) {
      const flags: string[] = [];
      if (survey.growth_flags.rapid_growth) flags.push('최근 급성장');
      if (survey.growth_flags.slowed) flags.push('성장 느려짐');
      if (survey.growth_flags.puberty_concern) flags.push('사춘기 우려');
      if (flags.length) chunks.push(`성장 패턴: ${flags.join(', ')}.`);
    }
    if (Array.isArray(survey.short_stature_causes) && survey.short_stature_causes.length) {
      const causes = survey.short_stature_causes.map(
        (c: string) => SHORT_STATURE_LABELS[c] ?? c,
      );
      chunks.push(`키 작은 추정 원인: ${causes.join(', ')}.`);
    }
    if (survey.chronic_conditions) chunks.push(`만성/지속 질환: ${survey.chronic_conditions}.`);
  }

  // 측정 추이 (최근 + 가장 오래된)
  const sortedMeas = measurements
    .filter((m) => m.height && m.height > 0)
    .sort((a, b) => a.measured_date.localeCompare(b.measured_date));
  if (sortedMeas.length) {
    const first = sortedMeas[0];
    const last = sortedMeas[sortedMeas.length - 1];
    chunks.push(
      `키 추이: ${first.measured_date} ${first.height}cm → ${last.measured_date} ${last.height}cm (총 ${sortedMeas.length}회 측정).`,
    );
    const lastBA = [...sortedMeas].reverse().find((m) => m.bone_age != null);
    if (lastBA && lastBA.bone_age) {
      const ageAtMeas = ageOn(child.birth_date, lastBA.measured_date);
      chunks.push(
        `최근 뼈나이: ${lastBA.bone_age.toFixed(1)}세 (실제 ${ageAtMeas.toFixed(1)}세, 차이 ${(lastBA.bone_age - ageAtMeas).toFixed(1)}).`,
      );
    }
    const lastPAH = [...sortedMeas].reverse().find((m) => m.pah && m.pah > 0);
    if (lastPAH?.pah) chunks.push(`최근 예측 성인키(PAH): ${lastPAH.pah}cm.`);
  }

  // 처방 패턴 (top medications)
  if (prescriptions.length) {
    const cnt = new Map<string, number>();
    for (const p of prescriptions) {
      const m = medMap.get(p.medication_id);
      const k = m?.name ?? p.medication_id;
      cnt.set(k, (cnt.get(k) || 0) + 1);
    }
    const top = [...cnt.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([n, c]) => `${n}(${c})`)
      .join(', ');
    chunks.push(`주요 처방: ${top} 등 총 ${prescriptions.length}건.`);
  }

  // Lab — IgG4 강한 반응 + 혈액 이상치 + NK 등
  if (labs.length) {
    const labSummary: string[] = [];
    for (const l of labs) {
      const pt = l.result_data?.panel_type;
      if (pt === 'food_intolerance' && Array.isArray(l.result_data?.items)) {
        const heavy = l.result_data.items
          .filter((it: { class?: string | number }) => {
            const c = parseInt(String(it.class ?? '0'), 10);
            return c >= 3;
          })
          .map((it: { name?: string; class?: string | number }) => `${it.name}(C${it.class})`);
        if (heavy.length) labSummary.push(`IgG4 강반응: ${heavy.slice(0, 6).join(', ')}`);
      } else if (pt === 'nk_activity' && l.result_data?.value != null) {
        labSummary.push(`NK 활성도 ${l.result_data.value}${l.result_data.unit ?? ''}`);
      } else if (pt === 'blood' && Array.isArray(l.result_data?.items)) {
        const flagged = l.result_data.items.filter((it: { flag?: string }) => it.flag);
        if (flagged.length) {
          const sample = flagged.slice(0, 4).map((it: { name?: string; flag?: string; value?: unknown }) =>
            `${it.name}(${it.flag} ${it.value})`,
          );
          labSummary.push(`혈액 이상: ${sample.join(', ')}`);
        }
      }
    }
    if (labSummary.length) chunks.push(`검사: ${labSummary.join(' / ')}.`);
    chunks.push(`총 lab ${labs.length}건.`);
  }

  // 진료 메모 (가장 최근 3건의 짧은 발췌)
  const visitsWithMemo = visits
    .filter((v) => !v.is_intake && v.notes && v.notes.trim())
    .sort((a, b) => b.visit_date.localeCompare(a.visit_date))
    .slice(0, 3);
  if (visitsWithMemo.length) {
    const memos = visitsWithMemo
      .map((v) => `[${v.visit_date}] ${v.notes!.slice(0, 120)}`)
      .join(' | ');
    chunks.push(`최근 메모: ${memos}.`);
  }

  return chunks.join('\n');
}

/**
 * 한 환자의 데이터를 fetch → 정규화 → 임베딩 → patient_embeddings upsert.
 */
export async function buildAndStoreEmbedding(childId: string): Promise<{
  childId: string;
  textLength: number;
  vectorLength: number;
}> {
  // 1) child
  const { data: child, error: cErr } = await sb
    .from('children')
    .select(
      'id, chart_number, name, gender, birth_date, father_height, mother_height, desired_height, nationality, intake_survey',
    )
    .eq('id', childId)
    .single();
  if (cErr || !child) throw new Error(`child not found: ${childId}`);

  // 2) visits + measurements + prescriptions + meds + labs (in parallel)
  const [visitsRes, measRes, presRes, labsRes] = await Promise.all([
    sb.from('visits').select('id, visit_date, notes, is_intake').eq('child_id', childId),
    sb
      .from('hospital_measurements')
      .select('visit_id, measured_date, height, weight, bone_age, pah')
      .eq('child_id', childId),
    sb
      .from('prescriptions')
      .select('visit_id, medication_id, dose')
      .eq('child_id', childId),
    sb
      .from('lab_tests')
      .select('visit_id, test_type, collected_date, result_data')
      .eq('child_id', childId),
  ]);
  if (visitsRes.error) throw visitsRes.error;
  if (measRes.error) throw measRes.error;
  if (presRes.error) throw presRes.error;
  if (labsRes.error) throw labsRes.error;

  const prescriptions = (presRes.data ?? []) as PrescriptionRow[];
  const medIds = [...new Set(prescriptions.map((p) => p.medication_id).filter(Boolean))];
  const medMap = new Map<string, MedRow>();
  if (medIds.length) {
    const { data: medsData, error: mErr } = await sb
      .from('medications')
      .select('id, name')
      .in('id', medIds);
    if (mErr) throw mErr;
    for (const m of (medsData ?? []) as MedRow[]) medMap.set(m.id, m);
  }

  const text = buildPatientText({
    child: child as ChildRow,
    visits: (visitsRes.data ?? []) as VisitRow[],
    measurements: (measRes.data ?? []) as MeasurementRow[],
    prescriptions,
    medMap,
    labs: (labsRes.data ?? []) as LabRow[],
  });

  // 3) embed
  const vector = await embedText(text);

  // 4) upsert
  const { error: upErr } = await sb.from('patient_embeddings').upsert(
    {
      child_id: childId,
      embedding: vector,
      source_text: text,
      model: 'gemini-text-embedding-004',
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'child_id' },
  );
  if (upErr) throw upErr;

  return { childId, textLength: text.length, vectorLength: vector.length };
}
