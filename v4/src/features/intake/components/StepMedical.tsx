import type { StepProps } from './StepBasic';
import type { TannerStage } from '@/shared/types';
import { TextField, SelectField } from './fields';

export function StepMedical({ state, set, L }: StepProps) {
  const s = state.survey;
  const setSurvey = (patch: Partial<typeof s>) => set({ survey: { ...s, ...patch } });

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
        onChange={(v) => setSurvey({ chronic_conditions: v })}
        multiline
      />

      <TextField
        label={L.currentMeds}
        value={s.current_medications ?? ''}
        onChange={(v) => setSurvey({ current_medications: v })}
      />

      {state.gender === 'male' && (
        <>
          <SelectField
            label={L.voiceChange}
            value={s.voice_change ?? ''}
            onChange={(v) => setSurvey({ voice_change: v || undefined })}
            options={L.voiceOpts}
          />
          <SelectField
            label={L.facialHair}
            value={s.facial_hair ?? ''}
            onChange={(v) => setSurvey({ facial_hair: v || undefined })}
            options={L.facialOpts}
          />
        </>
      )}
      {state.gender === 'female' && (
        <>
          <SelectField
            label={L.menarche}
            value={s.menarche ?? ''}
            onChange={(v) => setSurvey({ menarche: v || undefined })}
            options={L.menarcheOpts}
          />
          <SelectField
            label={L.breastDev}
            value={s.breast_development ?? ''}
            onChange={(v) => setSurvey({ breast_development: v || undefined })}
            options={L.breastOpts}
          />
        </>
      )}

      <SelectField
        label={L.tanner}
        value={tannerValue}
        onChange={(v) =>
          setSurvey({ tanner_stage: v === '' ? null : (Number(v) as TannerStage) })
        }
        options={tannerOptions}
      />
    </div>
  );
}
