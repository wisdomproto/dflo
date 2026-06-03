// src/features/marketing/services/marketingKeywordService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { KeywordHit, SavedKeyword } from '../types';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

interface NaverKw { keyword: string; pcSearch: number; mobileSearch: number; totalSearch: number; competition: string; }
interface GoogleKw { keyword: string; searchVolume: number; competition: string | null; cpc: number; }

async function postKeywords<T>(path: string, keywords: string[]): Promise<T[]> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `요청 실패: ${res.status}`);
  return body.results as T[];
}

export async function searchNaver(keywords: string[]): Promise<KeywordHit[]> {
  const r = await postKeywords<NaverKw>('/api/marketing/naver-keywords', keywords);
  return r.map((k) => ({ ...k, cpc: 0, source: 'naver' as const }));
}

export async function searchGoogle(keywords: string[]): Promise<KeywordHit[]> {
  const r = await postKeywords<GoogleKw>('/api/marketing/google-keywords', keywords);
  return r.map((k) => ({
    keyword: k.keyword,
    pcSearch: 0,
    mobileSearch: 0,
    totalSearch: k.searchVolume,
    competition: k.competition ?? '',
    cpc: k.cpc,
    source: 'google' as const,
  }));
}

// Keep field lists in sync: 018 migration columns ↔ savePin row ↔ rowToSaved ↔ SavedKeyword/KeywordHit.
type Row = Record<string, unknown>;
function rowToSaved(r: Row): SavedKeyword {
  return {
    keyword: r.keyword as string,
    pcSearch: (r.pc_search as number) ?? 0,
    mobileSearch: (r.mobile_search as number) ?? 0,
    totalSearch: (r.total_search as number) ?? 0,
    competition: (r.competition as string) ?? '',
    cpc: Number(r.cpc) || 0,
    source: (r.source as string) ?? 'manual',
    createdAt: (r.created_at as string) ?? '',
  };
}

export async function fetchPins(): Promise<SavedKeyword[]> {
  const { data, error } = await supabase
    .from('marketing_keywords')
    .select('*')
    .order('total_search', { ascending: false });
  if (error) {
    logger.warn('[marketing] fetchPins failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToSaved(r as Row));
}

export async function savePin(hit: KeywordHit): Promise<void> {
  const { error } = await supabase.from('marketing_keywords').upsert(
    {
      keyword: hit.keyword,
      pc_search: hit.pcSearch,
      mobile_search: hit.mobileSearch,
      total_search: hit.totalSearch,
      competition: hit.competition,
      cpc: hit.cpc,
      source: hit.source,
    },
    { onConflict: 'keyword' },
  );
  if (error) throw new Error(error.message);
}

export async function deletePin(keyword: string): Promise<void> {
  const { error } = await supabase.from('marketing_keywords').delete().eq('keyword', keyword);
  if (error) throw new Error(error.message);
}
