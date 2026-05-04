import { useState } from 'react';
import { calculateAgeAtDate } from '@/shared/utils/age';
import type { Child, HospitalMeasurement } from '@/shared/types';

interface Props {
  child: Child;
  measurements: HospitalMeasurement[]; // 최신순
}

function formatDateShort(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
}

/**
 * 뼈나이 vs 실제 나이 비교 카드.
 * BA 측정된 회차만 골라서 친근한 한 줄 해석을 보여준다.
 */
export function BoneAgeCompareCard({ child, measurements }: Props) {
  const [expanded, setExpanded] = useState(false);

  const baMeasurements = measurements.filter((m) => m.bone_age != null);
  if (baMeasurements.length === 0) return null;

  const latest = baMeasurements[0];
  const realAge = calculateAgeAtDate(child.birth_date, new Date(latest.measured_date)).decimal;
  const boneAge = latest.bone_age!;
  const diff = boneAge - realAge;
  const absDiff = Math.abs(diff);

  let interpretation: { label: string; color: string; emoji: string };
  if (absDiff < 0.5) {
    interpretation = { label: '실제 나이와 비슷합니다', color: 'text-green-700 bg-green-50', emoji: '🟢' };
  } else if (diff > 0) {
    interpretation = {
      label: `실제보다 약 ${absDiff.toFixed(1)}세 빠른 편입니다`,
      color: 'text-amber-700 bg-amber-50',
      emoji: '⚡',
    };
  } else {
    interpretation = {
      label: `실제보다 약 ${absDiff.toFixed(1)}세 늦은 편입니다`,
      color: 'text-blue-700 bg-blue-50',
      emoji: '🕒',
    };
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <span>🦴</span> 뼈나이
          </h3>
          <span className="text-[10px] text-gray-400">{formatDateShort(latest.measured_date)} 측정</span>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-2">
          <Cell label="실제 나이" value={`${realAge.toFixed(1)}세`} accent="text-gray-600" />
          <Cell label="뼈나이" value={`${boneAge.toFixed(1)}세`} accent="text-amber-600" />
        </div>
        <div className={`mt-2 rounded-lg px-3 py-2 text-sm font-medium ${interpretation.color}`}>
          {interpretation.emoji} {interpretation.label}
        </div>

        {baMeasurements.length > 1 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 w-full text-xs font-semibold text-gray-500 active:text-gray-700"
          >
            {expanded ? '접기 ▲' : `이전 측정 ${baMeasurements.length - 1}건 보기 ▼`}
          </button>
        )}

        {expanded && baMeasurements.length > 1 && (
          <div className="mt-2 space-y-1.5">
            {baMeasurements.slice(1).map((m) => {
              const ra = calculateAgeAtDate(child.birth_date, new Date(m.measured_date)).decimal;
              const d = m.bone_age! - ra;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5"
                >
                  <span className="text-gray-500">{formatDateShort(m.measured_date)}</span>
                  <span className="text-gray-700">
                    실제 <span className="font-semibold">{ra.toFixed(1)}</span>
                    {' / '}
                    뼈나이 <span className="font-semibold text-amber-600">{m.bone_age!.toFixed(1)}</span>
                    {' '}
                    <span className={d > 0 ? 'text-amber-500' : d < 0 ? 'text-blue-500' : 'text-gray-400'}>
                      ({d > 0 ? '+' : ''}{d.toFixed(1)})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
          뼈나이는 손 X-ray 사진으로 측정한 발달 정도예요. 실제 나이와 큰 차이가 있을 때 진료 상담이 도움이 됩니다.
        </p>
      </div>
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className={`text-base font-bold ${accent}`}>{value}</p>
    </div>
  );
}
