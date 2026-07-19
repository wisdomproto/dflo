// src/features/marketing/components/MentionCard.tsx
import { useState } from 'react';
import {
  generateReplyDraft,
  saveMention,
  translateText,
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
  reddit: '👽',
  quora: '❓',
  pantip: '🇹🇭',
  xiaohongshu: '📕',
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
  reddit: 'Reddit',
  quora: 'Quora',
  pantip: 'Pantip',
  xiaohongshu: '샤오홍슈',
  community: '커뮤니티',
};

// 답글 번역 대상 언어 라벨 (mention.language → 표시명)
const LANG_LABEL: Record<string, string> = {
  ko: '한국어', en: '영어', th: '태국어', vi: '베트남어', zh: '중국어',
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
  // 원문 → 한글 번역 (외국 커뮤니티 글 읽기용)
  const [koBody, setKoBody] = useState('');
  const [koLoading, setKoLoading] = useState(false);
  const [koErr, setKoErr] = useState<string | null>(null);
  const [showKo, setShowKo] = useState(false);
  // 한글 답글 → 현지어 번역 (게시용)
  const [replyOut, setReplyOut] = useState('');
  const [replyOutLoading, setReplyOutLoading] = useState(false);
  const [replyCopied, setReplyCopied] = useState(false);

  const sentiment = SENTIMENT_BADGE[mention.sentiment];
  const isForeign = !!mention.language && mention.language !== 'ko';
  const targetLabel = LANG_LABEL[mention.language] || mention.language;

  // AI 답글 초안은 **한글로** 받는다(운영자가 읽고 수정 → 게시 시 현지어로 번역).
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
        language: 'ko',
      });
      setDraft(text);
      setReplyOut('');
      const saved = await saveMention({ ...mention, replyDraft: text });
      onChanged(saved);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '초안 생성 실패 (Gemini 키 확인)');
    } finally {
      setLoading(false);
    }
  };

  // 원문(제목+본문) → 한글. 한 번 번역하면 캐시하고 토글만.
  const translateBodyKo = async () => {
    if (koBody) {
      setShowKo((v) => !v);
      return;
    }
    setKoLoading(true);
    setKoErr(null);
    try {
      const src = [mention.title, mention.body].filter(Boolean).join('\n\n');
      const ko = await translateText(src, 'ko');
      setKoBody(ko);
      setShowKo(true);
    } catch (e) {
      setKoErr(e instanceof Error ? e.message : '번역 실패');
    } finally {
      setKoLoading(false);
    }
  };

  // 한글 답글 초안 → 멘션 언어(게시용). 초안 수정 시 replyOut 은 비워져 재번역 유도.
  const translateReply = async () => {
    setReplyOutLoading(true);
    setErr(null);
    try {
      const out = await translateText(draft, mention.language);
      setReplyOut(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '번역 실패');
    } finally {
      setReplyOutLoading(false);
    }
  };

  const copyReplyOut = async () => {
    try {
      await navigator.clipboard.writeText(replyOut);
      setReplyCopied(true);
      setTimeout(() => setReplyCopied(false), 1500);
    } catch {
      setErr('복사 실패');
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
        <div className="mb-3">
          <p className="whitespace-pre-wrap break-words text-sm text-gray-600">{mention.body}</p>
          {isForeign && (
            <div className="mt-1.5">
              <button
                type="button"
                onClick={translateBodyKo}
                disabled={koLoading}
                className="text-xs font-medium text-[#4A2D6B] hover:underline disabled:opacity-40"
              >
                {koLoading ? '번역 중…' : showKo ? '한글 번역 접기' : '🇰🇷 한글로 보기'}
              </button>
              {koErr && <span className="ml-2 text-xs text-red-500">{koErr}</span>}
              {showKo && koBody && (
                <div className="mt-1.5 whitespace-pre-wrap break-words rounded-lg border border-[#4A2D6B]/20 bg-[#4A2D6B]/5 p-2.5 text-sm text-gray-700">
                  {koBody}
                </div>
              )}
            </div>
          )}
        </div>
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
          <label className="mb-1 block text-[11px] font-medium text-gray-400">
            답글 초안 {isForeign && '(한글로 작성 → 아래에서 현지어로 번역해 게시)'}
          </label>
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setReplyOut(''); // 초안이 바뀌면 이전 번역은 무효
            }}
            rows={4}
            placeholder="AI 답글 초안이 여기에 표시됩니다. 직접 수정할 수도 있어요."
            className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copy}
              disabled={!draft.trim()}
              className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 disabled:opacity-40"
            >
              {copied ? '✓ 복사됨' : isForeign ? '📋 한글 복사' : '📋 복사'}
            </button>
            {isForeign && (
              <button
                type="button"
                onClick={translateReply}
                disabled={!draft.trim() || replyOutLoading}
                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
              >
                {replyOutLoading ? '번역 중…' : `🌐 ${targetLabel}로 번역`}
              </button>
            )}
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

          {isForeign && replyOut && (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-700">{targetLabel} (게시용)</span>
                <button
                  type="button"
                  onClick={copyReplyOut}
                  className="text-[11px] font-semibold text-emerald-700 hover:underline"
                >
                  {replyCopied ? '✓ 복사됨' : '📋 복사'}
                </button>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{replyOut}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
