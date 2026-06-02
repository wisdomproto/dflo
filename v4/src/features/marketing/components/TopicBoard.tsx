// src/features/marketing/components/TopicBoard.tsx
import { useMemo, useState } from 'react';
import topicsRaw from '../data/topics.json';
import type { Topic, TopicStatus } from '../types';

const TOPICS = topicsRaw as Topic[];
const CATS = ['A', 'B', 'C', 'D', 'E'];
const CAT_COLOR: Record<string, string> = {
  A: 'text-teal-600', B: 'text-amber-600', C: 'text-rose-600', D: 'text-purple-600', E: 'text-gray-500',
};
const STATUS_LABEL: Record<TopicStatus, string> = { new: '미발행', done: '발행', similar: '유사' };
const STATUS_COLOR: Record<TopicStatus, string> = {
  new: 'bg-rose-100 text-rose-700', done: 'bg-emerald-100 text-emerald-700', similar: 'bg-gray-100 text-gray-500',
};

export function TopicBoard() {
  const [status, setStatus] = useState<'all' | TopicStatus>('all');

  const shown = useMemo(
    () => (status === 'all' ? TOPICS : TOPICS.filter((t) => t.status === status)),
    [status],
  );

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        {(['all', 'new', 'done', 'similar'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs ${
              status === s ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {s === 'all' ? '전체' : STATUS_LABEL[s]}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{shown.length}개</span>
      </div>

      <div className="space-y-6">
        {CATS.map((cat) => {
          const items = shown.filter((t) => t.category === cat);
          if (!items.length) return null;
          const name = items[0]?.categoryName ?? cat;
          return (
            <div key={cat}>
              <h3 className={`mb-2 text-sm font-bold ${CAT_COLOR[cat] ?? 'text-gray-600'}`}>
                {cat} · {name} ({items.length})
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                {items.map((t) => (
                  <div key={t.id} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800">{t.title}</span>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[t.status]}`}>
                        {STATUS_LABEL[t.status]}
                      </span>
                    </div>
                    {t.angle && <div className="mb-1 text-xs text-gray-500">{t.angle}</div>}
                    <div className="flex flex-wrap gap-1">
                      {t.keywords.map((kw) => (
                        <span key={kw} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {shown.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">결과 없음</p>
        )}
      </div>
    </div>
  );
}
