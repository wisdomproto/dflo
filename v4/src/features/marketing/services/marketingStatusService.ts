// 콘텐츠 자산 현황 — 콘텐츠 × 언어 × (블로그·카드뉴스·릴스) 의 텍스트/이미지가 다 올라왔는지 집계.
// articles(이미 blog·reels 보유) + marketing_cardnews(+slides) 를 합쳐 완료/일부/없음 판정.
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { MarketingArticle } from '../types';

export const STATUS_LANGS = ['ko', 'th', 'vi', 'en', 'cn', 'ch'] as const;
export type StatusLang = (typeof STATUS_LANGS)[number];
export const LANG_FLAG: Record<StatusLang, string> = { ko: '🇰🇷', th: '🇹🇭', vi: '🇻🇳', en: '🇺🇸', cn: '🇨🇳', ch: '🇹🇼' };

export type Readiness = 'complete' | 'partial' | 'none';
export interface Cell { status: Readiness; detail: string }
export interface ContentStatus {
  articleId: string;
  sortOrder: number;
  title: string;
  blog: Record<string, Cell>;
  cardnews: Record<string, Cell>;
  reels: Record<string, Cell>;
}

type AnyRec = Record<string, unknown>;

function blogCell(blog: AnyRec | undefined, lang: string): Cell {
  const b = (blog?.[lang] as AnyRec | undefined) ?? undefined;
  const sections = (b?.sections as AnyRec[] | undefined) ?? [];
  if (!b || (!sections.length && !b.h1)) return { status: 'none', detail: '글 없음' };
  const total = sections.length;
  const imgDone = sections.filter((s) => s.imageUrl).length;
  const status: Readiness = total > 0 && imgDone === total ? 'complete' : 'partial';
  return { status, detail: `본문✓ 이미지 ${imgDone}/${total}` };
}

function reelsCell(reels: AnyRec | undefined, lang: string): Cell {
  const r = (reels?.[lang] as AnyRec | undefined) ?? undefined;
  const v = !!r?.videoUrl;
  const c = !!r?.coverUrl;
  if (!v && !c) return { status: 'none', detail: '없음' };
  return { status: v && c ? 'complete' : 'partial', detail: `영상${v ? '✓' : '✗'} 커버${c ? '✓' : '✗'}` };
}

function cardnewsCell(captions: AnyRec | undefined, slides: AnyRec[], lang: string): Cell {
  const cap = (captions?.[lang] as string | undefined) ?? '';
  const hasCaption = !!cap.trim();
  const total = slides.length;
  const imgDone = slides.filter((s) => {
    const imgs = ((s.canvas as AnyRec | undefined)?.images as AnyRec | undefined) ?? {};
    return !!imgs[lang];
  }).length;
  const textDone = slides.filter((s) => {
    const t = ((s.texts as AnyRec | undefined)?.[lang] as AnyRec | undefined) ?? {};
    return ((t.headline as string) || '').trim() || ((t.subtext as string) || '').trim();
  }).length;
  if (!hasCaption && imgDone === 0 && textDone === 0) return { status: 'none', detail: '없음' };
  const status: Readiness = hasCaption && total > 0 && imgDone === total ? 'complete' : 'partial';
  return { status, detail: `텍스트${textDone > 0 ? '✓' : '✗'} 이미지 ${imgDone}/${total}` };
}

export async function fetchContentStatus(articles: MarketingArticle[]): Promise<ContentStatus[]> {
  // 카드뉴스 + 슬라이드 (anon RLS — CardNewsPanel 과 동일 접근). 실패 시 빈 맵으로 graceful.
  const cardByContent = new Map<string, { captions: AnyRec; slides: AnyRec[] }>();
  try {
    const [{ data: cns }, { data: slides }] = await Promise.all([
      supabase.from('marketing_cardnews').select('id, content_id, captions'),
      supabase.from('marketing_cardnews_slides').select('cardnews_id, texts, canvas'),
    ]);
    const slidesByCard = new Map<string, AnyRec[]>();
    for (const s of (slides ?? []) as AnyRec[]) {
      const cid = s.cardnews_id as string;
      if (!slidesByCard.has(cid)) slidesByCard.set(cid, []);
      slidesByCard.get(cid)!.push(s);
    }
    for (const c of (cns ?? []) as AnyRec[]) {
      cardByContent.set(c.content_id as string, { captions: (c.captions as AnyRec) ?? {}, slides: slidesByCard.get(c.id as string) ?? [] });
    }
  } catch (e) {
    logger.warn('[marketing] fetchContentStatus cardnews failed:', e instanceof Error ? e.message : String(e));
  }

  return articles.map((a) => {
    const blog: Record<string, Cell> = {};
    const cardnews: Record<string, Cell> = {};
    const reels: Record<string, Cell> = {};
    const cnd = cardByContent.get(a.id);
    for (const lang of STATUS_LANGS) {
      blog[lang] = blogCell(a.blog as unknown as AnyRec, lang);
      reels[lang] = reelsCell(a.reels as unknown as AnyRec, lang);
      cardnews[lang] = cnd ? cardnewsCell(cnd.captions, cnd.slides, lang) : { status: 'none', detail: '카드뉴스 없음' };
    }
    return { articleId: a.id, sortOrder: a.sortOrder, title: a.title, blog, cardnews, reels };
  }).sort((x, y) => x.sortOrder - y.sortOrder);
}
