import Card from '@/shared/components/Card';
import { SectionTitle } from './SectionTitle';

interface Props {
  waterIntake: number;
  onWaterIntakeChange: (v: number) => void;
}

const GOOD_THRESHOLD = 1000; // ml — 이 이상 마시면 "잘 마셨어요" 배지

export function WaterCard({ waterIntake, onWaterIntakeChange }: Props) {
  const isGood = waterIntake >= GOOD_THRESHOLD;
  return (
    <Card>
      <SectionTitle icon="💧" text="수분 섭취" />
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-lg font-bold text-primary">{waterIntake}ml</span>
        {isGood && (
          <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
            👍 잘 마셨어요 (1L+)
          </span>
        )}
        <div className="flex gap-2 ml-auto">
          {[100, 200, 500].map((n) => (
            <button key={n} onClick={() => onWaterIntakeChange(waterIntake + n)}
              className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 active:bg-blue-100">
              +{n}ml
            </button>
          ))}
        </div>
      </div>
      {/* 진척도 바 (1L 기준) */}
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${isGood ? 'bg-green-500' : 'bg-blue-400'}`}
          style={{ width: `${Math.min(100, (waterIntake / GOOD_THRESHOLD) * 100)}%` }}
        />
      </div>
      {waterIntake > 0 && <button onClick={() => onWaterIntakeChange(0)} className="mt-2 text-xs text-gray-400 underline">초기화</button>}
    </Card>
  );
}
