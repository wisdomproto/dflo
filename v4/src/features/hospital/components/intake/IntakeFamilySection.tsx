import { useEffect, useState } from 'react';
import type { IntakeSurvey } from '@/shared/types';

interface Props {
  survey: IntakeSurvey;
  onSave: (patch: Partial<IntakeSurvey>) => void;
}

/**
 * Section 3 — 가족 / 관심도 (Q9, Q10, Q12, Q13).
 * Yes/No segmented chips + optional sports-event text.
 */
export function IntakeFamilySection({ survey, onSave }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">3. 가족 · 관심도</h2>
      <div className="flex flex-col gap-3">
        <YesNoRow
          label="Q9. 과거 성장 클리닉에서 상담해 본 적이 있습니까?"
          value={survey.past_clinic_consult}
          onChange={(v) => onSave({ past_clinic_consult: v })}
        />
        <YesNoRow
          label="Q10. 양측 부모님 모두 성장 클리닉에 관심이 있으십니까?"
          value={survey.parents_interested}
          onChange={(v) => onSave({ parents_interested: v })}
        />
        <div className="flex flex-col gap-2">
          <YesNoRow
            label="Q12. 체육 특기생입니까?"
            value={survey.sports_athlete}
            onChange={(v) => onSave({ sports_athlete: v })}
          />
          {survey.sports_athlete === true && (
            <SportsEventInput
              value={survey.sports_event}
              onSave={(v) => onSave({ sports_event: v })}
            />
          )}
        </div>
        <YesNoRow
          label="Q13. 아이도 키 크는 것에 관심이 있습니까?"
          value={survey.child_interested}
          onChange={(v) => onSave({ child_interested: v })}
        />
      </div>
    </section>
  );
}

function YesNoRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="inline-flex overflow-hidden rounded border border-slate-300">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={
            'px-3 py-1 text-xs ' +
            (value === true
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50')
          }
        >
          예
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={
            'border-l border-slate-300 px-3 py-1 text-xs ' +
            (value === false
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50')
          }
        >
          아니오
        </button>
      </div>
    </div>
  );
}

function SportsEventInput({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <label className="flex items-center gap-2 pl-4 text-xs text-slate-500">
      <span>종목</span>
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onSave(local);
        }}
        className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
        placeholder="예) 축구, 수영"
      />
    </label>
  );
}
