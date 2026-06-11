import { createClient } from '@supabase/supabase-js';
import { embedText } from './gemini.js';

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } },
);

export interface KnowledgeResult {
  papers: Array<{ pmid: string; title: string; abstract: string; journal: string; year: number | null; url: string; pop_group: string; pop_confidence: string; korean_summary: string; key_finding: string; similarity: number }>;
  insights: Array<{ category: string; cohort_n: number; summary: string; composite_case: string; similarity: number }>;
  documents: Array<{ id: string; source: string; author: string; chapter: string; chunk_index: number; content: string; similarity: number }>;
}

/** 질의문 → 임베딩 → 논문 top-kPapers + 인사이트 top-kInsights 동시 검색. */
export async function searchKnowledge(query: string, opts: { kPapers?: number; kInsights?: number; kDocuments?: number } = {}): Promise<KnowledgeResult> {
  const emb = await embedText(query);
  const [pap, ins, doc] = await Promise.all([
    sb.rpc('match_evidence_papers', { query_embedding: emb, k: opts.kPapers ?? 5 }),
    sb.rpc('match_clinical_insights', { query_embedding: emb, k: opts.kInsights ?? 3 }),
    sb.rpc('match_knowledge_documents', { query_embedding: emb, k: opts.kDocuments ?? 4 }),
  ]);
  if (pap.error) console.warn('[knowledge] papers rpc:', pap.error.message);
  if (ins.error) console.warn('[knowledge] insights rpc:', ins.error.message);
  if (doc.error) console.warn('[knowledge] documents rpc:', doc.error.message);
  return { papers: pap.data ?? [], insights: ins.data ?? [], documents: doc.data ?? [] };
}
