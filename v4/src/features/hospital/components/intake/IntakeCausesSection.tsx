import { useEffect, useState } from 'react';
import type { IntakeSurvey, ShortStatureCause } from '@/shared/types';

interface Props {
  survey: IntakeSurvey;
  onSave: (patch: Partial<IntakeSurvey>) => void;
}

const CAUSE_OPTIONS: { key: ShortStatureCause; label: string }[] = [
  { key: 'parents_short', label: '부모님의 키가 작다' },
  { key: 'parents_height_gap', label: '부모님의 키 차이가 크다' },
  { key: 'picky_eating', label: '편식 · 식사 부족' },
  { key: 'parents_early_stop', label: '부모님이 어렸을 때 일찍 성장이 멈췄다' },
  { key: 'insufficient_sleep', label: '수면 시간이 부족하다' },
  { key: 'chronic_illness', label: '지속 치료 중인 질환이 있다' },
];

/**
 * Section 5 — Q16 키가 작은 원인 (다중 선택) + 기타 자유 서술.
 */
export function IntakeCausesSection({ survey, onSave }: Props) {
  const causes = survey.short_stature_causes ?? [];
  const [other, setOther] = useState(survey.short_stature_other ?? '');
  useEffect(() => setOther(survey.short_stature_other ?? ''), [survey.short_stature_other]);

  const toggle = (key: ShortStatureCause) => {
    const next = causes.includes(key)
      ? causes.filter((c) => c !== key)
      : [...causes, key];
    onSave({ short_stature_causes: next });
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">
        5. 키가 작은 원인 <span className="ml-1 text-xs font-normal text-slate-400">복수 선택</span>
      </h2>
      <div className="flex flex-wrap gap-2">
        {CAUSE_OPTIONS.map(({ key, label }) => {
          const active = causes.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={
                'rounded-full border px-3 py-1 text-xs transition ' +
                (active
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')
              }
            >
              {active ? '✓ ' : ''}
              {label}
            </button>
          );
        })}
      </div>
      <label className="mt-3 flex flex-col gap-1 text-xs text-slate-500">
        <span>기타 원인</span>
        <textarea
          className="min-h-[60px] rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          onBlur={() => {
            if (other !== (survey.short_stature_other ?? '')) {
              onSave({ short_stature_other: other });
            }
          }}
        />
      </label>
    </section>
  );
}
