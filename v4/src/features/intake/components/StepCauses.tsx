import type { StepProps } from './StepBasic';
import type { ShortStatureCause } from '@/shared/types';
import { ChipMulti, TextField } from './fields';

export function StepCauses({ state, set, L }: StepProps) {
  const s = state.survey;
  const options = L.causeOpts.map((o) => ({
    value: o.value as ShortStatureCause,
    label: o.label,
  }));

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-slate-800">{L.s5Title}</h2>

      <ChipMulti<ShortStatureCause>
        label={L.causes}
        options={options}
        selected={s.short_stature_causes}
        onChange={(next) => set({ survey: { ...s, short_stature_causes: next } })}
      />

      <TextField
        label={L.causesOther}
        value={s.short_stature_other}
        onChange={(v) => set({ survey: { ...s, short_stature_other: v } })}
      />
    </div>
  );
}
