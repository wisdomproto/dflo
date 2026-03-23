import Card from '@/shared/components/Card';
import { SectionTitle } from './SectionTitle';
import { formatAge } from '@/shared/utils/age';
import type { AgeResult } from '@/shared/utils/age';
import type { Child } from '@/shared/types';

interface Props {
  dailyHeight: string;
  dailyWeight: string;
  onDailyHeightChange: (v: string) => void;
  onDailyWeightChange: (v: string) => void;
  child: Child | null;
  measAge: AgeResult | null;
  measPct: number | null;
  measPred: number | null;
  latestBoneAge: { boneAge: number; pah?: number; measuredDate: string } | null;
  measurementCount: number;
  onShowGrowthModal: () => void;
}

export function HeightWeightCard({
  dailyHeight, dailyWeight, onDailyHeightChange, onDailyWeightChange,
  child, measAge, measPct, measPred, latestBoneAge, measurementCount, onShowGrowthModal,
}: Props) {
  const h = dailyHeight ? parseFloat(dailyHeight) : 0;

  return (
    <Card>
      <SectionTitle icon="📏" text="키·체중 측정"
        right={measurementCount > 0 ? <button onClick={onShowGrowthModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary active:bg-primary/20 transition-colors" title="성장 기록 보기">📊</button> : undefined} />
      {measAge && <p className="text-xs text-gray-400 -mt-1 mb-3">만 {formatAge(measAge)} ({measAge.decimal.toFixed(1)}세)</p>}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-gray-500">키 (cm)<input type="number" inputMode="decimal" step="0.1" placeholder="0.0" value={dailyHeight} onChange={(e) => onDailyHeightChange(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" /></label>
        <label className="text-xs text-gray-500">체중 (kg)<input type="number" inputMode="decimal" step="0.1" placeholder="0.0" value={dailyWeight} onChange={(e) => onDailyWeightChange(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" /></label>
      </div>
      {h > 0 && (measPct !== null || measPred !== null) && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {measPct !== null && <div className="bg-blue-50 rounded-lg px-3 py-2"><p className="text-[10px] text-blue-500">백분위</p><p className="text-sm font-bold text-blue-700">{measPct.toFixed(1)}%</p></div>}
          {measPred !== null && measPred > 0 && <div className="bg-purple-50 rounded-lg px-3 py-2"><p className="text-[10px] text-purple-500">예측 성인키</p><p className="text-sm font-bold text-purple-700">{measPred}cm</p></div>}
        </div>
      )}
      {child?.is_patient && latestBoneAge && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 mb-2">🏥 병원 데이터 ({latestBoneAge.measuredDate})</p>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[10px] text-gray-400">골연령</p><div className="mt-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">{latestBoneAge.boneAge}세</div></div>
            <div><p className="text-[10px] text-gray-400">뼈 예측키 (PAH)</p><div className="mt-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">{latestBoneAge.pah ? `${latestBoneAge.pah}cm` : '-'}</div></div>
          </div>
        </div>
      )}
    </Card>
  );
}
