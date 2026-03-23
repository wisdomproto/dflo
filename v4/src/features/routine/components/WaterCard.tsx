import Card from '@/shared/components/Card';
import { SectionTitle } from './SectionTitle';

interface Props {
  waterIntake: number;
  onWaterIntakeChange: (v: number) => void;
}

export function WaterCard({ waterIntake, onWaterIntakeChange }: Props) {
  return (
    <Card>
      <SectionTitle icon="💧" text="수분 섭취" />
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-primary">{waterIntake}ml</span>
        <div className="flex gap-2 ml-auto">
          {[100, 200, 500].map((n) => (
            <button key={n} onClick={() => onWaterIntakeChange(waterIntake + n)}
              className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 active:bg-blue-100">
              +{n}ml
            </button>
          ))}
        </div>
      </div>
      {waterIntake > 0 && <button onClick={() => onWaterIntakeChange(0)} className="mt-2 text-xs text-gray-400 underline">초기화</button>}
    </Card>
  );
}
