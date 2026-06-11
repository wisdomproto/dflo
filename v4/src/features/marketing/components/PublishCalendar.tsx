// src/features/marketing/components/PublishCalendar.tsx
import { useMemo, useState } from 'react';
import type { PublishQueueItem } from '../services/marketingPublishService';
import { channelMeta } from '../utils/publishConstants';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 셀 기준 날짜 = published_at ?? scheduled_at ?? created_at.
function cellDateOf(it: PublishQueueItem): Date | null {
  const src = it.publishedAt ?? it.scheduledAt ?? it.createdAt;
  if (!src) return null;
  const d = new Date(src);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function PublishCalendar({ items }: { items: PublishQueueItem[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based

  const byDay = useMemo(() => {
    const map = new Map<string, PublishQueueItem[]>();
    for (const it of items) {
      const d = cellDateOf(it);
      if (!d || d.getFullYear() !== year || d.getMonth() !== month) continue;
      const key = ymd(d);
      const arr = map.get(key);
      if (arr) arr.push(it);
      else map.set(key, [it]);
    }
    return map;
  }, [items, year, month]);

  const firstDay = new Date(year, month, 1).getDay(); // 요일 of 1일
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  };

  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <div>
      <div className="mb-3 flex items-center justify-center gap-4">
        <button type="button" onClick={prevMonth} className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">
          ‹
        </button>
        <div className="text-sm font-semibold text-gray-800">
          {year}년 {month + 1}월
        </div>
        <button type="button" onClick={nextMonth} className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 text-xs">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-gray-50 py-1.5 text-center font-medium text-gray-400">
            {w}
          </div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} className="min-h-[84px] bg-white" />;
          const dayItems = byDay.get(`${year}-${month}-${day}`) ?? [];
          return (
            <div key={day} className="min-h-[84px] bg-white p-1">
              <div
                className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  isToday(day) ? 'bg-[#4A2D6B] text-white' : 'text-gray-500'
                }`}
              >
                {day}
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 4).map((it) => {
                  const meta = channelMeta(it.channel);
                  const num =
                    it.articleKind === 'custom' ? '🎨 '
                      : typeof it.articleSortOrder === 'number' ? `${it.articleSortOrder}. ` : '';
                  return (
                    <div
                      key={it.id}
                      title={`${meta.label} · ${num}${it.articleTitle ?? ''}`}
                      className="truncate rounded px-1 py-0.5 text-[10px] text-white"
                      style={{ backgroundColor: meta.dot }}
                    >
                      {num}{(it.articleTitle ?? '(제목 없음)').slice(0, 15)}
                    </div>
                  );
                })}
                {dayItems.length > 4 && (
                  <div className="px-1 text-[10px] text-gray-400">+{dayItems.length - 4}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
