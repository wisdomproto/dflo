import { useEffect, useState } from 'react';
import type { IntakeSurvey, TannerStage } from '@/shared/types';

interface Props {
  survey: IntakeSurvey;
  onSave: (patch: Partial<IntakeSurvey>) => void;
}

const TANNER_STAGES: TannerStage[] = [1, 2, 3, 4, 5];

/**
 * Section 4 — 의료 / 발달 (Q14 만성 질환, Q15 Tanner 단계).
 */
export function IntakeMedicalSection({ survey, onSave }: Props) {
  const [conditions, setConditions] = useState(survey.chronic_conditions);
  useEffect(() => setConditions(survey.chronic_conditions), [survey.chronic_conditions]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">4. 의료 · 발달</h2>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          <span>Q14. 과거 / 지속 치료 중인 질환</span>
          <textarea
            className="min-h-[72px] rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            onBlur={() => {
              if (conditions !== survey.chronic_conditions) {
                onSave({ chronic_conditions: conditions });
              }
            }}
            placeholder="천식, 알레르기, 만성비염, 수면 무호흡증 등"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-slate-500">
            Q15. 사춘기 평가 (Tanner 단계) — 성기 발달 · 음모 발달
          </span>
          <div className="inline-flex gap-2">
            {TANNER_STAGES.map((stage) => {
              const active = survey.tanner_stage === stage;
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() =>
                    onSave({ tanner_stage: active ? null : stage })
                  }
                  className={
                    'h-9 w-9 rounded-full border text-sm font-semibold transition ' +
                    (active
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400')
                  }
                >
                  {stage}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
