import Card from '@/shared/components/Card';
import { SectionTitle } from './SectionTitle';
import type { SleepQuality } from '@/shared/types';

const SLEEP_OPTS: { value: SleepQuality; label: string }[] = [
  { value: 'good', label: '깊게 잘잤다' },
  { value: 'bad', label: '종종 깨거나 설친다' },
];

interface Props {
  sleepTime: string;
  wakeTime: string;
  sleepQuality: SleepQuality | '';
  onSleepTimeChange: (v: string) => void;
  onWakeTimeChange: (v: string) => void;
  onSleepQualityChange: (v: SleepQuality) => void;
}

export function SleepCard({ sleepTime, wakeTime, sleepQuality, onSleepTimeChange, onWakeTimeChange, onSleepQualityChange }: Props) {
  return (
    <Card>
      <SectionTitle icon="🌙" text="수면" />
      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="text-xs text-gray-500">취침 시간<input type="time" value={sleepTime} onChange={(e) => onSleepTimeChange(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></label>
        <label className="text-xs text-gray-500">기상 시간<input type="time" value={wakeTime} onChange={(e) => onWakeTimeChange(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></label>
      </div>
      <div className="flex gap-2">
        {SLEEP_OPTS.map((o) => (
          <button key={o.value} onClick={() => onSleepQualityChange(o.value)}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${sleepQuality === o.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
