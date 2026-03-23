import Card from '@/shared/components/Card';
import { SectionTitle } from './SectionTitle';

interface Props {
  growthInjection: boolean;
  injectionTime: string;
  onGrowthInjectionChange: (v: boolean) => void;
  onInjectionTimeChange: (v: string) => void;
}

export function InjectionCard({ growthInjection, injectionTime, onGrowthInjectionChange, onInjectionTimeChange }: Props) {
  return (
    <Card>
      <SectionTitle icon="💉" text="호르몬 주사" />
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">오늘 주사 투여</span>
        <button onClick={() => onGrowthInjectionChange(!growthInjection)}
          className={`relative ml-auto h-7 w-12 rounded-full transition-colors ${growthInjection ? 'bg-primary' : 'bg-gray-200'}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${growthInjection ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      {growthInjection && (
        <label className="block mt-3 text-xs text-gray-500">
          투여 시간
          <input type="time" value={injectionTime} onChange={(e) => onInjectionTimeChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </label>
      )}
    </Card>
  );
}
