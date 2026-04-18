import { useEffect, useState } from 'react';
import type { IntakeSurvey, ShortStatureCause } from '@/shared/types';
import { SectionCard } from './SectionCard';

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
    <SectionCard step="05" title="키가 작은 원인" subtitle="Q16 · 복수 선택" accent="amber">
      <div className="flex flex-wrap gap-2">
        {CAUSE_OPTIONS.map(({ key, label }) => {
          const active = causes.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={
                'rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition ' +
                (active
                  ? 'border-amber-400 bg-gradient-to-b from-amber-50 to-amber-100 text-amber-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50')
              }
            >
              {active ? '✓ ' : ''}
              {label}
            </button>
          );
        })}
      </div>
      <label className="mt-4 flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        <span>기타 원인</span>
        <textarea
          className="min-h-[64px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          onBlur={() => {
            if (other !== (survey.short_stature_other ?? '')) {
              onSave({ short_stature_other: other });
            }
          }}
        />
      </label>
    </SectionCard>
  );
}
