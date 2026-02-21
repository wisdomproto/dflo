// ================================================
// MeasurementTable - 187 성장케어 v4
// 측정 기록 테이블 공통 컴포넌트
// GrowthPage & InfoPage(CaseDetail) 공용
// ================================================

import { useMemo } from 'react';
import { calculateHeightPercentileLMS, predictAdultHeightLMS } from '@/shared/data/growthStandard';
import type { Gender } from '@/shared/types';

// ── 공통 측정 행 인터페이스 ──
export interface MeasurementRow {
  key: string;
  date: string;            // YYYY-MM-DD
  age?: string;            // "7세 3개월" 형식
  ageDecimal?: number;     // 7.25
  height?: number | null;
  weight?: number | null;
  boneAge?: number | null;
  pah?: number | null;
  notes?: string;
}

interface MeasurementTableProps {
  rows: MeasurementRow[];
  gender?: Gender;
  /** 컬럼 표시 여부 */
  showBoneAge?: boolean;
  showPah?: boolean;
  showPercentile?: boolean;
  showPredicted?: boolean;
  /** 최대 높이 (스크롤) */
  maxHeight?: string;
}

export function MeasurementTable({
  rows,
  gender,
  showBoneAge = false,
  showPah = false,
  showPercentile = false,
  showPredicted = false,
  maxHeight = '20rem',
}: MeasurementTableProps) {
  // LMS 기반 계산값 미리 생성
  const enrichedRows = useMemo(() => {
    return rows.map((r) => {
      let percentile: number | null = null;
      let predicted: number | null = null;

      if (gender && r.height && r.ageDecimal && r.ageDecimal >= 2) {
        if (showPercentile) {
          percentile = calculateHeightPercentileLMS(r.height, r.ageDecimal, gender);
        }
        if (showPredicted) {
          const p = predictAdultHeightLMS(r.height, r.ageDecimal, gender);
          if (p > 0) predicted = p;
        }
      }

      return { ...r, percentile, predicted };
    });
  }, [rows, gender, showPercentile, showPredicted]);

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto" style={{ maxHeight }}>
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="text-left py-2 pr-2">날짜</th>
            <th className="text-right py-2 px-1">키</th>
            <th className="text-right py-2 px-1">체중</th>
            {showBoneAge && <th className="text-right py-2 px-1">골연령</th>}
            {showPercentile && <th className="text-right py-2 px-1">백분위</th>}
            {showPredicted && <th className="text-right py-2 px-1">예측키</th>}
            {showPah && <th className="text-right py-2 px-1">PAH</th>}
            <th className="text-left py-2 pl-2">메모</th>
          </tr>
        </thead>
        <tbody>
          {enrichedRows.map((r) => (
            <tr key={r.key} className="border-b border-gray-50">
              <td className="py-1.5 pr-2 whitespace-nowrap">
                <span className="text-gray-700">{r.date?.slice(0, 10)}</span>
                {r.age && (
                  <span className="block text-[10px] text-gray-400">{r.age}</span>
                )}
              </td>
              <td className="py-1.5 px-1 text-right font-medium">
                {r.height ?? '-'}
              </td>
              <td className="py-1.5 px-1 text-right text-gray-600">
                {r.weight ?? '-'}
              </td>
              {showBoneAge && (
                <td className="py-1.5 px-1 text-right text-gray-600">
                  {r.boneAge ?? '-'}
                </td>
              )}
              {showPercentile && (
                <td className="py-1.5 px-1 text-right text-blue-600 font-medium">
                  {r.percentile != null ? `${r.percentile.toFixed(1)}%` : '-'}
                </td>
              )}
              {showPredicted && (
                <td className="py-1.5 px-1 text-right text-purple-600 font-medium">
                  {r.predicted != null ? `${r.predicted}` : '-'}
                </td>
              )}
              {showPah && (
                <td className="py-1.5 px-1 text-right text-primary font-medium">
                  {r.pah ?? '-'}
                </td>
              )}
              <td className="py-1.5 pl-2 text-gray-500 max-w-[100px] truncate">
                {r.notes || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
