// ================================================
// CasePredictionBadge - 성장 사례 예측키 뱃지
// 최초 PAH → 최근 PAH + diff 표시
// ================================================

/** 성장 사례 측정 행 타입 */
export interface CaseMeasurementRow {
  date?: string;
  height?: number | string | null;
  weight?: number | string | null;
  age?: number | string;
  bone_age?: number | string;
  pah?: number | string | null;
  notes?: string;
}

/** "12세3개월" → 12.25, 또는 숫자면 그대로 반환 */
export function parseKoreanAge(s?: number | string): number | null {
  if (s == null) return null;
  if (typeof s === 'number') return s;
  const m = s.match(/(\d+)세\s*(\d+)?/);
  if (!m) {
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
  return Number(m[1]) + (m[2] ? Number(m[2]) / 12 : 0);
}

/** 성장 사례 목록 카드: 최초/최근 예측키 뱃지 */
export function CasePredictionBadge({ measurements }: { measurements: CaseMeasurementRow[] }) {
  const withPah = measurements.filter((m) => m.pah != null && m.pah !== '');
  if (withPah.length === 0) return <span className="text-xs text-gray-400">-</span>;

  const firstPah = parseFloat(String(withPah[0].pah));
  const lastPah = parseFloat(String(withPah[withPah.length - 1].pah));
  const diff = lastPah - firstPah;

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px]">
      <span className="text-gray-400">예측키</span>
      <span className="text-gray-400">{firstPah}</span>
      <span className="text-gray-300">→</span>
      <span className="font-bold text-primary">{lastPah}cm</span>
      {withPah.length > 1 && (
        <span className={`font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
        </span>
      )}
    </div>
  );
}
