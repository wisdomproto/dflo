import type { IntakeFormState } from '../types';
import type { IntakeLabelSet } from '../intakeLabels';
import { COUNTRIES } from '@/shared/data/countries';
import { TextField, NumberField, SelectField, Date3Field } from './fields';

export interface StepProps {
  state: IntakeFormState;
  set: (patch: Partial<IntakeFormState>) => void;
  L: IntakeLabelSet;
  errors: Record<string, string>;
}

export function StepBasic({ state, set, L, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-slate-800">{L.s1Title}</h2>

      <TextField
        label={L.name}
        value={state.name}
        onChange={(v) => set({ name: v })}
        required
        error={errors.name}
      />
      <TextField
        label={L.nameEn}
        value={state.name_en}
        onChange={(v) => set({ name_en: v })}
      />

      {/* gender — two buttons */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {L.gender}
          <span className="ml-0.5 text-rose-500">*</span>
        </span>
        <div className="flex gap-3">
          {(
            [
              ['male', L.male],
              ['female', L.female],
            ] as const
          ).map(([v, lbl]) => {
            const active = state.gender === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => set({ gender: v })}
                className={
                  'flex-1 rounded-xl border px-4 py-3 text-base font-semibold transition ' +
                  (active
                    ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')
                }
              >
                {lbl}
              </button>
            );
          })}
        </div>
        {errors.gender && (
          <span className="text-xs font-medium text-rose-500">{errors.gender}</span>
        )}
      </div>

      <Date3Field
        label={L.birth}
        year={state.birthYear}
        month={state.birthMonth}
        day={state.birthDay}
        onYear={(v) => set({ birthYear: v })}
        onMonth={(v) => set({ birthMonth: v })}
        onDay={(v) => set({ birthDay: v })}
        yearLabel={L.year}
        monthLabel={L.month}
        dayLabel={L.day}
        required
        error={errors.birth}
      />

      <SelectField
        label={L.country}
        value={state.country}
        onChange={(v) => set({ country: v })}
        options={COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag} ${c.ko}` }))}
        required
        error={errors.country}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <NumberField
          label={L.currentH}
          value={state.current_height}
          onChange={(v) => set({ current_height: v })}
        />
        <NumberField
          label={L.currentW}
          value={state.current_weight}
          onChange={(v) => set({ current_weight: v })}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <NumberField
          label={L.fatherH}
          value={state.father_height}
          onChange={(v) => set({ father_height: v })}
        />
        <NumberField
          label={L.motherH}
          value={state.mother_height}
          onChange={(v) => set({ mother_height: v })}
        />
        <NumberField
          label={L.desiredH}
          value={state.desired_height}
          onChange={(v) => set({ desired_height: v })}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField label={L.grade} value={state.grade} onChange={(v) => set({ grade: v })} />
        <TextField
          label={L.classRank}
          value={state.class_height_rank}
          onChange={(v) => set({ class_height_rank: v })}
        />
      </div>

      <TextField
        label={L.phone}
        value={state.phone}
        onChange={(v) => set({ phone: v })}
        type="tel"
        required
        error={errors.phone}
      />
      <TextField
        label={L.email}
        value={state.email}
        onChange={(v) => set({ email: v })}
        type="email"
      />
      <TextField
        label={L.address}
        value={state.address}
        onChange={(v) => set({ address: v })}
      />
    </div>
  );
}
