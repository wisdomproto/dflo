// ================================================
// GrowthCaseSwipeCard - 성장 사례 스와이프 카드
// ================================================

import GenderIcon from '@/shared/components/GenderIcon';
import type { GrowthCase } from '@/shared/types';

interface Props {
  caseData: GrowthCase;
  onClick: () => void;
}

export function GrowthCaseSwipeCard({ caseData, onClick }: Props) {
  const c = caseData;
  const measurements = c.measurements ?? [];
  const withPah = measurements.filter((m) => m.pah != null);
  const lastPah = withPah.length > 0 ? withPah[withPah.length - 1].pah : null;
  const firstPah = withPah.length > 0 ? withPah[0].pah : null;
  const diff = lastPah != null && firstPah != null && withPah.length > 1
    ? (Number(lastPah) - Number(firstPah)).toFixed(1)
    : null;

  const isMale = c.gender === 'male';

  return (
    <button onClick={onClick} className="w-full text-left active:scale-[0.97] transition-transform">
      <div className={`rounded-xl border p-4 h-36 flex flex-col justify-between relative overflow-hidden
        ${isMale ? 'bg-gradient-to-br from-white to-blue-50/50 border-blue-100' : 'bg-gradient-to-br from-white to-pink-50/50 border-pink-100'}`}>
        {/* 장식 */}
        <div className={`absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-10
          ${isMale ? 'bg-blue-500' : 'bg-pink-500'}`} />

        <div className="flex items-center gap-2.5 relative">
          <GenderIcon gender={c.gender} size="sm" />
          <div>
            <h4 className="text-sm font-bold text-gray-900">차트 #{c.patient_name}</h4>
            <p className="text-[10px] text-gray-400">{measurements.length}회 측정</p>
          </div>
        </div>

        {c.special_notes && (
          <p className="text-[11px] text-gray-500 line-clamp-2 flex-1 mt-1 leading-relaxed relative">{c.special_notes}</p>
        )}

        {lastPah != null && (
          <div className="flex items-center gap-2 mt-auto pt-1 relative">
            <span className="text-xs text-gray-400">예측키</span>
            <span className={`text-sm font-bold ${isMale ? 'text-blue-600' : 'text-pink-600'}`}>
              {lastPah}cm
            </span>
            {diff != null && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                Number(diff) >= 0
                  ? 'bg-green-50 text-green-600'
                  : 'bg-red-50 text-red-500'
              }`}>
                {Number(diff) >= 0 ? '+' : ''}{diff}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
