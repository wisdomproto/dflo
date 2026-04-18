import { useEffect, useState } from 'react';
import type { IntakeSurvey } from '@/shared/types';
import { SectionCard } from './SectionCard';

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
    <SectionCard step="03" title="가족 · 관심도" subtitle="Q9 · Q10 · Q12 · Q13" accent="sky">
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
    </SectionCard>
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={
            'px-4 py-1.5 text-xs font-medium transition ' +
            (value === true
              ? 'bg-sky-500 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50')
          }
        >
          예
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={
            'border-l border-slate-200 px-4 py-1.5 text-xs font-medium transition ' +
            (value === false
              ? 'bg-slate-700 text-white'
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
        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        placeholder="예) 축구, 수영"
      />
    </label>
  );
}
