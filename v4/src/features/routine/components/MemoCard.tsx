import Card from '@/shared/components/Card';
import { SectionTitle } from './SectionTitle';
import type { Mood } from '@/shared/types';

const MOOD_OPTS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'happy', emoji: '😊', label: '좋음' },
  { value: 'normal', emoji: '😐', label: '보통' },
  { value: 'sad', emoji: '😢', label: '슬픔' },
  { value: 'tired', emoji: '😴', label: '피곤' },
  { value: 'sick', emoji: '🤒', label: '아픔' },
];

interface Props {
  mood: Mood | '';
  dailyNotes: string;
  onMoodChange: (v: Mood) => void;
  onDailyNotesChange: (v: string) => void;
}

export function MemoCard({ mood, dailyNotes, onMoodChange, onDailyNotesChange }: Props) {
  return (
    <Card>
      <SectionTitle icon="📝" text="메모" />
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
        {MOOD_OPTS.map((o) => (
          <button key={o.value} onClick={() => onMoodChange(o.value)}
            className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors flex-shrink-0 ${
              mood === o.value ? 'bg-primary/10 ring-1 ring-primary' : 'bg-gray-50'
            }`}>
            <span className="text-lg">{o.emoji}</span>
            <span className={mood === o.value ? 'text-primary font-medium' : 'text-gray-500'}>{o.label}</span>
          </button>
        ))}
      </div>
      <textarea value={dailyNotes} onChange={(e) => onDailyNotesChange(e.target.value)}
        placeholder="오늘 아이의 컨디션이나 특이사항을 기록해주세요" rows={3}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
    </Card>
  );
}
