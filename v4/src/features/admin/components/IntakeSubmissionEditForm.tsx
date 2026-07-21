import { useState } from 'react';
import { updateSubmission } from '@/features/admin/services/intakeSubmissionService';
import { INTAKE_LABELS } from '@/features/intake/intakeLabels';
import type { IntakeSubmission } from '@/features/intake/types';
import type {
  IntakeSurvey,
  ShortStatureCause,
  TannerStage,
} from '@/shared/types';

// 설문 접수 상세를 편집하는 폼. 저장 시 intake_submissions 컬럼 + intake_survey JSONB 통째 교체.
// 라벨/옵션은 한국어(스태프용). 옵션 코드값은 공개 폼과 동일해 승인 시 그대로 넘어간다.

const L = INTAKE_LABELS.ko;

function emptySurvey(): IntakeSurvey {
  return {
    growth_history: [],
    growth_flags: { rapid_growth: false, slowed: false, puberty_concern: false },
    past_clinic_consult: null,
    parents_interested: null,
    sports_athlete: null,
    sports_event: '',
    child_interested: null,
    chronic_conditions: '',
    tanner_stage: null,
    short_stature_causes: [],
    short_stature_other: '',
    acquisition_channel: null,
    updated_at: '',
  };
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex gap-3 py-1 text-sm">
      <span className="w-28 shrink-0 pt-1.5 text-xs font-medium text-slate-500">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">
        {title}
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

type Opt = { value: string; label: string };
function Select({
  value,
  onChange,
  opts,
  placeholder = '선택 안 함',
}: {
  value: string;
  onChange: (v: string) => void;
  opts: Opt[];
  placeholder?: string;
}) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

const YESNO: Opt[] = [
  { value: 'yes', label: '예' },
  { value: 'no', label: '아니오' },
];
const boolToStr = (b: boolean | null | undefined) => (b === true ? 'yes' : b === false ? 'no' : '');
const strToBool = (s: string): boolean | null => (s === 'yes' ? true : s === 'no' ? false : null);
const num = (s: string): number | undefined => {
  const n = Number(s);
  return s.trim() && Number.isFinite(n) ? n : undefined;
};

interface Props {
  sub: IntakeSubmission;
  onCancel: () => void;
  onSaved: () => void;
}

export default function IntakeSubmissionEditForm({ sub, onCancel, onSaved }: Props) {
  // 컬럼 값(문자열로 편집). 숫자 필드는 저장 시 파싱.
  const [c, setC] = useState({
    name: sub.name ?? '',
    name_en: sub.name_en ?? '',
    gender: (sub.gender ?? '') as '' | 'male' | 'female',
    birth_date: sub.birth_date ?? '',
    country: sub.country ?? '',
    current_height: sub.current_height?.toString() ?? '',
    current_weight: sub.current_weight?.toString() ?? '',
    father_height: sub.father_height?.toString() ?? '',
    mother_height: sub.mother_height?.toString() ?? '',
    desired_height: sub.desired_height?.toString() ?? '',
    grade: sub.grade ?? '',
    class_height_rank: sub.class_height_rank ?? '',
    phone: sub.phone ?? '',
    email: sub.email ?? '',
    address: sub.address ?? '',
  });
  const [s, setS] = useState<IntakeSurvey>({ ...emptySurvey(), ...(sub.intake_survey ?? {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setCol = (patch: Partial<typeof c>) => setC((p) => ({ ...p, ...patch }));
  const setSv = (patch: Partial<IntakeSurvey>) => setS((p) => ({ ...p, ...patch }));
  const setFlag = (k: keyof IntakeSurvey['growth_flags'], v: boolean) =>
    setS((p) => ({ ...p, growth_flags: { ...p.growth_flags, [k]: v } }));

  const toggleCause = (v: string) =>
    setS((p) => {
      const has = p.short_stature_causes.includes(v as ShortStatureCause);
      return {
        ...p,
        short_stature_causes: has
          ? p.short_stature_causes.filter((x) => x !== v)
          : [...p.short_stature_causes, v as ShortStatureCause],
      };
    });

  const setHeight = (age: number, v: string) =>
    setS((p) => ({
      ...p,
      growth_history: p.growth_history.map((g) =>
        g.age === age ? { ...g, height: v.trim() ? Number(v) : null } : g,
      ),
    }));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const patch: Partial<IntakeSubmission> = {
        name: c.name,
        name_en: c.name_en,
        gender: c.gender || undefined,
        birth_date: c.birth_date || undefined,
        country: c.country || undefined,
        current_height: num(c.current_height),
        current_weight: num(c.current_weight),
        father_height: num(c.father_height),
        mother_height: num(c.mother_height),
        desired_height: num(c.desired_height),
        grade: c.grade,
        class_height_rank: c.class_height_rank,
        phone: c.phone,
        email: c.email,
        address: c.address,
        intake_survey: { ...s, updated_at: new Date().toISOString() },
      };
      await updateSubmission(sub.id, patch);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.');
      setSaving(false);
    }
  };

  const isMale = c.gender === 'male';
  const isFemale = c.gender === 'female';

  return (
    <div className="space-y-3">
      <Section title="기본정보">
        <Field label="이름"><input className={inputCls} value={c.name} onChange={(e) => setCol({ name: e.target.value })} /></Field>
        <Field label="영문 이름"><input className={inputCls} value={c.name_en} onChange={(e) => setCol({ name_en: e.target.value })} /></Field>
        <Field label="성별">
          <Select value={c.gender} onChange={(v) => setCol({ gender: v as '' | 'male' | 'female' })} opts={[{ value: 'male', label: '남' }, { value: 'female', label: '여' }]} />
        </Field>
        <Field label="생년월일"><input type="date" className={inputCls} value={c.birth_date} onChange={(e) => setCol({ birth_date: e.target.value })} /></Field>
        <Field label="국가(코드)"><input className={inputCls} value={c.country} onChange={(e) => setCol({ country: e.target.value })} placeholder="KR / TH / US ..." /></Field>
        <Field label="현재 키(cm)"><input type="number" className={inputCls} value={c.current_height} onChange={(e) => setCol({ current_height: e.target.value })} /></Field>
        <Field label="현재 몸무게(kg)"><input type="number" className={inputCls} value={c.current_weight} onChange={(e) => setCol({ current_weight: e.target.value })} /></Field>
        <Field label="아버지 키(cm)"><input type="number" className={inputCls} value={c.father_height} onChange={(e) => setCol({ father_height: e.target.value })} /></Field>
        <Field label="어머니 키(cm)"><input type="number" className={inputCls} value={c.mother_height} onChange={(e) => setCol({ mother_height: e.target.value })} /></Field>
        <Field label="목표 키(cm)"><input type="number" className={inputCls} value={c.desired_height} onChange={(e) => setCol({ desired_height: e.target.value })} /></Field>
        <Field label="학년"><input className={inputCls} value={c.grade} onChange={(e) => setCol({ grade: e.target.value })} /></Field>
        <Field label="반 키 순위"><input className={inputCls} value={c.class_height_rank} onChange={(e) => setCol({ class_height_rank: e.target.value })} /></Field>
        <Field label="연락처"><input className={inputCls} value={c.phone} onChange={(e) => setCol({ phone: e.target.value })} /></Field>
        <Field label="이메일"><input className={inputCls} value={c.email} onChange={(e) => setCol({ email: e.target.value })} /></Field>
        <Field label="주소"><input className={inputCls} value={c.address} onChange={(e) => setCol({ address: e.target.value })} /></Field>
      </Section>

      <Section title="출생 정보">
        <Field label="임신 주수"><input className={inputCls} value={s.gestational_weeks ?? ''} onChange={(e) => setSv({ gestational_weeks: e.target.value })} /></Field>
        <Field label="출생 몸무게"><input className={inputCls} value={s.birth_weight ?? ''} onChange={(e) => setSv({ birth_weight: e.target.value })} /></Field>
        <Field label="출생 특이사항"><input className={inputCls} value={s.birth_note ?? ''} onChange={(e) => setSv({ birth_note: e.target.value })} /></Field>
      </Section>

      <Section title="과거 성장기록">
        {s.growth_history.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
            {s.growth_history.map((g) => (
              <label key={g.age} className="flex items-center gap-2 py-1 text-sm">
                <span className="w-10 shrink-0 text-xs text-slate-500">{g.age}세</span>
                <input type="number" className={inputCls} value={g.height ?? ''} onChange={(e) => setHeight(g.age, e.target.value)} placeholder="cm" />
              </label>
            ))}
          </div>
        ) : (
          <p className="py-1 text-xs text-slate-400">기록 없음</p>
        )}
        <Field label="최근 1년 성장"><input className={inputCls} value={s.yearly_growth ?? ''} onChange={(e) => setSv({ yearly_growth: e.target.value })} /></Field>
        <Field label="급성장"><label className="flex items-center gap-2 pt-1.5 text-sm"><input type="checkbox" className="h-4 w-4" checked={s.growth_flags.rapid_growth} onChange={(e) => setFlag('rapid_growth', e.target.checked)} /> 예</label></Field>
        <Field label="성장 둔화"><label className="flex items-center gap-2 pt-1.5 text-sm"><input type="checkbox" className="h-4 w-4" checked={s.growth_flags.slowed} onChange={(e) => setFlag('slowed', e.target.checked)} /> 예</label></Field>
        <Field label="사춘기 우려"><label className="flex items-center gap-2 pt-1.5 text-sm"><input type="checkbox" className="h-4 w-4" checked={s.growth_flags.puberty_concern} onChange={(e) => setFlag('puberty_concern', e.target.checked)} /> 예</label></Field>
      </Section>

      <Section title="생활 습관">
        <Field label="취침 시간"><input type="time" className={inputCls} value={s.sleep_time ?? ''} onChange={(e) => setSv({ sleep_time: e.target.value })} /></Field>
        <Field label="기상 시간"><input type="time" className={inputCls} value={s.wake_time ?? ''} onChange={(e) => setSv({ wake_time: e.target.value })} /></Field>
        <Field label="운동 빈도"><Select value={s.exercise_frequency ?? ''} onChange={(v) => setSv({ exercise_frequency: v })} opts={L.exerciseOpts} /></Field>
        <Field label="우유/유제품"><Select value={s.milk_daily ?? ''} onChange={(v) => setSv({ milk_daily: v })} opts={L.milkOpts} /></Field>
        <Field label="식사 규칙성"><Select value={s.meal_regularity ?? ''} onChange={(v) => setSv({ meal_regularity: v })} opts={L.mealOpts} /></Field>
      </Section>

      <Section title="가족·관심">
        <Field label="유입 경로"><Select value={s.acquisition_channel ?? ''} onChange={(v) => setSv({ acquisition_channel: v || null })} opts={L.acquisitionChannelOpts} /></Field>
        <Field label="과거 클리닉 상담"><Select value={boolToStr(s.past_clinic_consult)} onChange={(v) => setSv({ past_clinic_consult: strToBool(v) })} opts={YESNO} placeholder="미응답" /></Field>
        <Field label="부모 관심"><Select value={boolToStr(s.parents_interested)} onChange={(v) => setSv({ parents_interested: strToBool(v) })} opts={YESNO} placeholder="미응답" /></Field>
        <Field label="체육 특기생"><Select value={boolToStr(s.sports_athlete)} onChange={(v) => setSv({ sports_athlete: strToBool(v) })} opts={YESNO} placeholder="미응답" /></Field>
        <Field label="종목"><input className={inputCls} value={s.sports_event} onChange={(e) => setSv({ sports_event: e.target.value })} /></Field>
        <Field label="아이 본인 관심"><Select value={boolToStr(s.child_interested)} onChange={(v) => setSv({ child_interested: strToBool(v) })} opts={YESNO} placeholder="미응답" /></Field>
      </Section>

      <Section title="의료문진">
        <Field label="만성 질환"><textarea className={inputCls} rows={2} value={s.chronic_conditions} onChange={(e) => setSv({ chronic_conditions: e.target.value })} /></Field>
        <Field label="복용 약/영양제"><input className={inputCls} value={s.current_medications ?? ''} onChange={(e) => setSv({ current_medications: e.target.value })} /></Field>
        {isMale && (
          <>
            <Field label="변성기"><Select value={s.voice_change ?? ''} onChange={(v) => setSv({ voice_change: v })} opts={L.voiceOpts} /></Field>
            <Field label="수염/체모"><Select value={s.facial_hair ?? ''} onChange={(v) => setSv({ facial_hair: v })} opts={L.facialOpts} /></Field>
          </>
        )}
        {isFemale && (
          <>
            <Field label="초경"><Select value={s.menarche ?? ''} onChange={(v) => setSv({ menarche: v })} opts={L.menarcheOpts} /></Field>
            <Field label="유방 발달"><Select value={s.breast_development ?? ''} onChange={(v) => setSv({ breast_development: v })} opts={L.breastOpts} /></Field>
          </>
        )}
        <Field label="Tanner 단계">
          <Select
            value={s.tanner_stage ? String(s.tanner_stage) : ''}
            onChange={(v) => setSv({ tanner_stage: v ? (Number(v) as TannerStage) : null })}
            opts={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}단계` }))}
            placeholder="미응답"
          />
        </Field>
      </Section>

      <Section title="키 작은 원인">
        <div className="flex flex-col gap-1.5 py-1">
          {L.causeOpts.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={s.short_stature_causes.includes(o.value as ShortStatureCause)}
                onChange={() => toggleCause(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
        <Field label="기타"><input className={inputCls} value={s.short_stature_other} onChange={(e) => setSv({ short_stature_other: e.target.value })} /></Field>
        <Field label="추가 메모"><textarea className={inputCls} rows={2} value={s.additional_notes ?? ''} onChange={(e) => setSv({ additional_notes: e.target.value })} /></Field>
      </Section>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="sticky bottom-0 flex gap-2 border-t border-slate-200 bg-white/95 py-2 backdrop-blur">
        <button type="button" onClick={onCancel} disabled={saving} className="flex-1 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          취소
        </button>
        <button type="button" onClick={save} disabled={saving} className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
          {saving ? '저장 중…' : '설문 저장'}
        </button>
      </div>
    </div>
  );
}
