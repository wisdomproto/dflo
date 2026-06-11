// src/features/marketing/services/channelFeedService.ts
// 채널에 이미 올라간 게시물 조회 — "기존 게시물 광고(boosting)" 소재 선택용.
// 1순위: ai-server Graph 실피드(수동 업로드 게시물까지 전부) + 발행 큐 매칭으로 콘텐츠 제목 enrich.
// 폴백: ai-server 미가동/Meta 미연결이면 발행 큐(published)만으로 목록 구성.
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import { fetchQueue, type PublishQueueItem } from './marketingPublishService';
import type { MarketingArticle } from '../types';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';
const MARKETING_KEY = import.meta.env.VITE_MARKETING_KEY as string | undefined;

export type FeedMediaType = 'image' | 'video' | 'carousel' | 'text';
export type FeedPostKind = 'feed' | 'reels';

export interface ChannelFeedPost {
  postId: string; // '' = 수동 발행이라 id 없음(URL만 기록된 항목)
  channel: 'facebook' | 'instagram';
  caption: string;
  thumbnailUrl: string;
  mediaType: FeedMediaType;
  postKind: FeedPostKind;
  permalink: string;
  createdAt: string;
  articleId: string | null;
  articleTitle: string;
}

export interface ChannelFeedResult {
  posts: ChannelFeedPost[];
  source: 'graph' | 'queue';
  graphError?: string; // graph 실패 사유(폴백 시 UI 안내용)
}

interface GraphFeedPost {
  postId: string;
  caption: string;
  thumbnailUrl: string;
  mediaType: FeedMediaType;
  postKind: FeedPostKind;
  permalink: string;
  createdAt: string;
}

async function fetchGraphFeed(channelId: string): Promise<GraphFeedPost[]> {
  const headers: Record<string, string> = MARKETING_KEY ? { 'x-marketing-key': MARKETING_KEY } : {};
  const res = await fetch(`${BASE}/api/marketing/meta/feed/${channelId}`, { headers });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `피드 조회 실패: ${res.status}`);
  return (b.posts ?? []) as GraphFeedPost[];
}

// 발행 큐에서 이 채널의 published 항목만 (제목/콘텐츠 매칭 소스).
async function fetchPublishedForChannel(channelId: string): Promise<PublishQueueItem[]> {
  const queue = await fetchQueue();
  return queue.filter((it) => it.channelId === channelId && it.status === 'published');
}

// 폴백 썸네일: 카드뉴스 첫 슬라이드 이미지(언어별) 배치 조회. 실패 시 빈 맵(graceful).
async function firstCardImageByContent(lang: string): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  try {
    const [{ data: cns }, { data: slides }] = await Promise.all([
      supabase.from('marketing_cardnews').select('id, content_id'),
      supabase.from('marketing_cardnews_slides').select('cardnews_id, canvas, sort_order').order('sort_order'),
    ]);
    const firstImgByCard = new Map<string, string>();
    for (const s of (slides ?? []) as Array<{ cardnews_id: string; canvas?: { images?: Record<string, string | null> } }>) {
      if (firstImgByCard.has(s.cardnews_id)) continue;
      const url = s.canvas?.images?.[lang];
      if (url) firstImgByCard.set(s.cardnews_id, url);
    }
    for (const c of (cns ?? []) as Array<{ id: string; content_id: string }>) {
      const url = firstImgByCard.get(c.id);
      if (url) m.set(c.content_id, url);
    }
  } catch (e) {
    logger.warn('[marketing] firstCardImageByContent failed:', e instanceof Error ? e.message : String(e));
  }
  return m;
}

function queueItemToPost(
  it: PublishQueueItem,
  channel: 'facebook' | 'instagram',
  lang: string,
  articleById: Map<string, MarketingArticle>,
  cardImgByContent: Map<string, string>,
): ChannelFeedPost {
  const art = it.articleId ? articleById.get(it.articleId) : undefined;
  const isReels = it.contentKind === 'reels';
  const thumbnailUrl = isReels
    ? (art?.reels?.[lang]?.coverUrl ?? '')
    : (it.articleId ? (cardImgByContent.get(it.articleId) ?? '') : '');
  return {
    postId: it.platformPostId ?? '',
    channel,
    caption: '',
    thumbnailUrl,
    mediaType: isReels ? 'video' : it.contentKind === 'cardnews' ? 'carousel' : 'image',
    postKind: isReels ? 'reels' : 'feed',
    permalink: it.publishedUrl ?? '',
    createdAt: it.publishedAt ?? it.updatedAt,
    articleId: it.articleId,
    articleTitle: it.articleTitle ?? '',
  };
}

// 채널 피드 로드. graph 성공 → 큐 매칭으로 제목 enrich, 실패 → 큐 폴백 + graphError.
export async function fetchChannelFeedPosts(
  channelId: string,
  channelPlatform: 'facebook' | 'instagram',
  lang: string,
  articles: MarketingArticle[],
): Promise<ChannelFeedResult> {
  const articleById = new Map(articles.map((a) => [a.id, a]));
  let published: PublishQueueItem[] = [];
  try {
    published = await fetchPublishedForChannel(channelId);
  } catch (e) {
    logger.warn('[marketing] fetchPublishedForChannel failed:', e instanceof Error ? e.message : String(e));
  }

  try {
    const graphPosts = await fetchGraphFeed(channelId);
    const byPostId = new Map(published.filter((it) => it.platformPostId).map((it) => [it.platformPostId as string, it]));
    const posts: ChannelFeedPost[] = graphPosts.map((p) => {
      const q = byPostId.get(p.postId);
      const art = q?.articleId ? articleById.get(q.articleId) : undefined;
      return {
        ...p,
        channel: channelPlatform,
        articleId: q?.articleId ?? null,
        articleTitle: q?.articleTitle ?? art?.title ?? '',
      };
    });
    return { posts, source: 'graph' };
  } catch (e) {
    const graphError = e instanceof Error ? e.message : String(e);
    logger.warn('[marketing] graph feed failed, falling back to queue:', graphError);
    const cardImgByContent = published.some((it) => it.contentKind === 'cardnews')
      ? await firstCardImageByContent(lang)
      : new Map<string, string>();
    const posts = published
      .map((it) => queueItemToPost(it, channelPlatform, lang, articleById, cardImgByContent))
      .filter((p) => p.postId || p.permalink); // 보스팅 지정이 불가능한(식별자 전무) 항목 제외
    return { posts, source: 'queue', graphError };
  }
}
