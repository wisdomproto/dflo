// 채널(FB 페이지/IG 계정)에 이미 올라간 게시물 피드 조회 — "기존 게시물 광고(boosting)" 소재 선택용.
// Graph v21.0 읽기 전용. 토큰은 metaConnectionStore 의 페이지 토큰 재사용(클라로 안 나감).
// supabase/metaConnectionStore 는 import-time createClient 가 env 없는 환경(테스트)에서 throw
// 하므로 전부 lazy — 순수 매퍼만 정적 export 해 단위 테스트가 깨끗하게 로드된다.
import { targetIdFor, type Platform } from './metaPublishPrep.js';

const GRAPH = 'https://graph.facebook.com/v21.0';

type Sb = import('@supabase/supabase-js').SupabaseClient;
let _sb: Sb | null = null;
async function sbClient(): Promise<Sb> {
  if (_sb) return _sb;
  const { createClient } = await import('@supabase/supabase-js');
  _sb = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false } },
  );
  return _sb;
}

export type FeedMediaType = 'image' | 'video' | 'carousel' | 'text';
// 광고 소재 선택 축: 피드(이미지/카드뉴스) vs 릴스(동영상). 채널별로 나눠 보여준다.
export type FeedPostKind = 'feed' | 'reels';
export interface FeedPost {
  postId: string;
  caption: string;
  thumbnailUrl: string;
  mediaType: FeedMediaType;
  postKind: FeedPostKind;
  permalink: string;
  createdAt: string;
}

// 프로필/커버 사진 변경 등 자동 생성 스토리 — 광고 소재가 아니라 피드에서 제외.
const FB_STORY_ATTACHMENT_TYPES = new Set(['profile_media', 'cover_photo']);

// ── 순수 매퍼 (테스트 대상) ────────────────────────────────────────
export interface FbPostRaw {
  id?: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  full_picture?: string;
  attachments?: { data?: Array<{ media_type?: string; type?: string }> };
}

export function mapFbPost(raw: FbPostRaw): FeedPost | null {
  if (!raw.id) return null;
  const att = raw.attachments?.data?.[0];
  // 프로필/커버 사진 변경 스토리는 소재로 못 쓰니 제외.
  if (att?.type && FB_STORY_ATTACHMENT_TYPES.has(att.type)) return null;
  const at = att?.media_type ?? '';
  const mediaType: FeedMediaType =
    at === 'album' ? 'carousel'
      : at.includes('video') ? 'video'
        : raw.full_picture ? 'image'
          : 'text';
  return {
    postId: raw.id,
    caption: raw.message ?? '',
    thumbnailUrl: raw.full_picture ?? '',
    mediaType,
    postKind: mediaType === 'video' ? 'reels' : 'feed',
    permalink: raw.permalink_url ?? '',
    createdAt: raw.created_time ?? '',
  };
}

export interface IgMediaRaw {
  id?: string;
  caption?: string;
  media_type?: string; // IMAGE | VIDEO | CAROUSEL_ALBUM
  media_product_type?: string; // FEED | REELS | STORY | AD
  media_url?: string;
  thumbnail_url?: string; // VIDEO 만 반환됨
  permalink?: string;
  timestamp?: string;
  children?: { data?: Array<{ media_url?: string; thumbnail_url?: string }> };
}

export function mapIgMedia(raw: IgMediaRaw): FeedPost | null {
  if (!raw.id) return null;
  // 스토리는 /media 에 거의 안 나오지만(별도 엣지), 혹시 들어오면 제외.
  if (raw.media_product_type === 'STORY') return null;
  const mt = raw.media_type ?? '';
  const mediaType: FeedMediaType = mt === 'VIDEO' ? 'video' : mt === 'CAROUSEL_ALBUM' ? 'carousel' : 'image';
  const child = raw.children?.data?.[0];
  const postKind: FeedPostKind = raw.media_product_type
    ? (raw.media_product_type === 'REELS' ? 'reels' : 'feed')
    : (mediaType === 'video' ? 'reels' : 'feed');
  return {
    postId: raw.id,
    caption: raw.caption ?? '',
    thumbnailUrl: raw.thumbnail_url || raw.media_url || child?.thumbnail_url || child?.media_url || '',
    mediaType,
    postKind,
    permalink: raw.permalink ?? '',
    createdAt: raw.timestamp ?? '',
  };
}

// ── Graph 호출 ────────────────────────────────────────────────────
async function gget<T>(path: string): Promise<T> {
  const res = await fetch(`${GRAPH}/${path}`);
  const json = (await res.json()) as T & { error?: Record<string, unknown> };
  if (json.error) {
    const e = json.error;
    console.error('[meta/feed] GET', path.split('?')[0], '→', JSON.stringify(e));
    throw new Error(String(e['error_user_msg'] || e['message'] || 'Graph 오류'));
  }
  return json;
}

export async function fetchPageFeed(pageId: string, token: string, limit = 25): Promise<FeedPost[]> {
  const fields = 'id,message,created_time,permalink_url,full_picture,attachments{media_type,type}';
  const j = await gget<{ data?: FbPostRaw[] }>(`${pageId}/posts?fields=${fields}&limit=${limit}&access_token=${token}`);
  return (j.data ?? []).map(mapFbPost).filter((p): p is FeedPost => p !== null);
}

export async function fetchIgMediaList(igId: string, token: string, limit = 25): Promise<FeedPost[]> {
  const fields = 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,children{media_url,thumbnail_url}';
  const j = await gget<{ data?: IgMediaRaw[] }>(`${igId}/media?fields=${fields}&limit=${limit}&access_token=${token}`);
  return (j.data ?? []).map(mapIgMedia).filter((p): p is FeedPost => p !== null);
}

// 채널 id → 채널 행 → 페이지 토큰 → 피드. 실패는 한국어 메시지 throw(라우트가 400으로 전달).
export async function fetchChannelFeed(channelId: string, limit = 25): Promise<{ platform: string; posts: FeedPost[] }> {
  const sb = await sbClient();
  const { getBundle, findPageToken } = await import('./metaConnectionStore.js');
  const { data: ch, error } = await sb.from('marketing_channels').select('*').eq('id', channelId).single();
  if (error || !ch) throw new Error('채널을 찾을 수 없습니다.');
  const platform = ch.platform as string;
  if (platform !== 'facebook' && platform !== 'instagram') {
    throw new Error('피드 조회는 Facebook/Instagram 채널만 지원합니다.');
  }
  const targetId = targetIdFor(
    ch as { platform: string; meta_page_id?: string | null; meta_ig_id?: string | null; meta_threads_id?: string | null },
    platform as Platform,
  );
  if (!targetId) throw new Error('채널에 Meta 타겟 id가 없습니다. 연결/매핑 필요.');
  const bundle = await getBundle();
  if (!bundle) throw new Error('Meta 연결이 없습니다.');
  const token = findPageToken(bundle, targetId);
  if (!token) throw new Error('해당 타겟의 토큰을 찾을 수 없습니다(재연결 필요).');
  const posts = platform === 'facebook'
    ? await fetchPageFeed(targetId, token, limit)
    : await fetchIgMediaList(targetId, token, limit);
  return { platform, posts };
}
