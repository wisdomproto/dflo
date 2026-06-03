// src/features/marketing/components/PublishQueuePage.tsx
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchQueue,
  enrichWithViews,
  setSchedule,
  markPublished,
  deleteQueueItem,
  type PublishChannel,
  type PublishQueueItem,
  type PublishStatus,
} from '../services/marketingPublishService';
import { PublishQueueList } from './PublishQueueList';
import { CHANNELS, STATUS_LABELS } from '../utils/publishConstants';
import { PublishCalendar } from './PublishCalendar';
import { AddToQueueModal } from './AddToQueueModal';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

const STATUS_FILTERS: PublishStatus[] = ['draft', 'scheduled', 'publishing', 'published', 'failed'];
const LANG_FILTERS = ['ko', 'th', 'vi', 'en'];

export function PublishQueuePage() {
  const [items, setItems] = useState<PublishQueueItem[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 필터: null = 전체
  const [channelF, setChannelF] = useState<PublishChannel | null>(null);
  const [statusF, setStatusF] = useState<PublishStatus | null>(null);
  const [langF, setLangF] = useState<string | null>(null);

  const reload = () => {
    fetchQueue()
      .then(enrichWithViews)
      .then(setItems)
      .catch((e) => setErr(e instanceof Error ? e.message : '큐 로드 실패'));
  };
  useEffect(reload, []);

  const filtered = useMemo(
    () =>
      items.filter(
        (it) =>
          (channelF === null || it.channel === channelF) &&
          (statusF === null || it.status === statusF) &&
          (langF === null || it.language === langF),
      ),
    [items, channelF, statusF, langF],
  );

  const guard = async (fn: () => Promise<void>) => {
    setErr(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '작업 실패');
    }
  };

  const handleSetSchedule = (id: string, iso: string | null) => guard(() => setSchedule(id, iso));
  const handleDelete = (id: string) => {
    if (!window.confirm('이 큐 항목을 삭제할까요?')) return;
    guard(() => deleteQueueItem(id));
  };
  const handleMarkPublished = (id: string) => {
    const url = window.prompt('발행된 글의 URL을 입력하세요 (조회수 매칭에 사용됩니다)');
    if (url === null) return; // 취소
    guard(() => markPublished(id, url.trim()));
  };

  // 실제 자동 발행 (게이트) — 키 부재 시 ai-server가 {success:false,error} 반환 → alert.
  const handlePush = async (id: string, channel: PublishChannel) => {
    try {
      const res = await fetch(`${BASE}/api/marketing/publish-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueItemId: id, channel }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        window.alert(body.error || `발행 실패 (${res.status})`);
        return;
      }
      reload();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '발행 요청 실패');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-6 py-3">
        <h1 className="text-base font-bold text-gray-800">발행 큐</h1>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-[#4A2D6B] px-3 py-1.5 text-sm font-semibold text-white"
        >
          + 큐에 추가
        </button>
        <div className="ml-auto flex gap-1 rounded-lg bg-gray-100 p-0.5">
          {(['list', 'calendar'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-xs ${view === v ? 'bg-white font-semibold text-[#4A2D6B] shadow-sm' : 'text-gray-500'}`}
            >
              {v === 'list' ? '리스트' : '캘린더'}
            </button>
          ))}
        </div>
      </div>

      {/* 필터 칩 */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 px-6 py-2 text-xs">
        <span className="text-gray-400">채널</span>
        <FilterChip active={channelF === null} onClick={() => setChannelF(null)}>전체</FilterChip>
        {CHANNELS.map((c) => (
          <FilterChip key={c.id} active={channelF === c.id} onClick={() => setChannelF(c.id)}>
            {c.label}
          </FilterChip>
        ))}
        <span className="ml-3 text-gray-400">상태</span>
        <FilterChip active={statusF === null} onClick={() => setStatusF(null)}>전체</FilterChip>
        {STATUS_FILTERS.map((s) => (
          <FilterChip key={s} active={statusF === s} onClick={() => setStatusF(s)}>
            {STATUS_LABELS[s]}
          </FilterChip>
        ))}
        <span className="ml-3 text-gray-400">언어</span>
        <FilterChip active={langF === null} onClick={() => setLangF(null)}>전체</FilterChip>
        {LANG_FILTERS.map((l) => (
          <FilterChip key={l} active={langF === l} onClick={() => setLangF(l)}>
            {l}
          </FilterChip>
        ))}
        <span className="ml-auto text-gray-400">{filtered.length}개</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {err && <p className="mb-3 text-xs text-red-500">{err}</p>}
        {view === 'list' ? (
          <PublishQueueList
            items={filtered}
            onSetSchedule={handleSetSchedule}
            onMarkPublished={handleMarkPublished}
            onPush={handlePush}
            onDelete={handleDelete}
          />
        ) : (
          <PublishCalendar items={filtered} />
        )}
      </div>

      {showAdd && <AddToQueueModal onClose={() => setShowAdd(false)} onAdded={reload} />}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 ${active ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'}`}
    >
      {children}
    </button>
  );
}
