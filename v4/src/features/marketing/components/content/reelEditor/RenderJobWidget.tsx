// 렌더 요청 위젯 — kind 미리보기(자막만 vs 음성+립싱크) + 잡 폴링 + 워커 오프라인 배너.
// 데이터 소유권: 잡 큐는 워커가 진행 기록, done 전이 시 위젯이 reels(워커가 쓴 videoUrl)만 단건 재조회 → onPatch.
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { MarketingArticle, ReelJob, ReelLang, ReelRuntimeDoc, ReelScriptDoc, ReelsMap } from '../../../types';
import { REEL_JOB_ACTIVE, decideKind } from '../../../utils/reelEditor';
import { createReelJob, fetchReelJobs, fetchWorkerLastSeen } from '../../../services/reelJobService';

const ACCENT = '#4A2D6B';
const WORKER_STALE_MS = 2 * 60 * 1000; // 워커 heartbeat 2분 초과 → 꺼짐으로 간주

const isActive = (s: ReelJob['status']) => (REEL_JOB_ACTIVE as readonly string[]).includes(s);

const STATUS_LABEL: Record<ReelJob['status'], string> = {
  queued: '대기', claimed: '시작', tts: '음성', lipsync: '립싱크',
  upload_preview: '미리보기 업로드', render: '렌더', upload: '업로드', done: '완료', failed: '실패',
};

interface Props {
  article: MarketingArticle;
  language: string;
  doc: ReelScriptDoc;
  runtime: ReelRuntimeDoc | null;
  onPatch?: (partial: Partial<MarketingArticle>) => void;
}

export function RenderJobWidget({ article, language, doc, runtime, onPatch }: Props) {
  const lang = language as ReelLang;
  const [forceFull, setForceFull] = useState(false);
  const [jobs, setJobs] = useState<ReelJob[]>([]);
  const [reqError, setReqError] = useState<string | null>(null);
  const [doneBanner, setDoneBanner] = useState(false);
  const [workerLastSeen, setWorkerLastSeen] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevActiveRef = useRef(false); // 직전 폴링에 active 잡이 있었는지(done 전이 감지)

  const kind = decideKind({ chunks: doc.script.chunks, lang, runtime, forceFull });
  const activeJob = jobs.find((j) => isActive(j.status));
  const hasQueued = jobs.some((j) => j.status === 'queued');
  const workerOffline =
    hasQueued && (!workerLastSeen || Date.now() - Date.parse(workerLastSeen) > WORKER_STALE_MS);

  // done 전이 시: reels(워커가 쓴 새 videoUrl)만 단건 재조회 → 부모 article 갱신(🎬 영상 제작 탭 즉시 반영).
  // 실패 전이는 여기서 처리 안 함 — 실패 잡 행이 error + 재시도로 노출(녹색 성공 배너 오인 방지).
  const onJobDone = useCallback(async () => {
    setDoneBanner(true);
    try {
      const { data } = await supabase
        .from('marketing_articles').select('reels').eq('id', article.id).maybeSingle();
      if (data) onPatch?.({ reels: (data.reels as ReelsMap) ?? {} });
    } catch {
      /* 재조회 실패는 무시 — 잡 자체는 완료됨(다음 새로고침에 반영) */
    }
  }, [article.id, onPatch]);

  // 한 번의 폴링 사이클: 잡 목록 + (queued 있으면) 워커 신호. 끝나면 active 여부로 다음 폴링 예약.
  const poll = useCallback(async () => {
    let next: ReelJob[];
    try {
      next = await fetchReelJobs(article.id, 8);
    } catch (e) {
      setReqError(e instanceof Error ? e.message : '잡 조회 실패');
      return; // 다음 폴링 예약 안 함 — 요청/재시도 시 재개
    }
    setJobs(next);
    const nowActive = next.some((j) => isActive(j.status));
    // active → 비active 전이. 최신 잡(요청순 desc 의 [0])이 done 일 때만 성공 처리.
    if (prevActiveRef.current && !nowActive && next[0]?.status === 'done') void onJobDone();
    prevActiveRef.current = nowActive;

    if (next.some((j) => j.status === 'queued')) {
      void fetchWorkerLastSeen().then(setWorkerLastSeen).catch(() => setWorkerLastSeen(null));
    }
    if (nowActive) {
      pollRef.current = setTimeout(() => void poll(), 5000); // 활성 잡 있을 때만 계속 폴링
    }
  }, [article.id, onJobDone]);

  // 콘텐츠 전환 시 초기 1회 폴링 + 상태 리셋. 언어는 같은 article 이라 잡 목록 공유(필터 없이 전체 표시).
  useEffect(() => {
    setForceFull(false); setReqError(null); setDoneBanner(false);
    prevActiveRef.current = false;
    void poll();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [article.id]);

  const requestRender = useCallback(async () => {
    if (kind === 'full' && !window.confirm('음성 생성 + 립싱크까지 포함됩니다 (수십 분 소요). 진행할까요?')) return;
    setRequesting(true); setReqError(null); setDoneBanner(false);
    try {
      await createReelJob({ articleId: article.id, slug: doc.slug, lang, kind });
      if (pollRef.current) clearTimeout(pollRef.current);
      prevActiveRef.current = true; // 방금 만든 잡이 done 으로 잡히도록(즉시 폴링이 active 로 시작)
      await poll();
    } catch (e) {
      setReqError(e instanceof Error ? e.message : '렌더 요청 실패');
    } finally {
      setRequesting(false);
    }
  }, [article.id, doc.slug, lang, kind, poll]);

  const recent = jobs.slice(0, 3);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600">🎞️ 렌더 ({language})</span>
        <label className="flex items-center gap-1 text-[11px] text-gray-500">
          <input type="checkbox" checked={forceFull} onChange={(e) => setForceFull(e.target.checked)} />
          음성 강제 재생성
        </label>
      </div>

      <button
        type="button"
        onClick={() => void requestRender()}
        disabled={requesting || !!activeJob}
        style={!requesting && !activeJob ? { backgroundColor: ACCENT } : undefined}
        className={`w-full rounded-md px-3 py-2 text-xs font-semibold text-white ${
          requesting || activeJob ? 'cursor-not-allowed bg-gray-300' : 'hover:brightness-110'
        }`}
      >
        {activeJob
          ? `진행 중… (${STATUS_LABEL[activeJob.status]})`
          : kind === 'render'
            ? '🎬 렌더 요청 (자막·텍스트만: 수 분)'
            : '🎙 음성+립싱크 포함 (수십 분)'}
      </button>

      <p className="mt-1.5 text-[11px] text-gray-400">
        잡은 요청 시점 내용으로 처리됩니다 — 진행 중 편집은 다음 렌더에 반영됩니다.
      </p>

      {reqError && (
        <div className="mt-2 rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-600">
          {reqError}
        </div>
      )}
      {doneBanner && (
        <div className="mt-2 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-700">
          ✅ 렌더 완료 — 🎬 영상 제작 탭에서 새 영상을 확인하세요.
        </div>
      )}
      {workerOffline && (
        <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
          ⚠️ 렌더 워커 꺼짐{workerLastSeen ? ` (마지막 신호 ${minutesAgo(workerLastSeen)}분 전)` : ' (신호 없음)'} — 사무실 PC에서{' '}
          <code className="rounded bg-amber-100 px-1">node scripts/reel-worker.mjs --watch</code> 실행이 필요합니다.
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {recent.map((j) => (
            <JobRow key={j.id} job={j} onRetry={() => void requestRender()} retryDisabled={requesting || !!activeJob} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobRow({ job, onRetry, retryDisabled }: { job: ReelJob; onRetry: () => void; retryDisabled: boolean }) {
  const failed = job.status === 'failed';
  const active = isActive(job.status);
  return (
    <div className="rounded border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-[11px]">
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 font-semibold ${
            failed ? 'bg-red-100 text-red-700' : active ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {STATUS_LABEL[job.status]}
        </span>
        <span className="text-gray-400">{job.lang} · {job.kind === 'full' ? '음성+립싱크' : '렌더'}</span>
        {job.progressNote && <span className="truncate text-gray-500">{job.progressNote}</span>}
        {failed && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retryDisabled}
            className="ml-auto rounded border border-gray-300 px-1.5 py-0.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          >
            재시도
          </button>
        )}
      </div>
      {failed && job.error && (
        <p className="mt-1 whitespace-pre-wrap break-words text-red-500">{job.error}</p>
      )}
    </div>
  );
}

function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
}
