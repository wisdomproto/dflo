// src/features/marketing/services/keywordIdeaService.ts
// AI 아이디어 생성 클라이언트. ai-server POST /api/marketing/keyword-ideas 호출(Gemini 게이트).
import { logger } from '@/shared/lib/logger';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

// Keep field lists in sync: ai-server keywordIdeas.ts KeywordIdea ↔ this KeywordIdea.
export interface KeywordIdea {
  channel: string;
  title: string;
  structure: string;
  hook: string;
  outline: string[];
}

export async function fetchKeywordIdeas(seed: string, channels: string[]): Promise<KeywordIdea[]> {
  const res = await fetch(`${BASE}/api/marketing/keyword-ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seed, channels }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    logger.warn('[marketing] fetchKeywordIdeas failed:', body.error);
    throw new Error(body.error || `생성 실패: ${res.status}`);
  }
  return (body.ideas ?? []) as KeywordIdea[];
}
