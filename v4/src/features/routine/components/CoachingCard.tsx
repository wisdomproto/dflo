// ================================================
// CoachingCard — Gemini 기반 환자 오늘의 코칭 (식단/잠/운동)
// ai-server `/api/coaching/:childId` 사용. 1일 1회 캐시.
// ================================================

import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';
const API_KEY = import.meta.env.VITE_AI_API_KEY ?? '';

interface CoachingContent {
  meal: string;
  sleep: string;
  exercise: string;
  summary?: string;
}

interface Props {
  childId: string;
}

export function CoachingCard({ childId }: Props) {
  const [content, setContent] = useState<CoachingContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${BASE}/api/coaching/${childId}`, {
      headers: API_KEY ? { 'x-api-key': API_KEY } : undefined,
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? '코칭 불러오기 실패');
        return j as { content: CoachingContent; generatedAt: string };
      })
      .then((j) => {
        if (cancelled) return;
        setContent(j.content);
        setGeneratedAt(j.generatedAt);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Unknown');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [childId]);

  const regenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/coaching/${childId}`, {
        method: 'POST',
        headers: API_KEY ? { 'x-api-key': API_KEY } : undefined,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? '재생성 실패');
      setContent(j.content);
      setGeneratedAt(j.generatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-50 via-white to-rose-50 border border-violet-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          <span>✨</span> 오늘의 코칭
        </h3>
        {generatedAt && !loading && (
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="text-[10px] text-violet-600 active:text-violet-800 disabled:opacity-50"
          >
            {regenerating ? '생성 중...' : '🔄 새로 받기'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-gray-400">코칭 메시지 만들고 있어요...</div>
      ) : error ? (
        <div className="text-xs text-rose-600 leading-relaxed">
          ⚠️ {error}
          <button onClick={regenerate} className="ml-2 underline font-semibold">다시 시도</button>
        </div>
      ) : !content ? null : (
        <div className="space-y-2">
          {content.summary && (
            <p className="text-sm font-semibold text-violet-900 leading-relaxed">
              {content.summary}
            </p>
          )}
          <Item emoji="🍜" label="식단" text={content.meal} accent="text-meal" />
          <Item emoji="😴" label="수면" text={content.sleep} accent="text-sleep" />
          <Item emoji="🏃" label="운동" text={content.exercise} accent="text-exercise" />
          <p className="text-[10px] text-gray-400 pt-1 border-t border-violet-100">
            AI 가 매일 1회 자동 생성. 의료 진단 X — 일반 생활습관 가이드입니다.
          </p>
        </div>
      )}
    </div>
  );
}

function Item({
  emoji,
  label,
  text,
  accent,
}: {
  emoji: string;
  label: string;
  text: string;
  accent: string;
}) {
  return (
    <div className="bg-white/70 rounded-xl px-3 py-2.5 border border-violet-50">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-base">{emoji}</span>
        <span className={`text-xs font-bold ${accent}`}>{label}</span>
      </div>
      <p className="text-[13px] text-gray-700 leading-relaxed">{text}</p>
    </div>
  );
}
