import Card from '@/shared/components/Card';
import { SectionTitle } from './SectionTitle';

interface Props {
  growthInjection: boolean;
  onGrowthInjectionChange: (v: boolean) => void;
}

export function InjectionCard({ growthInjection, onGrowthInjectionChange }: Props) {
  return (
    <Card>
      <SectionTitle icon="💉" text="성장 주사" />
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">오늘 주사 투여</span>
        <button
          onClick={() => onGrowthInjectionChange(!growthInjection)}
          className={`relative ml-auto h-7 w-12 rounded-full transition-colors ${
            growthInjection ? 'bg-primary' : 'bg-gray-200'
          }`}
          aria-label="성장 주사 투여 토글"
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              growthInjection ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </Card>
  );
}
