import { useEffect, useState } from 'react';
import type { Gender, IntakeSurvey, TannerStage } from '@/shared/types';
import { SectionCard } from './SectionCard';

interface Props {
  survey: IntakeSurvey;
  /** Default gender (from children record). User can flip the view locally. */
  defaultGender: Gender;
  onSave: (patch: Partial<IntakeSurvey>) => void;
}

const TANNER_STAGES: TannerStage[] = [1, 2, 3, 4, 5];

const MALE_DESCRIPTIONS: Record<TannerStage, string> = {
  1: '음경과 고환이 아직 발달 전, 음모가 거의 없음',
  2: '음경과 고환이 조금 발달, 약간의 음모',
  3: '음경과 고환이 더 발달, 음모가 많음',
  4: '음경과 고환이 성인에 가까워짐, 음모가 더 많음',
  5: '음경과 고환이 완전히 성인형, 음모가 성인 수준',
};

const FEMALE_DESCRIPTIONS: Record<TannerStage, string> = {
  1: '유방과 유두가 아직 발달 전, 음모가 거의 없음',
  2: '유방과 유두가 조금 발달, 약간의 음모',
  3: '유방과 유두가 더 발달, 음모가 많음',
  4: '유방과 유두가 성인에 가까워짐, 음모가 더 많음',
  5: '유방과 유두가 완전히 성인형, 음모가 성인 수준',
};

const TANNER_IMAGE: Record<Gender, string> = {
  male: '/images/tanner/male.png',
  female: '/images/tanner/female.png',
};

/**
 * Section 4 — 의료 / 발달 (Q14 만성 질환, Q15 Tanner 단계).
 */
export function IntakeMedicalSection({ survey, defaultGender, onSave }: Props) {
  const [conditions, setConditions] = useState(survey.chronic_conditions);
  useEffect(() => setConditions(survey.chronic_conditions), [survey.chronic_conditions]);
  // Tanner reference image + descriptions follow the patient's gender set in
  // section 1 (기본 정보) — no separate toggle in this section.
  const viewGender: Gender = defaultGender;

  return (
    <SectionCard step="04" title="의료 · 발달" subtitle="Q14 만성 질환 · Q15 사춘기 단계" accent="rose">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          <span>Q14. 과거 / 지속 치료 중인 질환</span>
          <textarea
            className="min-h-[80px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
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

        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Q15. 사춘기 평가 (Tanner 단계)
          </span>

          {/* Reference chart image + per-stage description rows */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <TannerImage src={TANNER_IMAGE[viewGender]} gender={viewGender} />
            <div className="grid grid-cols-1 gap-1.5">
              {TANNER_STAGES.map((stage) => {
                const active = survey.tanner_stage === stage;
                const desc =
                  viewGender === 'male'
                    ? MALE_DESCRIPTIONS[stage]
                    : FEMALE_DESCRIPTIONS[stage];
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() =>
                      onSave({ tanner_stage: active ? null : stage })
                    }
                    className={
                      'flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm shadow-sm transition ' +
                      (active
                        ? 'border-rose-400 bg-gradient-to-r from-rose-50 to-white text-rose-900 ring-1 ring-rose-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50/40')
                    }
                  >
                    <span
                      className={
                        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold ' +
                        (active
                          ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white'
                          : 'bg-slate-100 text-slate-600')
                      }
                    >
                      {stage}
                    </span>
                    <span className="flex-1 text-[13px] leading-snug">{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function TannerImage({ src, gender }: { src: string; gender: Gender }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-center text-[11px] text-slate-400">
        Tanner 참고 이미지 ({gender === 'male' ? '남아' : '여아'})가 아직 업로드되지 않았습니다.
        <br />
        파일을{' '}
        <code className="rounded bg-slate-100 px-1 text-[10px]">
          v4/public/images/tanner/{gender}.png
        </code>{' '}
        경로에 저장해 주세요.
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`Tanner ${gender}`}
      onError={() => setFailed(true)}
      className="w-full max-w-xl self-center rounded-lg border border-slate-200 bg-white object-contain shadow-sm"
    />
  );
}
