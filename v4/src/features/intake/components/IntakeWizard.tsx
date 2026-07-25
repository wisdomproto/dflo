import { useEffect, useState, type ReactElement } from 'react';
import { INTAKE_RTL_LANGS, type IntakeFormState, type IntakeLang } from '../types';
import { getLabels, LANG_DEFAULT_COUNTRY } from '../intakeLabels';
import { submitIntake } from '../publicIntakeService';
import type { IntakeSurvey } from '@/shared/types';
import { StepBasic } from './StepBasic';
import type { StepProps } from './StepBasic';
import { StepGrowth } from './StepGrowth';
import { StepFamily } from './StepFamily';
import { StepLifestyle } from './StepLifestyle';
import { StepMedical } from './StepMedical';
import { StepCauses } from './StepCauses';
import { StepUploads } from './StepUploads';

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
    gestational_weeks: '',
    birth_weight: '',
    birth_note: '',
    yearly_growth: '',
    sleep_time: '',
    wake_time: '',
    current_medications: '',
    additional_notes: '',
    updated_at: '',
  };
}

function initialState(lang: IntakeLang): IntakeFormState {
  return {
    name: '',
    name_en: '',
    gender: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    country: LANG_DEFAULT_COUNTRY[lang],
    growth_ref: LANG_DEFAULT_COUNTRY[lang],
    father_height: '',
    mother_height: '',
    desired_height: '',
    current_height: '',
    current_weight: '',
    grade: '',
    class_height_rank: '',
    phone: '',
    email: '',
    address: '',
    survey: emptySurvey(),
    xrayFiles: [],
    labFiles: [],
  };
}

const STEPS: ((p: StepProps) => ReactElement)[] = [
  StepBasic,
  StepGrowth,
  StepFamily,
  StepLifestyle,
  StepMedical,
  StepCauses,
  StepUploads,
];
const TOTAL = STEPS.length;

/** 실제 존재하는 달력 날짜인지 검사 — 2월 31일·13월 등 불가능한 조합을 걸러
 *  DB insert 시 "date/time field value out of range" (Postgres 22008) 로 죽는 걸 막는다. */
function isRealDate(yy: string, mm: string, dd: string): boolean {
  const y = Number(yy);
  const m = Number(mm);
  const d = Number(dd);
  if (![y, m, d].every(Number.isInteger)) return false;
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function validateStep(
  step: number,
  state: IntakeFormState,
  L: { required: string; invalidBirth: string },
): Record<string, string> {
  if (step !== 0) return {};
  const e: Record<string, string> = {};
  if (!state.name.trim()) e.name = L.required;
  if (!state.gender) e.gender = L.required;
  if (!state.birthYear.trim() || !state.birthMonth.trim() || !state.birthDay.trim()) {
    e.birth = L.required;
  } else if (!isRealDate(state.birthYear, state.birthMonth, state.birthDay)) {
    e.birth = L.invalidBirth;
  }
  if (!state.country) e.country = L.required;
  if (!state.phone.trim()) e.phone = L.required;
  return e;
}

/** The 7-step intake wizard, rendered in a fixed language.
 *  `/intake/:lang` (PublicIntakePage) and `/intake` (GlobalIntakePage) both use this. */
export default function IntakeWizard({ lang }: { lang: IntakeLang }) {
  const L = getLabels(lang);

  const [state, setState] = useState<IntakeFormState>(() => initialState(lang));
  const set = (patch: Partial<IntakeFormState>) => setState((s) => ({ ...s, ...patch }));

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const isLast = step === TOTAL - 1;
  const dir = INTAKE_RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';

  // 상담 페이지(/{lang}/consult.html)가 이 위저드를 iframe 으로 띄운다.
  // 제출이 끝나면 부모가 오버레이를 닫고 메신저 채널로 돌려보낼 수 있게 알린다.
  useEffect(() => {
    if (done && window.parent !== window) {
      window.parent.postMessage({ type: 'intake_done' }, window.location.origin);
    }
  }, [done]);

  const next = () => {
    const e = validateStep(step, state, L);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, TOTAL - 1));
  };

  const prev = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    setSubmitError(false);
    setSubmitting(true);
    try {
      await submitIntake(lang, state);
      setDone(true);
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div
        dir={dir}
        className="flex min-h-screen items-center justify-center bg-slate-50 px-4"
      >
        <div className="w-full max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-5xl">✅</div>
          <h1 className="mb-3 text-2xl font-bold text-slate-800">{L.doneTitle}</h1>
          <p className="text-base text-slate-600">{L.doneBody}</p>
        </div>
      </div>
    );
  }

  const ActiveStep = STEPS[step];

  return (
    <div dir={dir} className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <header className="mb-5">
          <h1 className="text-xl font-bold text-slate-800">{L.pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{L.stepOf(step + 1, TOTAL)}</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${((step + 1) / TOTAL) * 100}%` }}
            />
          </div>
        </header>

        {/* Active step */}
        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <ActiveStep lang={lang} state={state} set={set} L={L} errors={errors} />
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <span className="text-sm font-medium text-rose-600">⚠ {L.submitError}</span>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="shrink-0 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {L.retry}
            </button>
          </div>
        )}

        {/* Footer nav */}
        <footer className="mt-5 flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={prev}
              disabled={submitting}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {L.prev}
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? submit : next}
            disabled={submitting}
            className="ms-auto flex-1 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 sm:flex-none"
          >
            {isLast ? (submitting ? L.submitting : L.submit) : L.next}
          </button>
        </footer>
      </div>
    </div>
  );
}
