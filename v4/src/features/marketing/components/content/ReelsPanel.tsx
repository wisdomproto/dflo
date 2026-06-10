// src/features/marketing/components/content/ReelsPanel.tsx
// 릴스 패널 — 2 서브탭: [스토리보드](HTML 뷰어, 생성은 추후·전 언어 공용) / [영상 제작](언어별 mp4→R2 + 카드뉴스 공용 캡션).
import { useEffect, useRef, useState } from 'react';
import type { MarketingArticle, ReelsMap, ReelsLangData, Cardnews, CardLang } from '../../types';
import { saveReels } from '../../services/marketingArticleService';
import { uploadVideoFile } from '../../services/aiImageService';
import { fetchCardnews } from '../../services/cardnewsService';

interface Props { article: MarketingArticle; language: string; }

const ACCENT = '#4A2D6B';
const LANG_LABELS: Record<string, string> = {
  ko: '🇰🇷 한국어', th: '🇹🇭 TH', vi: '🇻🇳 VI', en: '🇺🇸 EN', ch: '🇹🇼 中文(번체)', cn: '🇨🇳 中文(간체)',
};
const EMPTY: ReelsLangData = { videoUrl: null };
type Sub = 'storyboard' | 'video';
const SUBS: { key: Sub; label: string }[] = [
  { key: 'storyboard', label: '📋 스토리보드' },
  { key: 'video', label: '🎬 영상 제작' },
];

// 스토리보드 매니페스트(sortOrder[] — 어느 콘텐츠에 스토리보드가 있는지). 1회 로드 후 캐시.
let _sbManifest: Promise<Set<number>> | null = null;
function loadStoryboardManifest(): Promise<Set<number>> {
  if (!_sbManifest) {
    _sbManifest = fetch('/storyboards/index.json')
      .then((r) => (r.ok ? (r.json() as Promise<number[]>) : []))
      .then((arr) => new Set(arr))
      .catch(() => new Set<number>());
  }
  return _sbManifest;
}

export function ReelsPanel({ article, language }: Props) {
  const [sub, setSub] = useState<Sub>('storyboard');
  const [reels, setReels] = useState<ReelsMap>(article.reels ?? {});
  const [cardnews, setCardnews] = useState<Cardnews | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sbSet, setSbSet] = useState<Set<number> | null>(null);
  useEffect(() => {
    let alive = true;
    void loadStoryboardManifest().then((s) => { if (alive) setSbSet(s); });
    return () => { alive = false; };
  }, []);

  // 콘텐츠(article) 전환 시 로컬 상태 리셋 + 카드뉴스(캡션/해시태그 소스) 로드.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setReels(article.reels ?? {});
    let alive = true;
    void fetchCardnews(article.id).then((cn) => { if (alive) setCardnews(cn); }).catch(() => {});
    return () => { alive = false; };
  }, [article.id]);

  const cur = reels[language] ?? EMPTY;
  const label = LANG_LABELS[language] ?? language;
  const caption = cardnews?.captions[language as CardLang] ?? '';
  const hashtags = cardnews?.hashtagsI18n[language as CardLang] ?? '';
  const hasCaption = !!(caption.trim() || hashtags.trim());

  // 스토리보드(전 언어 공용) — sortOrder 매칭 정적 HTML(/storyboards/{n}.html). 없으면 플레이스홀더.
  const storyboardSrc = sbSet && sbSet.has(article.sortOrder) ? `/storyboards/${article.sortOrder}.html` : null;

  const queueSave = (next: ReelsMap) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveReels(article.id, next).catch((e) => setError(e instanceof Error ? e.message : '저장 실패'));
    }, 700);
  };
  const patch = (p: Partial<ReelsLangData>) => {
    const next: ReelsMap = { ...reels, [language]: { ...cur, ...p } };
    setReels(next);
    queueSave(next);
  };

  const onVideo = async (file?: File | null) => {
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const url = await uploadVideoFile(file);
      patch({ videoUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : '영상 업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  const copy = () => {
    void navigator.clipboard.writeText(`${caption}\n\n${hashtags}`.trim()).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* 서브탭 */}
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 p-3">
        {SUBS.map((s) => (
          <button key={s.key} type="button" onClick={() => setSub(s.key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${s.key === sub ? 'text-white' : 'text-gray-600 ring-1 ring-gray-300'}`}
            style={s.key === sub ? { backgroundColor: ACCENT } : undefined}>
            {s.label}
          </button>
        ))}
        <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">발행 준비 중 · 저장 전용</span>
      </div>

      {/* 스토리보드 — HTML 뷰어 (전 언어 공용, 생성은 추후) */}
      {sub === 'storyboard' ? (
        <div className="flex-1 overflow-hidden p-4">
          {storyboardSrc ? (
            <iframe src={storyboardSrc} title="릴스 스토리보드"
              className="h-full w-full rounded-lg border border-gray-200 bg-white" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-center text-gray-400">
              <div className="text-3xl">📋</div>
              <p className="mt-2 text-sm font-semibold text-gray-500">스토리보드 준비 중</p>
              <p className="mt-1 max-w-xs text-xs">이 콘텐츠의 릴스 스토리보드는 아직 없어요. 생성되면 여기에 표시됩니다. (전 언어 공용)</p>
            </div>
          )}
        </div>
      ) : (
        /* 영상 제작 — 언어별 영상 + 카드뉴스 공용 캡션 */
        <div className="flex-1 overflow-y-auto p-4">
          {error && <div className="mb-2 text-[11px] text-red-600">{error}</div>}

          {/* 영상 */}
          <div className="mb-4 rounded-lg border border-gray-200 p-3">
            <div className="mb-2 text-xs font-semibold text-gray-500">🎬 영상 ({label})</div>
            {cur.videoUrl ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video src={cur.videoUrl} controls className="mx-auto max-h-[440px] rounded-lg bg-black" style={{ aspectRatio: '9 / 16' }} />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded bg-gray-700 px-3 py-1 text-xs font-semibold text-white">
                    {uploading ? '업로드 중…' : '영상 교체'}
                    <input type="file" accept="video/*" hidden disabled={uploading}
                      onChange={(e) => { void onVideo(e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  <button type="button" onClick={() => patch({ videoUrl: null })}
                    className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-500 hover:text-red-600">삭제</button>
                  <a href={cur.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-[#4A2D6B] underline">새 탭에서 열기 ↗</a>
                </div>
              </div>
            ) : (
              <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-[#4A2D6B] hover:text-[#4A2D6B]">
                {uploading ? '업로드 중…' : '📹 영상 파일 올리기 (mp4 · 최대 100MB)'}
                <input type="file" accept="video/*" hidden disabled={uploading}
                  onChange={(e) => { void onVideo(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
            )}
          </div>

          {/* 캡션 / 해시태그 — 카드뉴스 단일 소스(읽기 전용) */}
          <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">📝 캡션 · 해시태그 ({label}) · 카드뉴스 공용</span>
              {hasCaption && (
                <button type="button" onClick={copy} className="rounded bg-gray-700 px-2 py-0.5 text-[11px] text-white">{copied ? '✅' : '복사'}</button>
              )}
            </div>
            {hasCaption ? (
              <>
                <p className="mb-2 whitespace-pre-wrap rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700">{caption || '—'}</p>
                <p className="whitespace-pre-wrap rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-500">{hashtags || '—'}</p>
                <p className="mt-2 text-[11px] text-gray-400">✏️ 편집은 <b>카드뉴스 탭</b>에서 (릴스·카드뉴스 공용)</p>
              </>
            ) : (
              <p className="text-[11px] text-gray-400">카드뉴스 탭에서 캡션·해시태그를 먼저 생성하면 여기에 표시됩니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
