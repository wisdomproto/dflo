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
} from '../services/marketingPublishService';
import { runPublish, deleteChannelPost } from '../services/metaConnectionService';
import { fetchChannels, localeFlag, type MarketingChannel } from '../services/marketingChannelService';
import { PublishQueueBoard, type QueueSort } from './PublishQueueBoard';
import { PublishCalendar } from './PublishCalendar';
import { AddToQueueModal } from './AddToQueueModal';

const PLATFORM_LABEL: Record<string, string> = {
  facebook: 'Facebook', instagram: 'Instagram', threads: 'Threads', website: '웹사이트',
};

const LANG_FILTERS = ['ko', 'th', 'vi', 'en'];

export function PublishQueuePage() {
  const [items, setItems] = useState<PublishQueueItem[]>([]);
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<PublishQueueItem | null>(null);

  // 성공 메시지는 4초 후 자동 사라짐.
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  // 언어 필터(상단, null=전체). 채널·상태는 보드 컬럼에서 분리/필터.
  const [langF, setLangF] = useState<string | null>(null);
  const [sort, setSort] = useState<QueueSort>('recent');

  const reload = () => {
    fetchQueue()
      .then(enrichWithViews)
      .then(setItems)
      .catch((e) => setErr(e instanceof Error ? e.message : '큐 로드 실패'));
  };
  useEffect(reload, []);
  useEffect(() => {
    fetchChannels().then((cs) => setChannels(cs.filter((c) => c.isActive))).catch(() => setChannels([]));
  }, []);

  const filtered = useMemo(
    () => items.filter((it) => langF === null || it.language === langF),
    [items, langF],
  );

  const guard = async (fn: () => Promise<void>, successMsg?: string) => {
    setErr(null);
    setMsg(null);
    try {
      await fn();
      reload();
      if (successMsg) setMsg(successMsg);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '작업 실패');
    }
  };

  const handleSetSchedule = (id: string, iso: string | null) => guard(() => setSchedule(id, iso));
  const handleDelete = (id: string) => {
    const it = items.find((x) => x.id === id);
    // 발행된 채널 게시물이 살아있으면 전용 다이얼로그(채널별 동작 안내). 아니면 단순 확인.
    const hasLivePost =
      !!it && it.status === 'published' && it.channel !== 'website' && (!!it.platformPostId || !!it.publishedUrl);
    if (hasLivePost) {
      setDelTarget(it!);
      return;
    }
    if (!window.confirm('이 큐 항목을 삭제할까요?')) return;
    guard(() => deleteQueueItem(id));
  };

  // 다이얼로그 액션: 'record'=목록만 / 'channel'=채널 게시물까지(페이스북만)
  const confirmDelete = (mode: 'record' | 'channel') => {
    const it = delTarget;
    setDelTarget(null);
    if (!it) return;
    guard(async () => {
      if (mode === 'channel') await deleteChannelPost(it.id);
      await deleteQueueItem(it.id);
    });
  };
  const handleMarkPublished = (id: string) => {
    const url = window.prompt('발행된 글의 URL을 입력하세요 (조회수 매칭에 사용됩니다)');
    if (url === null) return; // 취소
    guard(() => markPublished(id, url.trim()), '✅ 발행됨으로 표시했습니다.');
  };

  // 즉시 발행 — 모든 채널을 executor(/publish/run) 경유. 진행 중 표시 + 성공/실패 배너.
  const handlePush = async (id: string, _channel: PublishChannel) => {
    const it = items.find((x) => x.id === id);
    // 같은 글·채널·언어가 이미 published 면 중복 게시 경고(다른 큐 행으로 또 올리는 실수 방지).
    const alreadyPublished =
      !!it &&
      items.some(
        (x) =>
          x.id !== id &&
          x.status === 'published' &&
          x.articleId === it.articleId &&
          x.channel === it.channel &&
          x.language === it.language,
      );
    if (
      alreadyPublished &&
      !window.confirm('이미 같은 채널에 발행된 콘텐츠입니다.\n다시 발행하면 중복 게시됩니다. 정말 또 발행할까요?')
    ) {
      return;
    }
    setErr(null);
    setMsg(null);
    setPushingId(id);
    try {
      await runPublish(id);
      reload();
      setMsg('✅ 발행 완료! 채널에 게시되었습니다.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '발행 요청 실패');
    } finally {
      setPushingId(null);
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

      {/* 언어 — 맨 위 (콘텐츠 스튜디오와 동일 패턴) */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50/60 px-6 py-2">
        <span className="mr-1 text-xs text-gray-400">언어</span>
        <div className="flex overflow-hidden rounded-md border border-gray-200 bg-white">
          <LangPill active={langF === null} onClick={() => setLangF(null)}>전체</LangPill>
          {LANG_FILTERS.map((l) => (
            <LangPill key={l} active={langF === l} onClick={() => setLangF(l)}>
              {localeFlag(l)} {l}
            </LangPill>
          ))}
        </div>
      </div>

      {/* 연결된 채널 — 실제 페이지로 바로가기 */}
      {channels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 bg-gray-50/60 px-6 py-2 text-xs">
          <span className="text-gray-400">연결된 채널</span>
          {channels.map((c) => {
            const content = (
              <>
                <span>{localeFlag(c.locale)}</span>
                <span className="font-medium">{PLATFORM_LABEL[c.platform] ?? c.platform}</span>
                <span className="text-gray-500">{c.name}</span>
                {c.url && <span className="opacity-60">↗</span>}
              </>
            );
            const cls = 'flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1';
            return c.url ? (
              <a key={c.id} href={c.url} target="_blank" rel="noreferrer"
                className={`${cls} text-gray-700 transition-colors hover:border-[#4A2D6B] hover:text-[#4A2D6B]`}
                title={c.url}>
                {content}
              </a>
            ) : (
              <span key={c.id} className={`${cls} text-gray-400`} title="링크 미설정">{content}</span>
            );
          })}
        </div>
      )}

      {/* 정렬 — 채널·상태는 보드 컬럼에서 처리 */}
      {view === 'list' && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 px-6 py-2 text-xs">
          <span className="text-gray-400">정렬</span>
          <FilterChip active={sort === 'recent'} onClick={() => setSort('recent')}>최신순</FilterChip>
          <FilterChip active={sort === 'name'} onClick={() => setSort('name')}>이름순</FilterChip>
          <span className="ml-auto text-gray-400">{filtered.length}개</span>
        </div>
      )}

      <div className={`min-h-0 flex-1 p-6 ${view === 'list' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {err && <p className="mb-3 text-xs text-red-500">{err}</p>}
        {msg && (
          <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{msg}</p>
        )}
        {view === 'list' ? (
          <PublishQueueBoard
            items={filtered}
            sort={sort}
            pushingId={pushingId}
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
      {delTarget && (
        <DeleteQueueDialog item={delTarget} onCancel={() => setDelTarget(null)} onConfirm={confirmDelete} />
      )}
    </div>
  );
}

// 발행된 채널 게시물이 있는 큐 항목 삭제 다이얼로그. 채널별 동작을 명시:
//  - 페이스북: '채널 게시물까지 삭제' 가능
//  - 인스타/스레드: API 자동 삭제 불가 → '게시물 열기 ↗'로 직접 삭제 안내(목록에서만 제거)
function DeleteQueueDialog({
  item,
  onCancel,
  onConfirm,
}: {
  item: PublishQueueItem;
  onCancel: () => void;
  onConfirm: (mode: 'record' | 'channel') => void;
}) {
  const isFb = item.channel === 'facebook' && !!item.platformPostId;
  const platformLabel = PLATFORM_LABEL[item.channel] ?? item.channel;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-gray-800">발행 큐 항목 삭제</h2>
        <p className="text-sm text-gray-600">
          이 항목은 <span className="font-semibold">{platformLabel}</span>에 이미 발행되어 있습니다.
        </p>
        {isFb ? (
          <p className="text-xs text-gray-500">채널 게시물까지 지울지, 목록에서만 지울지 선택하세요.</p>
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {platformLabel}은 API로 자동 삭제가 안 됩니다. 게시물은 직접 지워주세요.
            {item.publishedUrl && (
              <>
                {' '}
                <a href={item.publishedUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                  게시물 열기 ↗
                </a>
              </>
            )}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {isFb && (
            <button
              type="button"
              onClick={() => onConfirm('channel')}
              className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
            >
              채널 게시물까지 삭제
            </button>
          )}
          <button
            type="button"
            onClick={() => onConfirm('record')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
          >
            목록에서만 삭제
          </button>
          <button type="button" onClick={onCancel} className="w-full rounded-lg px-3 py-2 text-sm text-gray-400">
            취소
          </button>
        </div>
      </div>
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

function LangPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs transition-colors ${active ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
      style={active ? { backgroundColor: '#4A2D6B' } : undefined}
    >
      {children}
    </button>
  );
}
