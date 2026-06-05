// src/features/marketing/services/marketingAuditService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

export interface AuditScores {
  google: number;
  naver: number;
  geo: number;
  tech: number;
}

export interface AuditIssue {
  severity: 'critical' | 'warning';
  message: string;
  engine: 'google' | 'naver' | 'geo' | 'tech';
  fixAction?: string;
}

export interface AuditResult {
  url: string;
  title: string;
  metaDescription: string;
  scores: AuditScores;
  issues: AuditIssue[];
  meta: {
    h1Count: number;
    h2Count: number;
    imageCount: number;
    linkCount: number;
    textLength: number;
    hasSchema: boolean;
    isHttps: boolean;
    hasViewport: boolean;
    canonicalUrl?: string;
  };
}

export interface SavedAudit {
  url: string;
  googleScore: number;
  naverScore: number;
  geoScore: number;
  techScore: number;
  issueCount: number;
  createdAt: string;
}

export interface SuggestPayload {
  url: string;
  scores: AuditScores;
  issues: AuditIssue[];
}

/** Run the rule-based audit on ai-server (no key needed). */
export async function runAudit(url: string): Promise<AuditResult> {
  const res = await fetch(`${BASE}/api/marketing/seo-audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `감사 실패: ${res.status}`);
  return body.result as AuditResult;
}

/** Gemini-gated AI improvement suggestions. */
export async function getSuggestions(payload: SuggestPayload): Promise<string[]> {
  // Server re-audits the URL authoritatively, so only the URL is sent on the wire.
  const res = await fetch(`${BASE}/api/marketing/seo-suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: payload.url }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `제안 실패: ${res.status}`);
  return (body.suggestions as string[]) ?? [];
}

// Keep field lists in sync: 023 migration columns ↔ saveAudit row ↔ rowToSaved ↔ SavedAudit.
type Row = Record<string, unknown>;
function rowToSaved(r: Row): SavedAudit {
  return {
    url: (r.url as string) ?? '',
    googleScore: (r.google_score as number) ?? 0,
    naverScore: (r.naver_score as number) ?? 0,
    geoScore: (r.geo_score as number) ?? 0,
    techScore: (r.tech_score as number) ?? 0,
    issueCount: (r.issue_count as number) ?? 0,
    createdAt: (r.created_at as string) ?? '',
  };
}

export async function fetchAuditHistory(): Promise<SavedAudit[]> {
  const { data, error } = await supabase
    .from('marketing_audits')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    logger.warn('[marketing] fetchAuditHistory failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToSaved(r as Row));
}

export async function saveAudit(result: AuditResult): Promise<void> {
  const { error } = await supabase.from('marketing_audits').insert({
    url: result.url,
    google_score: result.scores.google,
    naver_score: result.scores.naver,
    geo_score: result.scores.geo,
    tech_score: result.scores.tech,
    issue_count: result.issues.length,
    audit_data: result,
  });
  if (error) throw new Error(error.message);
}
