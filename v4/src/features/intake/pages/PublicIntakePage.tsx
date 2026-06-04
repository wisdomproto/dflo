import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { IntakeFormState, IntakeLang } from '../types';
import { INTAKE_LANGS } from '../types';
import { getLabels, LANG_DEFAULT_COUNTRY } from '../intakeLabels';
import { submitIntake } from '../publicIntakeService';
import type { IntakeSurvey } from '@/shared/types';
import { StepBasic } from '../components/StepBasic';
import type { StepProps } from '../components/StepBasic';
import { StepGrowth } from '../components/StepGrowth';
import { StepFamily } from '../components/StepFamily';
import { StepMedical } from '../components/StepMedical';
import { StepCauses } from '../components/StepCauses';
import { StepUploads } from '../components/StepUploads';

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
    father_height: '',
    mother_height: '',
    desired_height: '',
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

const STEPS: ((p: StepProps) => JSX.Element)[] = [
  StepBasic,
  StepGrowth,
  StepFamily,
  StepMedical,
  StepCauses,
  StepUploads,
];
const TOTAL = STEPS.length;

function validateStep(
  step: number,
  state: IntakeFormState,
  required: string,
): Record<string, string> {
  if (step !== 0) return {};
  const e: Record<string, string> = {};
  if (!state.name.trim()) e.name = required;
  if (!state.gender) e.gender = required;
  if (!state.birthYear.trim() || !state.birthMonth.trim() || !state.birthDay.trim())
    e.birth = required;
  if (!state.country) e.country = required;
  if (!state.phone.trim()) e.phone = required;
  return e;
}

export default function PublicIntakePage() {
  const { lang: rawLang } = useParams();
  const lang: IntakeLang = INTAKE_LANGS.includes(rawLang as IntakeLang)
    ? (rawLang as IntakeLang)
    : 'ko';
  const L = getLabels(lang);

  const [state, setState] = useState<IntakeFormState>(() => initialState(lang));
  const set = (patch: Partial<IntakeFormState>) => setState((s) => ({ ...s, ...patch }));

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const isLast = step === TOTAL - 1;

  const next = () => {
    const e = validateStep(step, state, L.required);
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
        dir="ltr"
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
    <div dir="ltr" className="min-h-screen bg-slate-50 px-4 py-6">
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
          <ActiveStep state={state} set={set} L={L} errors={errors} />
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <span className="text-sm font-medium text-rose-600">⚠</span>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
            className="ml-auto flex-1 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 sm:flex-none"
          >
            {isLast ? (submitting ? L.submitting : L.submit) : L.next}
          </button>
        </footer>
      </div>
    </div>
  );
}
