import type { StepProps } from './StepBasic';
import type { TannerStage } from '@/shared/types';
import { TextField, SelectField } from './fields';

export function StepMedical({ state, set, L }: StepProps) {
  const s = state.survey;

  const tannerValue = s.tanner_stage == null ? '' : String(s.tanner_stage);
  const tannerOptions = L.tannerOpts.map((opt, i) => ({
    value: String(i + 1),
    label: opt,
  }));

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-slate-800">{L.s4Title}</h2>

      <TextField
        label={L.chronic}
        value={s.chronic_conditions}
        onChange={(v) => set({ survey: { ...s, chronic_conditions: v } })}
        multiline
      />

      <SelectField
        label={L.tanner}
        value={tannerValue}
        onChange={(v) =>
          set({
            survey: {
              ...s,
              tanner_stage: v === '' ? null : (Number(v) as TannerStage),
            },
          })
        }
        options={tannerOptions}
      />
    </div>
  );
}
