// src/features/marketing/services/marketingMentionService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

export type MentionSentiment = 'positive' | 'neutral' | 'negative';
export type MentionStatus = 'new' | 'replied' | 'ignored';

export interface Mention {
  id: string;
  platform: string;
  url: string;
  author: string;
  title: string;
  body: string;
  sentiment: MentionSentiment;
  language: string;
  status: MentionStatus;
  replyDraft: string;
  createdAt: string;
  updatedAt: string;
}

export type MentionInput = Partial<Mention> & { id?: string };

export interface GenerateReplyReq {
  body: string;
  platform?: string;
  sentiment?: string;
  tone?: string;
  language?: string;
}

// Keep field lists in sync: 023 migration columns ↔ mentionToRow ↔ rowToMention ↔ Mention.
type Row = Record<string, unknown>;

function rowToMention(r: Row): Mention {
  return {
    id: r.id as string,
    platform: (r.platform as string) ?? '',
    url: (r.url as string) ?? '',
    author: (r.author as string) ?? '',
    title: (r.title as string) ?? '',
    body: (r.body as string) ?? '',
    sentiment: ((r.sentiment as MentionSentiment) ?? 'neutral'),
    language: (r.language as string) ?? 'ko',
    status: ((r.status as MentionStatus) ?? 'new'),
    replyDraft: (r.reply_draft as string) ?? '',
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? '',
  };
}

// id 제외(insert 시 DB 생성, update 시 eq로 지정). updated_at은 항상 now.
function mentionToRow(m: MentionInput): Row {
  return {
    platform: m.platform ?? '',
    url: m.url ?? '',
    author: m.author ?? '',
    title: m.title ?? '',
    body: m.body ?? '',
    sentiment: m.sentiment ?? 'neutral',
    language: m.language ?? 'ko',
    status: m.status ?? 'new',
    reply_draft: m.replyDraft ?? '',
    updated_at: new Date().toISOString(),
  };
}

export async function fetchMentions(): Promise<Mention[]> {
  const { data, error } = await supabase
    .from('marketing_mentions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    logger.warn('[marketing] fetchMentions failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToMention(r as Row));
}

export async function saveMention(m: MentionInput): Promise<Mention> {
  const row = mentionToRow(m);
  if (m.id) {
    const { data, error } = await supabase
      .from('marketing_mentions')
      .update(row)
      .eq('id', m.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToMention(data as Row);
  }
  const { data, error } = await supabase
    .from('marketing_mentions')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToMention(data as Row);
}

export async function deleteMention(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_mentions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Gemini-gated: ai-server reads marketing_config (service-role) and builds the brand-voice prompt.
export async function generateReplyDraft(req: GenerateReplyReq): Promise<string> {
  const res = await fetch(`${BASE}/api/marketing/comment-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `초안 생성 실패: ${res.status}`);
  return body.draft as string;
}
