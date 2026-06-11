// src/features/marketing/components/PublishQueueBoard.tsx
// 발행 큐를 채널(페북/인스타/스레드/자체사이트)별 컬럼으로 나눈 보드.
// 각 컬럼은 독립 스크롤 박스 + 컬럼별 상태 필터. 정렬(최신순/이름순)은 상위에서 주입.
import { useState } from 'react';
import type { PublishChannel, PublishQueueItem, PublishStatus } from '../services/marketingPublishService';
import { CHANNELS, STATUS_LABELS } from '../utils/publishConstants';
import { PublishQueueCard } from './PublishQueueCard';

export type QueueSort = 'recent' | 'name';

const STATUS_FILTERS: PublishStatus[] = ['draft', 'scheduled', 'publishing', 'published', 'failed'];

interface Props {
  items: PublishQueueItem[];
  sort: QueueSort;
  pushingId?: string | null;
  onSetSchedule: (id: string, iso: string | null) => void;
  onMarkPublished: (id: string) => void;
  onPush: (id: string, channel: PublishChannel) => void;
  onDelete: (id: string) => void;
}

function sortItems(items: PublishQueueItem[], sort: QueueSort): PublishQueueItem[] {
  const arr = [...items];
  if (sort === 'name') {
    arr.sort((a, b) => (a.articleTitle || '').localeCompare(b.articleTitle || '', 'ko'));
  } else {
    arr.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }
  return arr;
}

export function PublishQueueBoard({ items, sort, ...handlers }: Props) {
  // 컬럼: 블로그(자체 사이트) → 인스타 → 페북. 항상 3열 고정.
  const columns = CHANNELS;

  // 컬럼별 상태 필터 (null = 전체)
  const [statusByCol, setStatusByCol] = useState<Partial<Record<PublishChannel, PublishStatus | null>>>({});

  return (
    <div className="flex h-full gap-3">
      {columns.map((col) => {
        const colStatus = statusByCol[col.id] ?? null;
        const colItems = sortItems(
          items.filter((it) => it.channel === col.id && (colStatus === null || it.status === colStatus)),
          sort,
        );
        return (
          <div key={col.id} className="flex min-w-0 flex-1 flex-col rounded-xl border border-gray-200 bg-gray-50/50">
            {/* 컬럼 헤더 (sticky) — 채널 배지 + 개수 + 컬럼별 상태 필터 */}
            <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-3 py-2">
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${col.badge}`}>{col.label}</span>
              <span className="text-xs text-gray-400">{colItems.length}</span>
              <select
                value={colStatus ?? ''}
                onChange={(e) =>
                  setStatusByCol((prev) => ({
                    ...prev,
                    [col.id]: e.target.value ? (e.target.value as PublishStatus) : null,
                  }))
                }
                className="ml-auto rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600"
              >
                <option value="">전체</option>
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            {/* 스크롤 영역 */}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
              {colItems.length === 0 ? (
                <p className="py-10 text-center text-xs text-gray-300">없음</p>
              ) : (
                colItems.map((it) => <PublishQueueCard key={it.id} item={it} {...handlers} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
