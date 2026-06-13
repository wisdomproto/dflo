// src/features/marketing/components/content/CustomReelsPanel.tsx
// 커스텀 콘텐츠(kind='custom', ad-hoc 릴스) 편집기 — 정규 ContentTabs 대신 단일 패널.
// 언어별 [썸네일+영상 한 단위] + 캡션·해시태그 직접 입력(카드뉴스 없음) + 발행 큐.
// 영상 업로드 시 썸네일이 없으면 첫 프레임을 자동 추출해 커버로 올린다.
import { useEffect, useRef, useState } from 'react';
import type { MarketingArticle, ReelsMap, ReelsLangData } from '../../types';
import { saveArticle, saveReelsLang } from '../../services/marketingArticleService';
import { uploadVideoFile, uploadCoverImage } from '../../services/aiImageService';
import { PublishDialog } from './PublishDialog';

const ACCENT = '#4A2D6B';
const LANGS: { code: string; label: string; flag: string }[] = [
  { code: 'ko', label: 'KO', flag: '🇰🇷' },
  { code: 'th', label: 'TH', flag: '🇹🇭' },
  { code: 'vi', label: 'VI', flag: '🇻🇳' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'ch', label: '繁中', flag: '🇹🇼' },
  { code: 'cn', label: '简中', flag: '🇨🇳' },
];
const EMPTY: ReelsLangData = { videoUrl: null, coverUrl: null };

// 영상 첫 프레임(0.1s)을 JPEG File 로 추출 — 업로드한 로컬 파일에서만(원격 URL은 CORS 캔버스 오염).
async function extractFirstFrame(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((res, rej) => {
      video.onloadeddata = () => res();
      video.onerror = () => rej(new Error('영상 로드 실패'));
    });
    video.currentTime = Math.min(0.1, video.duration || 0.1);
    await new Promise<void>((res) => { video.onseeked = () => res(); });
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('썸네일 생성 실패'))), 'image/jpeg', 0.85),
    );
    return new File([blob], 'auto-cover.jpg', { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface Props {
  article: MarketingArticle;
  onSaved: () => void;
  onPatch?: (partial: Partial<MarketingArticle>) => void;
}

export function CustomReelsPanel({ article, onSaved, onPatch }: Props) {
  const [language, setLanguage] = useState('ko');
  const [title, setTitle] = useState(article.title);
  const [reels, setReels] = useState<ReelsMap>(article.reels ?? {});
  const [uploading, setUploading] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [landscape, setLandscape] = useState(false); // 가로 영상 경고 (IG 릴스는 9:16 권장)
  const [showPublish, setShowPublish] = useState(false);
  const reelsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // pending flush: 언어 전환 시 이전 언어의 미발사 저장을 즉시 실행해 유실 방지
  const pendingFlush = useRef<(() => void) | null>(null);

  useEffect(() => {
    setTitle(article.title);
    setReels(article.reels ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  // 언어 전환 시 pending 디바운스를 즉시 flush해 이전 언어 저장 유실 방지
  useEffect(() => {
    return () => {
      if (pendingFlush.current) { pendingFlush.current(); pendingFlush.current = null; }
    };
  }, [language]);

  const cur = reels[language] ?? EMPTY;

  const queueReelsSave = (lang: string, data: ReelsLangData) => {
    if (reelsTimer.current) clearTimeout(reelsTimer.current);
    const flush = () => {
      pendingFlush.current = null;
      void saveReelsLang(article.id, lang, data).catch((e) => setError(e instanceof Error ? e.message : '저장 실패'));
    };
    pendingFlush.current = flush;
    reelsTimer.current = setTimeout(flush, 700);
  };
  const patch = (p: Partial<ReelsLangData>) => {
    const langData: ReelsLangData = { ...cur, ...p };
    const next: ReelsMap = { ...reels, [language]: langData };
    setReels(next);
    onPatch?.({ reels: next });
    queueReelsSave(language, langData);
  };

  const onTitle = (v: string) => {
    setTitle(v);
    onPatch?.({ title: v });
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      // articleToRow 가 전체 필드를 쓰므로 부분 객체가 아니라 전체 article 을 넘겨 다른 필드 보존.
      void saveArticle({ ...article, title: v }).catch((e) => setError(e instanceof Error ? e.message : '제목 저장 실패'));
    }, 700);
  };

  // 영상 업로드 — 썸네일이 없거나 자동 추출본이면 새 영상 첫 프레임으로 (재)추출해 한 단위 유지.
  // 직접 올린 커버(coverAuto=false)만 영상 교체에도 보존.
  const onVideo = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const videoUrl = await uploadVideoFile(file);
      let coverUrl = cur.coverUrl;
      let coverAuto = cur.coverAuto ?? true; // 플래그 없는 기존 데이터는 자동본 취급
      if (!coverUrl || coverAuto) {
        try {
          setCoverBusy(true);
          coverUrl = await uploadCoverImage(await extractFirstFrame(file));
          coverAuto = true;
        } catch {
          // 자동 추출 실패는 치명적이지 않음 — 기존 커버 유지 또는 수동 업로드 안내
        } finally {
          setCoverBusy(false);
        }
      }
      patch({ videoUrl, coverUrl, coverAuto });
    } catch (e) {
      setError(e instanceof Error ? e.message : '영상 업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  const onCover = async (file?: File | null) => {
    if (!file) return;
    setCoverBusy(true);
    setError(null);
    try {
      patch({ coverUrl: await uploadCoverImage(file), coverAuto: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : '커버 업로드 실패');
    } finally {
      setCoverBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* 언어 pill — 🎬 = 그 언어 영상 있음 */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50/60 px-4 py-2">
        <span className="mr-1 text-xs text-gray-400">언어</span>
        <div className="flex overflow-hidden rounded-md border border-gray-200 bg-white">
          {LANGS.map((l) => {
            const active = language === l.code;
            const hasVideo = !!reels[l.code]?.videoUrl;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors ${active ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
                style={active ? { backgroundColor: ACCENT } : undefined}
                title={hasVideo ? '영상 있음' : '영상 없음'}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
                <span className="text-[10px]">{hasVideo ? '🎬' : <span className="opacity-50">—</span>}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 제목 + 발행 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-2.5">
        <span className="shrink-0 text-base">🎨</span>
        <input
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="커스텀 릴스 제목"
          className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1.5 text-sm font-semibold text-gray-800 hover:border-gray-200 focus:border-[#4A2D6B] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShowPublish(true)}
          className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          📥 발행 큐에 넣기
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && <div className="mb-2 text-[11px] text-red-600">{error}</div>}

        {/* 썸네일+영상 — 한 단위 카드 */}
        <div
          className={`rounded-xl border p-4 transition ${dragOver ? 'border-[#4A2D6B] bg-[#4A2D6B]/5 ring-2 ring-[#4A2D6B]/30' : 'border-gray-200'}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (!f) return;
            if (f.type.startsWith('video/')) void onVideo(f);
            else if (f.type.startsWith('image/')) void onCover(f);
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              🎬 릴스 ({LANGS.find((l) => l.code === language)?.flag} {language}) — 썸네일 + 영상 한 단위
            </span>
            <span className="text-[11px] text-gray-400">영상 업로드·교체 시 첫 장면을 썸네일로 자동 사용 (직접 올린 썸네일은 유지)</span>
          </div>

          {cur.videoUrl ? (
            <div className="grid grid-cols-2 gap-3">
              {/* 썸네일 */}
              <div>
                <div className="mb-1.5 text-[11px] font-semibold text-gray-400">🖼️ 썸네일 (커버)</div>
                {cur.coverUrl ? (
                  <div className="space-y-2">
                    {/* 원본 비율 그대로 — 9:16 강제 시 가로 영상이 이중 레터박스로 작게 보임 */}
                    <img src={cur.coverUrl} alt="릴스 썸네일" className="mx-auto max-h-[400px] w-auto rounded-lg" />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer rounded bg-gray-700 px-3 py-1 text-xs font-semibold text-white">
                        {coverBusy ? '처리 중…' : '교체'}
                        <input type="file" accept="image/*" hidden disabled={coverBusy}
                          onChange={(e) => { void onCover(e.target.files?.[0]); e.target.value = ''; }} />
                      </label>
                      <button type="button" onClick={() => patch({ coverUrl: null })}
                        className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-500 hover:text-red-600">삭제</button>
                    </div>
                  </div>
                ) : (
                  <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-center text-xs text-gray-400 hover:border-[#4A2D6B] hover:text-[#4A2D6B]">
                    {coverBusy ? '자동 추출 중…' : '🖼️ 썸네일 올리기 (없으면 영상 첫 장면 자동)'}
                    <input type="file" accept="image/*" hidden disabled={coverBusy}
                      onChange={(e) => { void onCover(e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                )}
              </div>
              {/* 영상 */}
              <div>
                <div className="mb-1.5 text-[11px] font-semibold text-gray-400">📹 영상</div>
                <div className="space-y-2">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    src={cur.videoUrl}
                    controls
                    className="mx-auto max-h-[400px] w-auto rounded-lg"
                    onLoadedMetadata={(e) => setLandscape(e.currentTarget.videoWidth > e.currentTarget.videoHeight)}
                  />
                  {landscape && (
                    <p className="rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                      ⚠️ 가로 영상입니다 — 인스타 릴스는 9:16 세로를 권장합니다. 세로 원본이 있으면 그걸 올려주세요.
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer rounded bg-gray-700 px-3 py-1 text-xs font-semibold text-white">
                      {uploading ? '업로드 중…' : '영상 교체'}
                      <input type="file" accept="video/*" hidden disabled={uploading}
                        onChange={(e) => { void onVideo(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    <button type="button" onClick={() => patch({ videoUrl: null })}
                      className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-500 hover:text-red-600">삭제</button>
                    <a href={cur.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-[#4A2D6B] underline">열기 ↗</a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <label className="flex h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-center text-sm text-gray-400 hover:border-[#4A2D6B] hover:text-[#4A2D6B]">
              {uploading ? (coverBusy ? '썸네일 추출 중…' : '업로드 중…') : '📹 영상 올리기 · 드래그앤드롭 (mp4 · 최대 100MB)'}
              <span className="mt-1 text-[11px]">썸네일이 없으면 첫 장면을 자동으로 사용합니다</span>
              <input type="file" accept="video/*" hidden disabled={uploading}
                onChange={(e) => { void onVideo(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          )}
        </div>

        {/* 캡션 / 해시태그 — 커스텀은 직접 입력 (정규의 카드뉴스 공용과 달리 여기 저장) */}
        <div className="mt-4 rounded-xl border border-gray-200 p-4">
          <div className="mb-2 text-xs font-semibold text-gray-500">📝 캡션 · 해시태그 ({language}) — 발행 시 그대로 사용</div>
          <textarea
            value={cur.caption ?? ''}
            onChange={(e) => patch({ caption: e.target.value })}
            placeholder="발행 캡션을 입력하세요"
            rows={4}
            className="w-full resize-y rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-[#4A2D6B] focus:outline-none"
          />
          <textarea
            value={cur.hashtags ?? ''}
            onChange={(e) => patch({ hashtags: e.target.value })}
            placeholder="#해시태그 #공백구분"
            rows={2}
            className="mt-2 w-full resize-y rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-500 focus:border-[#4A2D6B] focus:outline-none"
          />
        </div>
      </div>

      {showPublish && (
        <PublishDialog
          article={{ ...article, title, reels }}
          contentKind="reels"
          initialLanguage={language}
          onClose={() => setShowPublish(false)}
          onDone={() => { setShowPublish(false); onSaved(); }}
        />
      )}
    </div>
  );
}
