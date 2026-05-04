// ================================================
// IntakeGrowthChartCard — 상담 단계 환자용 첫 섹션
// 공포 마케팅 — "이대로 두면 18세에 약 N cm"
// ================================================

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GrowthChart, type GrowthPoint } from '@/shared/components/GrowthChart';
import { calculateAgeAtDate } from '@/shared/utils/age';
import {
  predictAdultHeightLMS,
  calculateHeightPercentileLMS,
} from '@/shared/data/growthStandard';
import { calculateMidParentalHeight } from '@/shared/utils/growth';
import type { Child, Measurement } from '@/shared/types';

interface Props {
  child: Child & { latestMeasurement?: Measurement };
}

export function IntakeGrowthChartCard({ child }: Props) {
  const data = useMemo(() => {
    const history = child.intake_survey?.growth_history ?? [];
    const points: GrowthPoint[] = [];

    // intake_survey 의 8~16세 성장 이력을 chart points 로
    for (const h of history) {
      if (h.height && h.height > 0 && h.age >= 2) {
        points.push({ age: h.age, height: h.height });
      }
    }

    // 현재 측정값 (children.latestMeasurement)
    const latest = child.latestMeasurement;
    let currentHeight: number | null = null;
    let currentAge: number | null = null;
    if (latest?.height && latest.height > 0) {
      currentHeight = latest.height;
      const a = calculateAgeAtDate(child.birth_date, new Date(latest.measured_date));
      currentAge = a.decimal;
      // history 와 중복 안 되게: 같은 정수 age 가 있으면 skip
      const ageInt = Math.round(currentAge);
      if (!points.some((p) => Math.round(p.age) === ageInt)) {
        points.push({ age: currentAge, height: latest.height });
      }
    }

    points.sort((a, b) => a.age - b.age);

    if (points.length === 0) return null;

    // 가장 최근 (=가장 큰 age) 측정 기준 18세 LMS 예측
    const tail = points[points.length - 1];
    const predicted = predictAdultHeightLMS(tail.height, tail.age, child.gender);
    const percentile = calculateHeightPercentileLMS(tail.height, tail.age, child.gender);

    const mph = (() => {
      if (!child.father_height || !child.mother_height) return null;
      const v = calculateMidParentalHeight(child.father_height, child.mother_height, child.gender);
      return v > 0 ? v : null;
    })();

    return {
      points,
      currentHeight: currentHeight ?? tail.height,
      currentAge: currentAge ?? tail.age,
      predicted: predicted > 0 ? predicted : null,
      percentile,
      mph,
    };
  }, [child]);

  if (!data) return null;

  // 공포 카피 — 예측키와 부모 평균(MPH) 비교
  const gap = data.predicted != null && data.mph != null ? data.mph - data.predicted : null;
  const fearCopy = data.predicted == null
    ? '지금 데이터로는 예측이 어려워요. 의료진과 상담을 받아보세요.'
    : data.percentile < 25
    ? `또래 ${Math.round(data.percentile)}% 수준이에요. 지금 관리가 중요한 시기예요.`
    : data.percentile < 50
    ? `또래 평균보다 살짝 낮은 ${Math.round(data.percentile)}% 수준이에요.`
    : `또래 ${Math.round(data.percentile)}% 수준이에요. 더 키울 여지가 있어요.`;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-rose-50 via-white to-indigo-50 shadow-sm border border-rose-200 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
          <span>📈</span> {child.name} 성장 예측
        </h3>
        <span className="text-[10px] text-gray-400">현재 데이터 기반</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="현재 키" value={`${data.currentHeight}`} unit="cm" accent="text-gray-800" />
        <Stat
          label="18세 예측"
          value={data.predicted ? `${data.predicted}` : '-'}
          unit="cm"
          accent="text-rose-600"
        />
        <Stat
          label="부모 평균"
          value={data.mph != null ? `${data.mph.toFixed(0)}` : '-'}
          unit="cm"
          accent="text-indigo-600"
        />
      </div>

      <div className="rounded-xl bg-white/60 p-2">
        <GrowthChart
          gender={child.gender}
          points={data.points}
          compact
          showTitle={false}
          predictedAdultHeight={data.predicted ?? undefined}
        />
      </div>

      <p className="text-sm text-gray-700 leading-relaxed">
        {fearCopy}
        {gap != null && gap > 5 && (
          <>
            {' '}
            <span className="font-bold text-rose-600">
              부모 평균보다 약 {Math.round(gap)}cm 작게 클 가능성이 있어요.
            </span>
          </>
        )}
      </p>

      <div className="flex gap-2">
        <a
          href="https://pf.kakao.com/_ZxneSb"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-xl bg-yellow-300 py-2.5 text-center text-sm font-bold text-gray-900 active:opacity-90 shadow-sm"
        >
          💬 1:1 상담받기
        </a>
        <Link
          to="/app/records"
          className="flex-1 rounded-xl bg-primary py-2.5 text-center text-sm font-bold text-white active:opacity-90 shadow-sm"
        >
          📋 상담 기록 보기
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent: string;
}) {
  return (
    <div className="rounded-lg bg-white/70 px-2 py-2">
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-lg font-extrabold leading-none ${accent}`}>
        {value}
        <span className="text-[10px] font-normal text-gray-400 ml-0.5">{unit}</span>
      </p>
    </div>
  );
}
