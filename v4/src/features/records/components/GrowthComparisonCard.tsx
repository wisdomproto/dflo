import { useMemo, useState } from 'react';
import { GrowthComparisonDiagram } from '@/features/hospital/components/intake/GrowthComparisonDiagram';
import { predictAdultHeightByBonePercentile } from '@/features/bone-age/lib/growthPrediction';
import type { Child, HospitalMeasurement } from '@/shared/types';

interface Props {
  child: Child;
  measurements: HospitalMeasurement[];
}

function fmtMonth(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 환자용 성장 비교 카드 — 어드민의 GrowthComparisonDiagram 재사용.
 * 초기 키 / 최초 예측 성인키 / 최종 예측 성인키 3개 픽토그램.
 * BA 측정 회차가 2건 이상일 때만 노출 (1건이면 비교 의미 없음).
 */
export function GrowthComparisonCard({ child, measurements }: Props) {
  const data = useMemo(() => {
    if (measurements.length === 0) return null;
    const byDate = [...measurements].sort(
      (a, b) => new Date(a.measured_date).getTime() - new Date(b.measured_date).getTime(),
    );

    const firstWithHeight = byDate.find((m) => m.height && m.height > 0);
    const withBA = byDate.filter(
      (m) => m.height && m.height > 0 && m.bone_age != null && m.bone_age > 0,
    );
    if (!firstWithHeight || withBA.length < 2) return null;

    const firstBA = withBA[0];
    const lastBA = withBA[withBA.length - 1];

    const pah = (m: HospitalMeasurement) =>
      predictAdultHeightByBonePercentile(
        m.height,
        m.bone_age!,
        child.gender === 'male' ? 'M' : 'F',
        child.nationality ?? 'KR',
      );

    const firstPredicted = pah(firstBA);
    const finalPredicted = pah(lastBA);
    if (firstPredicted <= 0 || finalPredicted <= 0) return null;

    return {
      initialHeight: firstWithHeight.height,
      firstDate: firstBA.measured_date,
      finalDate: lastBA.measured_date,
      firstPredicted,
      finalPredicted,
    };
  }, [child, measurements]);

  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  const delta = Math.round((data.finalPredicted - data.firstPredicted) * 10) / 10;

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-gray-50 transition-colors"
      >
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          <span>📊</span> 최종 예측키 변화
          {delta !== 0 && (
            <span
              className={`ml-1 text-xs font-bold ${
                delta > 0 ? 'text-orange-600' : 'text-blue-600'
              }`}
            >
              {delta > 0 ? '+' : ''}
              {delta}cm
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">
            {fmtMonth(data.firstDate)} → {fmtMonth(data.finalDate)}
          </span>
          <span
            className={`text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 px-3 pt-2 pb-3">
          {delta !== 0 && (
            <p className="px-1 mb-1 text-[12px] text-gray-600">
              예측 성인키가{' '}
              <span
                className={`font-bold ${delta > 0 ? 'text-orange-600' : 'text-blue-600'}`}
              >
                {delta > 0 ? '+' : ''}
                {delta}cm
              </span>{' '}
              변화했어요
            </p>
          )}
          <GrowthComparisonDiagram
            initialHeight={data.initialHeight}
            predictedAdultHeight={data.firstPredicted}
            finalHeight={data.finalPredicted}
            lang="ko"
          />
        </div>
      )}
    </div>
  );
}
