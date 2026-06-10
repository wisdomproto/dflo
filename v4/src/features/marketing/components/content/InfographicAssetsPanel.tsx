// src/features/marketing/components/content/InfographicAssetsPanel.tsx
// 릴스 인포그래픽 이미지(언어공용) 업로드 — 스토리보드 spec의 인포그래픽 목록에서 슬롯 자동 생성.
//  - 이미지는 텍스트 없이(NO text) 외부에서 생성 → 업로드. 텍스트는 렌더가 언어별로 얹음.
//  - 저장: marketing_articles.reel_assets.infographics[igKey] (migration 050), 전 언어 공용.
import { useEffect, useRef, useState } from 'react';
import type { MarketingArticle, ReelAssets } from '../../types';
import { saveReelAssets } from '../../services/marketingArticleService';
import { uploadInfographicImage } from '../../services/aiImageService';
import { ImageDropzone } from './ImageDropzone';

const ACCENT = '#4A2D6B';

interface IgLabel { pos?: string; ko?: string; en?: string; th?: string; [k: string]: string | undefined }
interface IgDef { ig: number | string; scene: string; title: string; motion: string; emojis: string[]; prompt: string; labels: IgLabel[] }

// /storyboards/infographics.json = { [n]: IgDef[] } — build.mjs 가 spec 에서 추출. 1회 로드 후 캐시.
let _igManifest: Promise<Record<string, IgDef[]>> | null = null;
function loadInfographicManifest(): Promise<Record<string, IgDef[]>> {
  if (!_igManifest) {
    _igManifest = fetch('/storyboards/infographics.json')
      .then((r) => (r.ok ? (r.json() as Promise<Record<string, IgDef[]>>) : {}))
      .catch(() => ({} as Record<string, IgDef[]>));
  }
  return _igManifest;
}

const igKey = (ig: number | string) => `ig${ig}`;
const labelText = (l: IgLabel) => [l.ko, l.en, l.th].filter(Boolean).join(' / ');
// 인포그래픽은 렌더의 1080×1080 정사각형 인서트 패널에 들어감 → 1:1 정사각형. 복사 시 프롬프트에 자동 첨부.
const SIZE_SPEC = 'Output: 1:1 square image, 1024×1024 (high-res), white background, NO text.';

export function InfographicAssetsPanel({ article, onPatch }: { article: MarketingArticle; onPatch?: (partial: Partial<MarketingArticle>) => void }) {
  const [defs, setDefs] = useState<IgDef[] | null>(null);
  const [assets, setAssets] = useState<ReelAssets>(article.reelAssets ?? {});
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // 항상 최신 assets 참조 — 빠른 연속 업로드 시 stale 클로저가 서로 덮어쓰는 것 방지.
  const assetsRef = useRef(assets);
  assetsRef.current = assets;

  useEffect(() => {
    let alive = true;
    void loadInfographicManifest().then((m) => { if (alive) setDefs(m[String(article.sortOrder)] ?? []); });
    return () => { alive = false; };
  }, [article.sortOrder]);

  // article.reelAssets 가 바뀌면 동기화(새로고침·콘텐츠 전환 시 DB값 반영).
  // 우리 저장(saveReelAssets)은 부모 article 을 안 바꾸므로 이 effect 가 재실행되지 않아 낙관적 업데이트는 보존됨.
  useEffect(() => {
    setAssets(article.reelAssets ?? {});
    setErr(null);
  }, [article.id, article.reelAssets]);

  const imgs = assets.infographics ?? {};

  const setImg = (key: string, url: string | null) => {
    const cur = assetsRef.current;
    const nextImgs = { ...(cur.infographics ?? {}) };
    if (url) nextImgs[key] = url; else delete nextImgs[key];
    const next: ReelAssets = { ...cur, infographics: nextImgs };
    assetsRef.current = next;
    setAssets(next);
    onPatch?.({ reelAssets: next }); // 부모 article 도 즉시 갱신 → 페이지 이동 후에도 stale 안 됨
    void saveReelAssets(article.id, next).catch((e) => setErr(e instanceof Error ? e.message : '저장 실패'));
  };

  const copyPrompt = (key: string, prompt: string) => {
    void navigator.clipboard.writeText(`${prompt}\n${SIZE_SPEC}`).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1200); });
  };

  // 이 콘텐츠의 모든 인포그래픽 프롬프트를 IG번호·제목·사이즈와 함께 한 번에 복사 (외부 GPT 배치 생성용).
  const copyAllPrompts = () => {
    const text = (defs ?? []).map((g) => `[IG${g.ig}] ${g.title}\n${g.prompt}\n${SIZE_SPEC}`).join('\n\n');
    void navigator.clipboard.writeText(text).then(() => { setCopied('__all__'); setTimeout(() => setCopied(null), 1500); });
  };

  if (defs === null) return <div className="p-4 text-sm text-gray-400">불러오는 중…</div>;
  if (defs.length === 0) return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center text-gray-400">
      <div className="text-2xl">🖼️</div>
      <p className="mt-2 text-sm font-semibold text-gray-500">인포그래픽 없음</p>
      <p className="mt-1 max-w-[14rem] text-xs">이 콘텐츠 스토리보드에 인포그래픽이 정의돼 있지 않아요.</p>
    </div>
  );

  const doneCount = defs.filter((g) => imgs[igKey(g.ig)]).length;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-gray-200 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700">🖼️ 인포그래픽 이미지 · 언어 공용</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{doneCount}/{defs.length}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-gray-400">텍스트 없이(NO text)·정사각형 1:1(1024×1024)로 생성 → 업로드. 텍스트는 영상이 언어별로 얹습니다.</p>
        <button type="button" onClick={copyAllPrompts}
          className="mt-1.5 w-full rounded px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90"
          style={{ backgroundColor: ACCENT }}>
          {copied === '__all__' ? '✅ 전체 프롬프트 복사됨' : `📋 프롬프트 ${defs.length}개 한번에 복사`}
        </button>
      </div>
      {err && <div className="px-3 py-1 text-[11px] text-red-600">{err}</div>}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {defs.map((g) => {
          const key = igKey(g.ig);
          const url = imgs[key] ?? null;
          return (
            <div key={key} className="rounded-lg border border-gray-200 p-2.5">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-gray-700">
                <span className="rounded px-1.5 py-0.5 text-[10px] text-white" style={{ backgroundColor: ACCENT }}>IG{g.ig}</span>
                <span>{g.title}</span>
                <span className="text-[10px] font-normal text-gray-400">{g.scene} · {g.motion}</span>
              </div>
              <div className="mt-2 flex gap-2.5">
                {/* 미리보기 / 업로드 — 드래그앤드롭 + 클릭 후 Ctrl+V 붙여넣기 (파일선택 없음) */}
                <div className="w-32 shrink-0">
                  <ImageDropzone
                    url={url}
                    alt={key}
                    aspectRatio="1 / 1"
                    upload={uploadInfographicImage}
                    showFilePicker={false}
                    placeholder="🖼 드롭 / 붙여넣기"
                    onUploaded={(u) => setImg(key, u)}
                    onClear={() => setImg(key, null)}
                  />
                </div>
                {/* 프롬프트 + 라벨 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-4 text-[11px] leading-snug text-gray-500">{g.prompt}</p>
                    <button type="button" onClick={() => copyPrompt(key, g.prompt)} title="프롬프트 복사"
                      className="shrink-0 rounded bg-gray-700 px-2 py-0.5 text-[10px] text-white">{copied === key ? '✅' : '📋'}</button>
                  </div>
                  {g.labels.length > 0 && (
                    <p className="mt-1.5 text-[10px] leading-snug text-gray-400">↳ 얹힐 텍스트: {g.labels.map(labelText).filter(Boolean).join(' · ')}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
