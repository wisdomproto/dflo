// 릴 렌더 잡 + 워커 상태 서비스 (migration 057). graceful: 테이블 미존재 시 친절한 에러로 변환.
import { supabase } from '@/shared/lib/supabase';
import type { ReelJob, ReelJobStatus, ReelLang } from '../types';
import { REEL_JOB_ACTIVE } from '../utils/reelEditor';

const MIGRATION_HINT = 'migration 057 적용 필요 (marketing_reel_jobs)';
function friendly(e: { message: string; code?: string }): Error {
  return new Error(/relation .* does not exist|42P01/.test(`${e.code} ${e.message}`) ? MIGRATION_HINT : e.message);
}
function mapJob(r: Record<string, unknown>): ReelJob {
  return {
    id: r.id as string, articleId: r.article_id as string, slug: r.slug as string,
    lang: r.lang as ReelLang, kind: r.kind as ReelJob['kind'], status: r.status as ReelJobStatus,
    progressNote: (r.progress_note as string) ?? null, error: (r.error as string) ?? null,
    requestedAt: r.requested_at as string, startedAt: (r.started_at as string) ?? null,
    finishedAt: (r.finished_at as string) ?? null, updatedAt: r.updated_at as string,
  };
}
export async function fetchReelJobs(articleId: string, limit = 8): Promise<ReelJob[]> {
  const { data, error } = await supabase.from('marketing_reel_jobs')
    .select('*').eq('article_id', articleId).order('requested_at', { ascending: false }).limit(limit);
  if (error) throw friendly(error);
  return (data ?? []).map(mapJob);
}
export async function createReelJob(input: { articleId: string; slug: string; lang: ReelLang; kind: 'render' | 'full' }): Promise<void> {
  const { data: act, error: e1 } = await supabase.from('marketing_reel_jobs')
    .select('id').eq('article_id', input.articleId).eq('lang', input.lang).in('status', [...REEL_JOB_ACTIVE]).limit(1);
  if (e1) throw friendly(e1);
  if (act && act.length) throw new Error('이미 진행 중인 렌더 잡이 있습니다');
  const { error } = await supabase.from('marketing_reel_jobs')
    .insert({ article_id: input.articleId, slug: input.slug, lang: input.lang, kind: input.kind });
  if (error) throw friendly(error);
}
export async function fetchWorkerLastSeen(): Promise<string | null> {
  const { data, error } = await supabase.from('marketing_reel_worker').select('last_seen').eq('id', 1).maybeSingle();
  if (error) throw friendly(error);
  return (data?.last_seen as string) ?? null;
}
