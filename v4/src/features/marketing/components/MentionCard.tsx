// src/features/marketing/components/MentionCard.tsx
import { useState } from 'react';
import {
  generateReplyDraft,
  saveMention,
  type Mention,
  type MentionSentiment,
  type MentionStatus,
} from '../services/marketingMentionService';

const PLATFORM_ICON: Record<string, string> = {
  naver_kin: '🟢',
  naver_blog: '📗',
  naver_cafe: '☕',
  blog: '📝',
  instagram: '📸',
  youtube: '▶️',
  facebook: '👤',
  threads: '🧵',
  community: '💬',
};

const PLATFORM_LABEL: Record<string, string> = {
  naver_kin: '지식인',
  naver_blog: '네이버블로그',
  naver_cafe: '네이버카페',
  blog: '블로그',
  instagram: '인스타그램',
  youtube: '유튜브',
  facebook: '페이스북',
  threads: '스레드',
  community: '커뮤니티',
};

const SENTIMENT_BADGE: Record<MentionSentiment, { label: string; cls: string }> = {
  positive: { label: '긍정', cls: 'bg-emerald-100 text-emerald-700' },
  neutral: { label: '중립', cls: 'bg-gray-100 text-gray-600' },
  negative: { label: '부정', cls: 'bg-red-100 text-red-700' },
};

const STATUS_CYCLE: MentionStatus[] = ['new', 'replied', 'ignored'];
const STATUS_BADGE: Record<MentionStatus, { label: string; cls: string }> = {
  new: { label: '신규', cls: 'bg-[#4A2D6B] text-white' },
  replied: { label: '답변함', cls: 'bg-emerald-500 text-white' },
  ignored: { label: '무시', cls: 'bg-gray-300 text-gray-600' },
};

const TONES = [
  { id: 'professional', label: '전문적' },
  { id: 'friendly', label: '친근하게' },
  { id: 'short', label: '짧게' },
] as const;

function relativeTime(iso: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  return iso.slice(0, 10);
}

export function MentionCard({
  mention,
  onChanged,
  onDelete,
}: {
  mention: Mention;
  onChanged: (m: Mention) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState(mention.replyDraft);
  const [open, setOpen] = useState(!!mention.replyDraft);
  const [tone, setTone] = useState<string>('professional');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sentiment = SENTIMENT_BADGE[mention.sentiment];

  const generate = async () => {
    setOpen(true);
    setLoading(true);
    setErr(null);
    try {
      const text = await generateReplyDraft({
        body: mention.body,
        platform: mention.platform,
        sentiment: mention.sentiment,
        tone,
        language: mention.language,
      });
      setDraft(text);
      const saved = await saveMention({ ...mention, replyDraft: text });
      onChanged(saved);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '초안 생성 실패 (Gemini 키 확인)');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setErr('복사 실패');
    }
  };

  const cycleStatus = async () => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(mention.status) + 1) % STATUS_CYCLE.length];
    try {
      const saved = await saveMention({ ...mention, status: next, replyDraft: draft });
      onChanged(saved);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '상태 변경 실패');
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-start gap-2">
        <span className="text-lg leading-none">{PLATFORM_ICON[mention.platform] ?? '💬'}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {mention.url ? (
              <a
                href={mention.url}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm font-semibold text-[#4A2D6B] hover:underline"
              >
                {mention.title || mention.url}
              </a>
            ) : (
              <span className="truncate text-sm font-semibold text-gray-800">
                {mention.title || '(제목 없음)'}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${sentiment.cls}`}>{sentiment.label}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <span>{PLATFORM_LABEL[mention.platform] ?? mention.platform}</span>
            {mention.author && <span>· {mention.author}</span>}
            <span>· {relativeTime(mention.createdAt)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={cycleStatus}
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] ${STATUS_BADGE[mention.status].cls}`}
          title="상태 전환 (신규 → 답변함 → 무시)"
        >
          {STATUS_BADGE[mention.status].label}
        </button>
        <button
          type="button"
          aria-label="삭제"
          onClick={() => {
            if (window.confirm('이 멘션을 삭제할까요?')) onDelete(mention.id);
          }}
          className="flex-shrink-0 px-1 text-gray-300 hover:text-red-500"
        >
          🗑
        </button>
      </div>

      {mention.body && (
        <p className="mb-3 whitespace-pre-wrap break-words text-sm text-gray-600">{mention.body}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="rounded-lg bg-[#4A2D6B] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {loading ? '생성 중…' : draft ? '✨ 답글 다시 생성' : '✨ AI 답글 초안'}
        </button>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[#4A2D6B] focus:outline-none"
        >
          {TONES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        {(draft || open) && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs text-gray-400 hover:text-gray-600">
            {open ? '초안 접기' : '초안 펼치기'}
          </button>
        )}
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>

      {open && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="AI 답글 초안이 여기에 표시됩니다. 직접 수정할 수도 있어요."
            className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={copy}
              disabled={!draft.trim()}
              className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 disabled:opacity-40"
            >
              {copied ? '✓ 복사됨' : '📋 복사'}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const saved = await saveMention({ ...mention, replyDraft: draft });
                  onChanged(saved);
                } catch (e) {
                  setErr(e instanceof Error ? e.message : '저장 실패');
                }
              }}
              className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
            >
              💾 초안 저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
