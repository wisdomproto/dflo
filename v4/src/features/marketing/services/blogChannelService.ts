// src/features/marketing/services/blogChannelService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type {
  BlogContent,
  BlogCard,
  BlogCardType,
  BlogChannel,
  BlogCardContent,
  GlobalCardStyle,
} from '../types';

// Keep field lists in sync: 031 migration columns ↔ mappers ↔ BlogContent/BlogCard.
type Row = Record<string, unknown>;

function rowToBlogContent(r: Row, cards: BlogCard[]): BlogContent {
  return {
    id: r.id as string,
    contentId: r.content_id as string,
    channel: (r.channel as BlogChannel) ?? 'naver_blog',
    seoTitle: (r.seo_title as string) ?? '',
    seoScore: (r.seo_score as number) ?? 0,
    globalStyle: (r.global_style as GlobalCardStyle) ?? {},
    primaryKeyword: (r.primary_keyword as string) ?? '',
    secondaryKeywords: (r.secondary_keywords as string[]) ?? [],
    cards,
  };
}

function rowToBlogCard(r: Row): BlogCard {
  return {
    id: r.id as string,
    blogContentId: r.blog_content_id as string,
    cardType: (r.card_type as BlogCardType) ?? 'text',
    content: (r.content as BlogCardContent) ?? {},
    sortOrder: (r.sort_order as number) ?? 0,
  };
}

export async function fetchBlogContents(contentId: string): Promise<BlogContent[]> {
  const { data: contents, error } = await supabase
    .from('marketing_blog_contents')
    .select('*')
    .eq('content_id', contentId)
    .order('created_at', { ascending: true });
  if (error) {
    logger.warn('[marketing] fetchBlogContents failed:', error.message);
    return [];
  }
  const rows = (contents ?? []) as Row[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id as string);
  const { data: cards, error: cardErr } = await supabase
    .from('marketing_blog_cards')
    .select('*')
    .in('blog_content_id', ids)
    .order('sort_order', { ascending: true });
  if (cardErr) {
    logger.warn('[marketing] fetchBlogContents cards failed:', cardErr.message);
    return rows.map((r) => rowToBlogContent(r, []));
  }

  const byParent = new Map<string, BlogCard[]>();
  for (const c of (cards ?? []) as Row[]) {
    const card = rowToBlogCard(c);
    const list = byParent.get(card.blogContentId) ?? [];
    list.push(card);
    byParent.set(card.blogContentId, list);
  }
  return rows.map((r) => rowToBlogContent(r, byParent.get(r.id as string) ?? []));
}

export async function createBlogContent(
  contentId: string,
  channel: BlogChannel
): Promise<BlogContent> {
  const { data, error } = await supabase
    .from('marketing_blog_contents')
    .insert({ content_id: contentId, channel })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToBlogContent(data as Row, []);
}

export async function updateBlogContent(
  id: string,
  patch: Partial<
    Pick<
      BlogContent,
      'seoTitle' | 'seoScore' | 'globalStyle' | 'primaryKeyword' | 'secondaryKeywords' | 'channel'
    >
  >
): Promise<void> {
  const row: Row = { updated_at: new Date().toISOString() };
  if (patch.seoTitle !== undefined) row.seo_title = patch.seoTitle;
  if (patch.seoScore !== undefined) row.seo_score = patch.seoScore;
  if (patch.globalStyle !== undefined) row.global_style = patch.globalStyle;
  if (patch.primaryKeyword !== undefined) row.primary_keyword = patch.primaryKeyword;
  if (patch.secondaryKeywords !== undefined) row.secondary_keywords = patch.secondaryKeywords;
  if (patch.channel !== undefined) row.channel = patch.channel;
  const { error } = await supabase.from('marketing_blog_contents').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteBlogContent(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_blog_contents').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addCard(
  blogContentId: string,
  cardType: BlogCardType,
  sortOrder: number
): Promise<BlogCard> {
  const { data, error } = await supabase
    .from('marketing_blog_cards')
    .insert({ blog_content_id: blogContentId, card_type: cardType, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToBlogCard(data as Row);
}

export async function updateCard(id: string, content: BlogCardContent): Promise<void> {
  const { error } = await supabase.from('marketing_blog_cards').update({ content }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_blog_cards').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function reorderCards(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id, i) =>
      supabase.from('marketing_blog_cards').update({ sort_order: i }).eq('id', id)
    )
  );
}
