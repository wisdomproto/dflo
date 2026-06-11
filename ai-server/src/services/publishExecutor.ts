// 발행 큐 1건을 실제 발행하는 공용 실행기. 수동(/publish/run)·자동(scheduler) 공용.
// deploy hook은 호출하지 않음(호출자가 배치 단위로 트리거).
import { createClient } from '@supabase/supabase-js';
import { validatePublish, targetIdFor, htmlToText, type Platform } from './metaPublishPrep.js';
import {
  publishFacebook, publishInstagram, publishThreads,
  publishFacebookReel, publishInstagramReel, publishThreadsVideo,
  fetchPermalink, deletePost,
} from './metaPublish.js';
import { getBundle, findPageToken } from './metaConnectionStore.js';

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } },
);

export interface ExecResult {
  ok: boolean;
  kind: 'meta' | 'website';
  postId?: string;
  error?: string;
}

async function fail(queueId: string, kind: 'meta' | 'website', error: string): Promise<ExecResult> {
  await sb.from('marketing_publish_queue').update({
    status: 'failed', error_message: error, updated_at: new Date().toISOString(),
  }).eq('id', queueId);
  return { ok: false, kind, error };
}

export async function publishQueueItem(queueId: string): Promise<ExecResult> {
  const { data: q } = await sb.from('marketing_publish_queue').select('*').eq('id', queueId).single();
  if (!q) return { ok: false, kind: 'meta', error: '큐 항목 없음' };
  const channel = q.channel as string;

  // ── website (자체 사이트 블로그): blog_published draft → published ──
  if (channel === 'website') {
    const lang = (q.language as string) || 'ko';
    const { data: rows, error } = await sb.from('blog_published')
      .update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('article_id', q.article_id).eq('language', lang).eq('status', 'draft').select('id');
    if (error) return fail(queueId, 'website', error.message);
    if (!rows || rows.length === 0) {
      const { data: existing } = await sb.from('blog_published').select('id').eq('article_id', q.article_id).eq('language', lang).limit(1);
      if (!existing || existing.length === 0) return fail(queueId, 'website', '블로그 발행본이 없습니다.');
    }
    await sb.from('marketing_publish_queue').update({
      status: 'published', published_at: new Date().toISOString(), error_message: null, updated_at: new Date().toISOString(),
    }).eq('id', queueId);
    return { ok: true, kind: 'website' };
  }

  // ── meta (ig/fb/threads) ──
  const platform = channel as Platform;
  if (!['facebook', 'instagram', 'threads'].includes(platform)) return fail(queueId, 'meta', 'Meta 채널이 아닙니다');
  const { data: ch } = await sb.from('marketing_channels').select('*').eq('id', q.channel_id).single();
  if (!ch) return fail(queueId, 'meta', '채널 없음');

  const lang = (q.language as string) || 'ko';
  let caption = '';
  let imageUrls: string[] = [];
  let videoUrl: string | null = null;
  let coverUrl: string | null = null;

  if (q.content_kind === 'cardnews') {
    const cn = await loadCardnews(q.article_id as string, lang);
    caption = cn.caption;
    imageUrls = cn.imageUrls;
  } else if (q.content_kind === 'reels') {
    // 릴스: 영상 = marketing_articles.reels[lang].videoUrl.
    // 캡션 = reels[lang].caption 우선(커스텀 콘텐츠 — 카드뉴스 없음), 없으면 카드뉴스 공용(정규).
    const { data: art } = await sb.from('marketing_articles').select('reels').eq('id', q.article_id).single();
    const reel = (art as { reels?: Record<string, { videoUrl?: string | null; coverUrl?: string | null; caption?: string; hashtags?: string }> } | null)?.reels?.[lang];
    videoUrl = reel?.videoUrl ?? null;
    coverUrl = reel?.coverUrl ?? null;
    if (!videoUrl) return fail(queueId, 'meta', `이 언어(${lang})의 릴스 영상이 없습니다.`);
    const ownCaption = [reel?.caption?.trim(), reel?.hashtags?.trim()].filter(Boolean).join('\n\n');
    caption = ownCaption || (await loadCardnews(q.article_id as string, lang)).caption;
  } else {
    const { data: art } = await sb.from('marketing_articles').select('title, body, translations').eq('id', q.article_id).single();
    const body = lang === 'ko'
      ? (art as { body?: string } | null)?.body
      : (art as { translations?: Record<string, { body?: string }> } | null)?.translations?.[lang]?.body;
    caption = htmlToText(body || '');
  }

  if (q.content_kind !== 'reels') {
    const v = validatePublish(platform, imageUrls);
    if (!v.ok) return fail(queueId, 'meta', v.reason || '발행 불가');
  }
  const targetId = targetIdFor(
    ch as { platform: string; meta_page_id?: string | null; meta_ig_id?: string | null; meta_threads_id?: string | null },
    platform,
  );
  if (!targetId) return fail(queueId, 'meta', '채널에 Meta 타겟 id가 없습니다. 연결/매핑 필요.');
  const bundle = await getBundle();
  if (!bundle) return fail(queueId, 'meta', 'Meta 연결이 없습니다.');
  const token = findPageToken(bundle, targetId);
  if (!token) return fail(queueId, 'meta', '해당 타겟의 토큰을 찾을 수 없습니다(재연결 필요).');

  try {
    let postId = '';
    if (q.content_kind === 'reels') {
      if (platform === 'facebook') postId = await publishFacebookReel(targetId, token, caption, videoUrl as string);
      else if (platform === 'instagram') postId = await publishInstagramReel(targetId, token, caption, videoUrl as string, coverUrl);
      else postId = await publishThreadsVideo(targetId, token, caption, videoUrl as string);
    } else if (platform === 'facebook') postId = await publishFacebook(targetId, token, caption, imageUrls);
    else if (platform === 'instagram') postId = await publishInstagram(targetId, token, caption, imageUrls);
    else postId = await publishThreads(targetId, token, caption, imageUrls);
    const publishedUrl = await fetchPermalink(platform, postId, token);
    await sb.from('marketing_publish_queue').update({
      status: 'published', platform_post_id: postId, published_url: publishedUrl,
      published_at: new Date().toISOString(), error_message: null, updated_at: new Date().toISOString(),
    }).eq('id', queueId);
    return { ok: true, kind: 'meta', postId };
  } catch (e) {
    return fail(queueId, 'meta', e instanceof Error ? e.message : '발행 실패');
  }
}

// 발행된 채널 게시물 삭제(페이스북만). 큐 행 자체 삭제는 호출자(클라)가 별도로 수행.
// IG 미디어는 Graph 삭제 미지원, Threads 는 이 셋업(FB graph 경유)에서 불확실 → FB 로 한정.
export async function deleteChannelPost(queueId: string): Promise<ExecResult> {
  const { data: q } = await sb.from('marketing_publish_queue').select('*').eq('id', queueId).single();
  if (!q) return { ok: false, kind: 'meta', error: '큐 항목 없음' };
  const platform = q.channel as Platform;
  if (platform !== 'facebook') return { ok: false, kind: 'meta', error: '채널 게시물 삭제는 페이스북만 지원합니다(IG/Threads는 수동).' };
  const postId = q.platform_post_id as string | null;
  if (!postId) return { ok: false, kind: 'meta', error: '발행된 게시물 id가 없습니다.' };
  const { data: ch } = await sb.from('marketing_channels').select('*').eq('id', q.channel_id).single();
  if (!ch) return { ok: false, kind: 'meta', error: '채널 없음' };
  const targetId = targetIdFor(
    ch as { platform: string; meta_page_id?: string | null; meta_ig_id?: string | null; meta_threads_id?: string | null },
    platform,
  );
  if (!targetId) return { ok: false, kind: 'meta', error: '채널에 Meta 타겟 id가 없습니다.' };
  const bundle = await getBundle();
  if (!bundle) return { ok: false, kind: 'meta', error: 'Meta 연결이 없습니다.' };
  const token = findPageToken(bundle, targetId);
  if (!token) return { ok: false, kind: 'meta', error: '해당 타겟의 토큰을 찾을 수 없습니다(재연결 필요).' };
  try {
    await deletePost(postId, token);
    return { ok: true, kind: 'meta' };
  } catch (e) {
    return { ok: false, kind: 'meta', error: e instanceof Error ? e.message : '게시물 삭제 실패' };
  }
}

// 카드뉴스 캡션(+이미지)을 언어별로 로드. 릴스는 캡션만, 카드뉴스는 이미지까지 공용으로 사용.
async function loadCardnews(articleId: string, lang: string): Promise<{ caption: string; imageUrls: string[] }> {
  const { data: cn } = await sb.from('marketing_cardnews')
    .select('id, caption, hashtags, captions, hashtags_i18n').eq('content_id', articleId).limit(1).single();
  if (!cn) return { caption: '', imageUrls: [] };
  // i18n: 언어별 captions/hashtags_i18n 우선, 없으면 flat caption/hashtags 폴백
  const capI18n = (cn.captions as Record<string, string> | null)?.[lang];
  const tagI18n = (cn.hashtags_i18n as Record<string, string> | null)?.[lang];
  const captionText = (capI18n && capI18n.trim()) || (cn.caption as string) || '';
  const tags = (tagI18n && tagI18n.trim())
    ? tagI18n
    : ((cn.hashtags ?? []) as string[]).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
  const caption = [captionText, tags].filter(Boolean).join('\n\n');
  const { data: slides } = await sb.from('marketing_cardnews_slides')
    .select('canvas, sort_order').eq('cardnews_id', cn.id as string).order('sort_order');
  // 완성 이미지는 언어별(canvas.images[lang]) — 교차 폴백 없음(각 언어 텍스트가 박혀 있어서).
  const imageUrls = ((slides ?? []) as Array<{ canvas?: { images?: Record<string, string | null> } }>)
    .map((s) => s.canvas?.images?.[lang] ?? null)
    .filter((u): u is string => typeof u === 'string' && u.length > 0);
  return { caption, imageUrls };
}
