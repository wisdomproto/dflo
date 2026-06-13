// 릴 라이트 에디터 오케스트레이터. P1: Player + 청크 스트립 + 시킹 (편집은 P2~).
// 데이터: article.reelScript(웹 소유) / article.reelRuntime(워커 소유, 읽기만).
// 훅은 전부 EditorInner 안에서만 — reelScript null↔non-null 전환 시 훅 개수 불일치 원천 차단.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerRef } from '@remotion/player';
import type { MarketingArticle, ReelLang, ReelScriptDoc } from '../../../types';
import { saveReelScript } from '../../../services/marketingArticleService';
import {
  FALLBACK_CHUNK_FRAMES, chunkDurations, chunkStarts, chunkTtsDirty, totalFrames, updateChunk,
} from '../../../utils/reelEditor';
import type { ReelChunk } from '../../../types';
import PresenterBridge from './PresenterBridge';
import { ChunkStrip } from './ChunkStrip';
import { ChunkInspector } from './ChunkInspector';
import { HeaderCtaForm } from './HeaderCtaForm';
import { useUndoableDoc } from './useUndoableDoc';

interface Props {
  article: MarketingArticle;
  language: string;
  onPatch?: (partial: Partial<MarketingArticle>) => void; // 편집 커밋 시 부모 article 즉시 갱신(stale 방지)
}

export default function ReelEditorPanel({ article, language, onPatch }: Props) {
  const doc = article.reelScript;
  // 빈 상태 — reelScript 없음(미온보딩 콘텐츠 또는 migration 057 미적용)
  if (!doc || (doc.script.chunks?.length ?? 0) === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
        <div className="text-3xl">✂️</div>
        <p className="mt-2 text-sm font-semibold text-gray-500">이 콘텐츠는 에디터 미지원</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed">
          스토리보드 파이프라인으로 생산된 릴스만 편집할 수 있어요. 온보딩:{' '}
          <code className="rounded bg-gray-100 px-1">push-reel-script.mjs</code> 실행 후 다시 열어주세요.
          (migration 057 미적용 시에도 이 화면이 표시됩니다)
        </p>
      </div>
    );
  }
  return <EditorInner article={article} doc0={doc} language={language} onPatch={onPatch} />;
}

function EditorInner({ article, doc0, language, onPatch }: {
  article: MarketingArticle; doc0: ReelScriptDoc; language: string;
  onPatch?: (partial: Partial<MarketingArticle>) => void;
}) {
  const [selected, setSelected] = useState(0);
  const playerRef = useRef<PlayerRef>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 커밋: onPatch 는 즉시(부모 article 갱신 → 페이지 이동 후 stale 방지), 저장만 700ms debounce.
  const handleCommit = useCallback((next: ReelScriptDoc) => {
    onPatch?.({ reelScript: next });
    setSaveState('saving'); setSaveError(null);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveReelScript(article.id, next)
        .then(() => setSaveState('saved'))
        .catch((e) => { setSaveState('error'); setSaveError(e instanceof Error ? e.message : '저장 실패'); });
    }, 700);
  }, [article.id, onPatch]);

  // 언마운트 시 대기 중 저장 타이머 정리
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const { doc, setDoc, reset } = useUndoableDoc<ReelScriptDoc>(doc0, handleCommit);

  // script 서브트리 부분 패치(헤더/CTA) — 불변 갱신 후 setDoc 1회(=undo 1스텝, Player inputProps 즉시 반영).
  const patchScript = useCallback((patch: Partial<ReelScriptDoc['script']>) => {
    setDoc({ ...doc, script: { ...doc.script, ...patch } });
  }, [doc, setDoc]);
  // 선택 청크 부분 패치(자막/하이라이트/인서트/라벨) — updateChunk 경유 불변 패치.
  const patchSelChunk = useCallback((idx: number, patch: Partial<ReelChunk>) => {
    setDoc({ ...doc, script: { ...doc.script, chunks: updateChunk(doc.script.chunks, idx, patch) } });
  }, [doc, setDoc]);

  // 콘텐츠 전환 시 undo 스택 리셋 + 선택 청크 리셋(언어 전환은 같은 doc 라 선택만 리셋)
  useEffect(() => {
    if (article.reelScript) reset(article.reelScript);
    setSelected(0);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [article.id]);
  useEffect(() => { setSelected(0); }, [language]);

  const lang = language as ReelLang;
  const chunks = doc.script.chunks;
  const runtime = article.reelRuntime;
  const timing = runtime?.timing?.[lang];
  const durs = chunkDurations(timing, chunks);
  const starts = chunkStarts(durs);
  const total = totalFrames(durs);
  // Player 용 합성 timing 폴백 — PresenterShort 는 chunks[ctaIdx].durFrames 를 즉시 접근하므로
  // 빈 timing 배열이면 TypeError. 스트립 폭 계산(chunkDurations)과 동일한 110f 균등 가정으로 합성.
  const timingForPlayer = timing && timing.length
    ? timing
    : chunks.map((c) => ({ id: c.id, durFrames: FALLBACK_CHUNK_FRAMES, origStartF: 0, rate: 1 }));
  const preview = runtime?.preview?.[lang];
  const assets = { videoSrc: preview?.lipsyncUrl ?? '', audio: preview?.audio ?? {} };

  const sel = Math.min(selected, chunks.length - 1); // 전환 직후 effect 전 1렌더 out-of-range 가드
  const selChunk = chunks[sel];
  const items = chunks.map((c, i) => ({ id: c.id, durFrames: durs[i], dirty: chunkTtsDirty(c, lang, runtime) }));

  return (
    <div className="space-y-3">
      {/* 저장 상태 한 줄 — onPatch 는 즉시, 영구화는 700ms debounce */}
      <div className="flex items-center justify-end gap-2 text-[11px]">
        {saveState === 'saving' && <span className="text-gray-400">저장 중…</span>}
        {saveState === 'saved' && <span className="text-emerald-600">저장됨 ✓</span>}
        {saveState === 'error' && (
          <span className="text-red-600" title={saveError ?? undefined}>저장 실패 — {saveError ?? '알 수 없는 오류'}</span>
        )}
      </div>

      {/* 제한 모드 배너 — preview(음성·립싱크) 미생성 언어 */}
      {!preview && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
          ⚠️ 이 언어는 음성·영상 미생성 — 미리보기 제한 모드(원장 영상 placeholder · 무음 재생)
          {!timing && ' · 타이밍은 청크당 110프레임 균등 가정'}
        </div>
      )}

      <div className="grid grid-cols-[minmax(280px,420px)_1fr] gap-4">
        {/* 좌: 실시간 미리보기 Player */}
        <PresenterBridge
          ref={playerRef}
          doc={doc}
          timing={timingForPlayer}
          lang={language}
          assets={assets}
          durationInFrames={total}
        />

        {/* 우: 인스펙터 — 헤더/CTA(아코디언) + 선택 청크(자막/하이라이트/인서트/라벨). 편집 → setDoc → Player inputProps 즉시 반영 */}
        <div className="min-w-0 space-y-3">
          <HeaderCtaForm doc={doc} language={lang} onPatchScript={patchScript} />
          <ChunkInspector
            chunk={selChunk}
            chunkIdx={sel}
            language={lang}
            reelAssets={article.reelAssets ?? {}}
            onPatch={(patch) => patchSelChunk(sel, patch)}
          />
          <p className="text-[11px] text-gray-400">
            나레이션 편집·스티커·렌더 요청은 다음 단계에서 열립니다. 라벨 위치는 미리보기 드래그(추가 예정)로 조정해요.
          </p>
        </div>
      </div>

      {/* 하단: 청크 스트립 (길이 비례 폭 · 클릭=시킹) */}
      <ChunkStrip
        items={items}
        selected={sel}
        onSelect={(i) => { setSelected(i); playerRef.current?.seekTo(starts[i]); }}
      />
    </div>
  );
}
