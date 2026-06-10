// src/features/marketing/components/PublishQueueList.tsx
import type { PublishChannel, PublishQueueItem, ContentKind } from '../services/marketingPublishService';
import { localeFlag } from '../services/marketingChannelService';

import { STATUS_LABELS, STATUS_COLORS, channelMeta } from '../utils/publishConstants';

// 콘텐츠 종류 배지 — 발행 큐에서 블로그/카드뉴스/릴스 구분.
const KIND_META: Record<ContentKind, { label: string; cls: string }> = {
  blog: { label: '📝 블로그', cls: 'bg-sky-100 text-sky-700' },
  cardnews: { label: '🖼 카드뉴스', cls: 'bg-violet-100 text-violet-700' },
  reels: { label: '🎬 릴스', cls: 'bg-rose-100 text-rose-700' },
  post: { label: '📄 기본글', cls: 'bg-gray-100 text-gray-600' },
};

// 채널×언어별 추천 발행 시간 힌트(요일/시각). 마케팅 best-practice 휴리스틱.
const BEST_POST_TIMES: Record<string, Partial<Record<PublishChannel, string>>> = {
  ko: {
    instagram: '평일 19~21시 / 일 11시',
    facebook: '평일 12~13시',
    threads: '평일 20~22시',
  },
  th: {
    instagram: '19~21시 (ICT)',
    facebook: '12~13시 (ICT)',
  },
};

function bestTimeHint(lang: string, ch: PublishChannel): string | null {
  return BEST_POST_TIMES[lang]?.[ch] ?? BEST_POST_TIMES.ko[ch] ?? null;
}

// ── datetime-local ↔ ISO 변환 (timezone offset 보정) ─────────────────────────
// datetime-local 은 로컬 wall-clock("2026-06-10T19:00"). 저장은 UTC ISO.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  // value 는 "YYYY-MM-DDTHH:mm" (로컬). new Date(value) 가 로컬로 파싱 → toISOString 으로 UTC.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// 빠른 예약 칩: 오늘/내일/모레 특정 시각 → ISO.
function makeTime(dayOffset: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const QUICK_SLOTS: Array<{ label: string; iso: () => string }> = [
  { label: '오늘 19시', iso: () => makeTime(0, 19) },
  { label: '내일 8시', iso: () => makeTime(1, 8) },
  { label: '내일 19시', iso: () => makeTime(1, 19) },
  { label: '모레 9시', iso: () => makeTime(2, 9) },
];

interface Props {
  items: PublishQueueItem[];
  onSetSchedule: (id: string, iso: string | null) => void;
  onMarkPublished: (id: string) => void;
  onPush: (id: string, channel: PublishChannel) => void;
  onDelete: (id: string) => void;
}

export function PublishQueueList({ items, onSetSchedule, onMarkPublished, onPush, onDelete }: Props) {
  if (items.length === 0) {
    return <p className="py-12 text-center text-sm text-gray-400">큐에 항목이 없습니다. 상단 “+ 큐에 추가”로 글을 올려보세요.</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const meta = channelMeta(it.channel);
        const hint = bestTimeHint(it.language, it.channel);
        return (
          <div key={it.id} className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-[#4A2D6B]/10 px-1.5 py-0.5 text-xs font-semibold text-[#4A2D6B]">
                {localeFlag(it.language)} {it.language}
              </span>
              <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${KIND_META[it.contentKind ?? 'post'].cls}`}>
                {KIND_META[it.contentKind ?? 'post'].label}
              </span>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${meta.badge}`}>{meta.label}</span>
              {it.channelName && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{it.channelName}</span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
                {it.articleTitle || '(제목 없음)'}
              </span>
              {it.articleCategory && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{it.articleCategory}</span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[it.status]}`}>
                {STATUS_LABELS[it.status]}
              </span>
            </div>

            {/* 예약 영역: published 가 아니면 항상 예약 가능 */}
            {it.status !== 'published' && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <input
                  type="datetime-local"
                  value={isoToLocalInput(it.scheduledAt)}
                  onChange={(e) => onSetSchedule(it.id, localInputToIso(e.target.value))}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-[#4A2D6B] focus:outline-none"
                />
                {QUICK_SLOTS.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => onSetSchedule(it.id, q.iso())}
                    className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200"
                  >
                    {q.label}
                  </button>
                ))}
                {it.scheduledAt && (
                  <button
                    type="button"
                    onClick={() => onSetSchedule(it.id, null)}
                    className="rounded-full px-2 py-1 text-xs text-gray-400 hover:text-red-500"
                  >
                    예약 해제
                  </button>
                )}
                {hint && <span className="text-xs text-gray-400">💡 추천: {hint}</span>}
              </div>
            )}

            {/* published 행: 조회수 + 보기 링크 */}
            {it.status === 'published' && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                {typeof it.viewCount === 'number' && (
                  <span className="font-semibold text-emerald-700">조회 {it.viewCount.toLocaleString()}</span>
                )}
                {it.publishedUrl && (
                  <a
                    href={it.publishedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#4A2D6B] underline hover:opacity-80"
                  >
                    보기 ↗
                  </a>
                )}
                {it.publishedAt && <span className="text-gray-400">{it.publishedAt.slice(0, 10)}</span>}
              </div>
            )}

            {/* 액션 행 — 발행된 항목은 재발행/발행표시 숨김(중복 게시 방지), 삭제만 */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {it.status !== 'published' && (
                <>
                  <button
                    type="button"
                    onClick={() => onPush(it.id, it.channel)}
                    className="rounded-lg border border-[#4A2D6B] px-2.5 py-1 text-xs text-[#4A2D6B] hover:bg-[#4A2D6B] hover:text-white"
                  >
                    즉시 발행
                  </button>
                  <button
                    type="button"
                    onClick={() => onMarkPublished(it.id)}
                    className="rounded-lg bg-[#4A2D6B] px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    발행됨 표시
                  </button>
                </>
              )}
              <button
                type="button"
                aria-label="삭제"
                onClick={() => onDelete(it.id)}
                className="ml-auto px-2 text-gray-300 hover:text-red-500"
              >
                🗑
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
