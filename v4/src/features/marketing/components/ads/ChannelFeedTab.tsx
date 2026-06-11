// src/features/marketing/components/ads/ChannelFeedTab.tsx
// 기존 게시물(boosting) 소재 선택 — 채널(FB/IG)에 이미 올라간 피드에서 고른다.
// Graph 실피드 우선, 실패 시 발행 큐(published) 폴백(상단 안내 노출).
import { useEffect, useMemo, useState } from 'react';
import { fetchChannels, type MarketingChannel } from '../../services/marketingChannelService';
import { fetchChannelFeedPosts, type ChannelFeedPost } from '../../services/channelFeedService';
import type { MarketingArticle } from '../../types';
import type { CreativeKind } from '../../services/adWorkspaceService';
import type { PickedCreative } from './CreativePicker';

const PLATFORM_BADGE: Record<string, { label: string; cls: string }> = {
  facebook: { label: 'FB', cls: 'bg-[#1877f2] text-white' },
  instagram: { label: 'IG', cls: 'bg-[#e1306c] text-white' },
};

function kindOf(p: ChannelFeedPost): CreativeKind {
  if (p.mediaType === 'video') return 'reels';
  if (p.mediaType === 'carousel') return 'cardnews';
  if (p.mediaType === 'image') return 'image';
  return 'custom';
}

export function ChannelFeedTab({
  market,
  articles,
  onPick,
}: {
  market: string;
  articles: MarketingArticle[];
  onPick: (c: PickedCreative) => void;
}) {
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [chId, setChId] = useState<string>('');
  const [posts, setPosts] = useState<ChannelFeedPost[]>([]);
  const [kind, setKind] = useState<'feed' | 'reels'>('feed');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const feedChannels = useMemo(
    () => channels.filter((c) => c.isActive && c.locale === market && (c.platform === 'facebook' || c.platform === 'instagram')),
    [channels, market],
  );
  const channel = feedChannels.find((c) => c.id === chId) ?? null;

  const feedCount = useMemo(() => posts.filter((p) => p.postKind === 'feed').length, [posts]);
  const reelsCount = useMemo(() => posts.filter((p) => p.postKind === 'reels').length, [posts]);
  const visiblePosts = useMemo(() => posts.filter((p) => p.postKind === kind), [posts, kind]);

  useEffect(() => {
    fetchChannels().then(setChannels);
  }, []);

  useEffect(() => {
    if (!chId && feedChannels.length > 0) setChId(feedChannels[0].id);
  }, [feedChannels, chId]);

  useEffect(() => {
    if (!channel) return;
    setLoading(true);
    setNotice('');
    setPosts([]);
    fetchChannelFeedPosts(channel.id, channel.platform as 'facebook' | 'instagram', market, articles)
      .then((r) => {
        setPosts(r.posts);
        if (r.source === 'queue') setNotice(`실피드 조회 실패 — 발행 큐 기준으로 표시합니다. (${r.graphError ?? ''})`);
      })
      .finally(() => setLoading(false));
    // articles 는 마운트 시점 스냅샷이면 충분 (제목 enrich 용)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel?.id]);

  const pick = (p: ChannelFeedPost) => {
    onPick({
      kind: kindOf(p),
      articleId: p.articleId,
      lang: market,
      thumbnailUrl: p.thumbnailUrl,
      mediaUrl: p.permalink,
      name: p.articleTitle || (p.caption ? p.caption.slice(0, 40) : '기존 게시물'),
      caption: p.caption,
      sourcePostId: p.postId,
      sourceChannel: p.channel,
      sourceUrl: p.permalink,
    });
  };

  if (feedChannels.length === 0) {
    return (
      <p className="grid h-[60%] place-items-center px-8 text-center text-sm text-gray-400">
        이 시장({market.toUpperCase()})에 연결된 Facebook/Instagram 채널이 없습니다.
        <br />채널 설정에서 채널을 등록하세요.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* 채널 칩 */}
      <div className="flex flex-wrap gap-1.5">
        {feedChannels.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChId(c.id)}
            className={`rounded-full border px-3 py-1 text-xs ${
              c.id === chId ? 'border-[#4A2D6B] bg-[#4A2D6B]/10 font-semibold text-[#4A2D6B]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {PLATFORM_BADGE[c.platform]?.label ?? c.platform} · {c.name}
          </button>
        ))}
      </div>

      {/* 피드 / 릴스 서브탭 */}
      <div className="flex gap-1.5">
        {([
          { key: 'feed', label: '피드', count: feedCount },
          { key: 'reels', label: '릴스', count: reelsCount },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setKind(t.key)}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              kind === t.key ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {t.label === '피드' ? '🖼' : '🎬'} {t.label} {t.count > 0 && <span className="opacity-70">{t.count}</span>}
          </button>
        ))}
      </div>

      {notice && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">{notice}</p>}
      {loading && <p className="py-10 text-center text-sm text-gray-400">피드 불러오는 중…</p>}
      {!loading && visiblePosts.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-400">
          이 채널에 {kind === 'feed' ? '피드' : '릴스'} 게시물이 없습니다.
        </p>
      )}

      {/* 게시물 그리드 */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {visiblePosts.map((p, i) => {
          const badge = PLATFORM_BADGE[p.channel];
          return (
            // div+onClick: 내부에 보기↗ <a> 가 있어 button 중첩(invalid HTML)을 피한다.
            <div
              key={p.postId || p.permalink || i}
              onClick={() => pick(p)}
              className="group cursor-pointer overflow-hidden rounded-lg border-2 border-transparent text-left hover:border-[#4A2D6B]"
            >
              <div className="relative aspect-square bg-gray-100">
                {p.thumbnailUrl ? (
                  <img src={p.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-2xl text-gray-300">{p.mediaType === 'video' ? '🎬' : '🖼'}</div>
                )}
                {badge && <span className={`absolute left-1 top-1 rounded px-1 py-0.5 text-[9px] font-bold ${badge.cls}`}>{badge.label}</span>}
                <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] text-white opacity-0 group-hover:opacity-100">
                  이 게시물 선택
                </span>
              </div>
              <div className="px-1.5 py-1">
                <div className="truncate text-[11px] text-gray-700">{p.articleTitle || p.caption || '(캡션 없음)'}</div>
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>{p.createdAt ? p.createdAt.slice(0, 10) : ''}</span>
                  {p.permalink && (
                    <a
                      href={p.permalink}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#4A2D6B] hover:underline"
                    >
                      보기↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
