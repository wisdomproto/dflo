import type { StepProps } from './StepBasic';
import { TextField, SelectField } from './fields';

export function StepLifestyle({ state, set, L }: StepProps) {
  const s = state.survey;
  const setSurvey = (patch: Partial<typeof s>) => set({ survey: { ...s, ...patch } });

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-slate-800">{L.sLifeTitle}</h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label={L.sleepTime}
          value={s.sleep_time ?? ''}
          onChange={(v) => setSurvey({ sleep_time: v })}
          type="time"
        />
        <TextField
          label={L.wakeTime}
          value={s.wake_time ?? ''}
          onChange={(v) => setSurvey({ wake_time: v })}
          type="time"
        />
      </div>

      <SelectField
        label={L.exerciseFreq}
        value={s.exercise_frequency ?? ''}
        onChange={(v) => setSurvey({ exercise_frequency: v || undefined })}
        options={L.exerciseOpts}
      />
      <SelectField
        label={L.milkDaily}
        value={s.milk_daily ?? ''}
        onChange={(v) => setSurvey({ milk_daily: v || undefined })}
        options={L.milkOpts}
      />
      <SelectField
        label={L.mealReg}
        value={s.meal_regularity ?? ''}
        onChange={(v) => setSurvey({ meal_regularity: v || undefined })}
        options={L.mealOpts}
      />
    </div>
  );
}
