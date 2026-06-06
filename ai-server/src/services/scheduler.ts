// 예약 발행 스케줄러 — 매분 due 항목을 claim 후 executor 실행. node-cron(in-process).
// supabase·publishExecutor·deployHook 은 runDueOnce/startScheduler 진입 시 동적 import
// → 테스트 시 모듈 로드 단계에서 supabase 초기화 오류 없이 selectDue 단독 import 가능.
import cron from 'node-cron';

export interface DueRow {
  id: string;
  status: string;
  scheduled_at: string | null;
}

// 순수: 예약 시각이 now 이하인 'scheduled' 항목만.
export function selectDue<T extends DueRow>(items: T[], nowIso: string): T[] {
  return items.filter(
    (it) => it.status === 'scheduled' && it.scheduled_at != null && it.scheduled_at <= nowIso,
  );
}

async function makeSb() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false } },
  );
}

export async function runDueOnce(): Promise<void> {
  const sb = await makeSb();
  const nowIso = new Date().toISOString();
  const { data, error } = await sb
    .from('marketing_publish_queue')
    .select('id, status, scheduled_at')
    .eq('status', 'scheduled');
  if (error) { console.warn('[scheduler] 조회 실패:', error.message); return; }
  const due = selectDue((data ?? []) as DueRow[], nowIso);
  if (due.length === 0) return;

  const { publishQueueItem } = await import('./publishExecutor.js');
  const { triggerDeploy } = await import('./deployHook.js');

  let websitePublished = false;
  for (const item of due) {
    const { data: claimed } = await sb
      .from('marketing_publish_queue')
      .update({ status: 'publishing', updated_at: new Date().toISOString() })
      .eq('id', item.id).eq('status', 'scheduled')
      .select('id');
    if (!claimed || claimed.length === 0) continue;
    try {
      const r = await publishQueueItem(item.id);
      if (r.ok && r.kind === 'website') websitePublished = true;
      console.log(`[scheduler] ${item.id} → ${r.ok ? 'published' : 'failed'} (${r.kind})${r.error ? ': ' + r.error : ''}`);
    } catch (e) {
      console.warn('[scheduler] 항목 실패', item.id, e instanceof Error ? e.message : String(e));
    }
  }
  if (websitePublished) await triggerDeploy();
}

export function startScheduler(): void {
  if (process.env.SCHEDULER_ENABLED === 'false') {
    console.log('[scheduler] 비활성(SCHEDULER_ENABLED=false)');
    return;
  }
  // stale 'publishing' 항목 복구 (재시작 시 claim 중 crash 대비)
  void (async () => {
    const sb = await makeSb();
    const { error } = await sb
      .from('marketing_publish_queue')
      .update({ status: 'scheduled', updated_at: new Date().toISOString() })
      .eq('status', 'publishing');
    if (error) console.warn('[scheduler] stale 복구 실패:', error.message);
  })();
  cron.schedule('* * * * *', () => { void runDueOnce(); });
  console.log('[scheduler] 매분 예약 발행 체크 시작');
}
