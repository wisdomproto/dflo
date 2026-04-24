import { useEffect, useState } from 'react';
import {
  fetchStoryByChild,
  type PatientStory,
} from '@/features/admin/services/patientStoryService';

interface Props {
  childId: string;
  childName?: string;
  chartNumber?: string;
  onClose: () => void;
}

export default function PatientStoryModal({ childId, childName, chartNumber, onClose }: Props) {
  const [story, setStory] = useState<PatientStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchStoryByChild(childId)
      .then((s) => {
        if (!cancelled) setStory(s);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [childId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <div className="text-[11px] font-mono text-slate-400">
              {chartNumber && `#${chartNumber}`}
            </div>
            <h2 className="text-base font-semibold text-slate-900 truncate">
              {story?.title || `${childName ?? '환자'} 스토리`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded text-slate-500 hover:bg-slate-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="h-40 animate-pulse bg-slate-50 rounded" />
          ) : err ? (
            <p className="text-sm text-red-500">{err}</p>
          ) : !story ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="text-4xl">📖</div>
              <p className="text-sm text-slate-600">
                아직 스토리가 생성되지 않았습니다.
              </p>
              <p className="text-xs text-slate-400">
                <code className="px-1 py-0.5 rounded bg-slate-100">node cases/generate_patient_stories.mjs</code>
                {' '}로 배치 생성을 실행하세요.
              </p>
            </div>
          ) : (
            <>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-800 leading-relaxed">
                {story.story}
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 flex flex-wrap gap-3 text-[11px] text-slate-400">
                <span>생성 모델: {story.model}</span>
                <span>·</span>
                <span>출처: {story.source}</span>
                <span>·</span>
                <span>{new Date(story.generated_at).toLocaleString('ko-KR')}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
