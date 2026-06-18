// 릴 라이트 에디터 오케스트레이터. P1: Player + 청크 스트립 + 시킹 (편집은 P2~).
// 데이터: article.reelScript(웹 소유) / article.reelRuntime(워커 소유, 읽기만).
// 훅은 전부 EditorInner 안에서만 — reelScript null↔non-null 전환 시 훅 개수 불일치 원천 차단.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PlayerRef } from '@remotion/player';
import type { MarketingArticle, ReelLang, ReelScriptDoc } from '../../../types';
import { saveReelScript } from '../../../services/marketingArticleService';
import {
  FALLBACK_CHUNK_FRAMES, chunkDurations, chunkIndexAtFrame, chunkStarts, totalFrames, updateChunk, nudgeLabel,
} from '../../../utils/reelEditor';
import type { ReelChunk, ReelInsertLabel } from '../../../types';
import PresenterBridge from './PresenterBridge';
import { CanvasDragLayer } from './CanvasDragLayer';
import { ReelTimeline } from './ReelTimeline';
import { ChunkInspector } from './ChunkInspector';
import { HeaderCtaForm } from './HeaderCtaForm';
import { RenderJobWidget } from './RenderJobWidget';
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
  const [selectedLabelIdx, setSelectedLabelIdx] = useState<number | null>(null);
  // Player 인스턴스를 state 로 — 전체화면 포털 토글 시 Player 가 재마운트(ref 교체)되는데,
  // 플레이헤드 구독·선택 추종 effect 가 재구독되려면 의존성이 ref 가 아니라 인스턴스여야 한다.
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const onPlayerRef = useCallback((p: PlayerRef | null) => setPlayer(p), []);
  const [fullscreen, setFullscreen] = useState(false);
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
  useEffect(() => { setSelectedLabelIdx(null); }, [selected, language, article.id]);

  const lang = language as ReelLang;
  const chunks = doc.script.chunks;
  const runtime = article.reelRuntime;
  const timing = runtime?.timing?.[lang];
  const durs = chunkDurations(timing, chunks);
  const starts = chunkStarts(durs);
  const total = totalFrames(durs);
  // Player 용 합성 timing 폴백 — PresenterShort 는 chunks[ctaIdx].durFrames 를 즉시 접근하므로
  // 빈 timing 배열이면 TypeError. 스트립 폭 계산(chunkDurations)과 동일한 110f 균등 가정으로 합성.
  // useMemo — 재생 중 setSelected 로 리렌더돼도 Player inputProps(timing/assets) 정체성 유지(재생 끊김 방지).
  const timingForPlayer = useMemo(() => (timing && timing.length
    ? timing
    : chunks.map((c) => ({ id: c.id, durFrames: FALLBACK_CHUNK_FRAMES, origStartF: 0, rate: 1 }))), [timing, chunks]);
  const preview = runtime?.preview?.[lang];
  const assets = useMemo(() => ({ videoSrc: preview?.lipsyncUrl ?? '', audio: preview?.audio ?? {} }), [preview]);

  // 재생/시킹 중 플레이헤드가 청크 경계를 넘으면 선택을 그 청크로 — 캔버스 핸들·인스펙터가 현재 씬을 따라감(캡컷식).
  // starts 는 매 렌더 새 배열이라 ref 로 최신값만 읽고, 구독은 player 인스턴스당 1회(포털 재마운트 시 재구독).
  const startsRef = useRef(starts);
  startsRef.current = starts;
  useEffect(() => {
    if (!player) return;
    let last = -1;
    const onFrame = (e: { detail: { frame: number } }) => {
      const idx = chunkIndexAtFrame(startsRef.current, e.detail.frame);
      if (idx !== last) { last = idx; setSelected(idx); }
    };
    player.addEventListener('frameupdate', onFrame);
    return () => player.removeEventListener('frameupdate', onFrame);
  }, [player]);

  // 전체화면: Esc 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [fullscreen]);

  const sel = Math.min(selected, chunks.length - 1); // 전환 직후 effect 전 1렌더 out-of-range 가드
  const selChunk = chunks[sel];

  useEffect(() => {
    const NUDGE: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      if (e.key === 'Escape') { setSelectedLabelIdx(null); return; }
      if (selectedLabelIdx == null) return;
      const d = NUDGE[e.key];
      if (!d) return;
      const labels = Array.isArray(selChunk.insertLabels) ? (selChunk.insertLabels as ReelInsertLabel[]) : [];
      if (selectedLabelIdx >= labels.length) return;
      e.preventDefault();
      const next = labels.map((l, i) => (i === selectedLabelIdx ? nudgeLabel(l, lang, d[0], d[1]) : l));
      patchSelChunk(sel, { insertLabels: next });
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectedLabelIdx, selChunk, sel, lang, patchSelChunk]);

  // 저장 상태 한 줄 (normal=상단 우측 / fullscreen=헤더)
  const saveStatus = (
    <span className="text-[11px]">
      {saveState === 'saving' && <span className="text-gray-400">저장 중…</span>}
      {saveState === 'saved' && <span className="text-emerald-600">저장됨 ✓</span>}
      {saveState === 'error' && (
        <span className="text-red-600" title={saveError ?? undefined}>저장 실패 — {saveError ?? '알 수 없는 오류'}</span>
      )}
    </span>
  );

  // 제한 모드 배너 — preview(음성·립싱크) 미생성 언어
  const limitedBanner = !preview ? (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
      ⚠️ 이 언어는 음성·영상 미생성 — 미리보기 제한 모드(원장 영상 placeholder · 무음 재생)
      {!timing && ' · 타이밍은 청크당 110프레임 균등 가정'}
    </div>
  ) : null;

  // 프리뷰(Player + 라벨/스티커 드래그 레이어) — 부모가 9:16 박스 소유(폭/높이 기준은 레이아웃이 결정).
  const previewBox = (
    <>
      <PresenterBridge ref={onPlayerRef} doc={doc} timing={timingForPlayer} lang={language} assets={assets} durationInFrames={total} />
      <CanvasDragLayer
        chunk={selChunk}
        language={lang}
        selectedIdx={selectedLabelIdx}
        onSelectLabel={setSelectedLabelIdx}
        onCommit={(insertLabels) => patchSelChunk(sel, { insertLabels })}
        onCommitStickers={(stickers) => patchSelChunk(sel, { stickers })}
      />
    </>
  );

  // 인스펙터 — 헤더/CTA + 선택 청크(자막/하이라이트/인서트/라벨/스티커)
  const inspectorBlock = (
    <>
      <HeaderCtaForm doc={doc} language={lang} onPatchScript={patchScript} />
      <ChunkInspector
        chunk={selChunk}
        chunkIdx={sel}
        chunkCount={chunks.length}
        language={lang}
        reelAssets={article.reelAssets ?? {}}
        runtime={runtime}
        selectedLabelIdx={selectedLabelIdx}
        onSelectLabel={setSelectedLabelIdx}
        onPatch={(patch) => patchSelChunk(sel, patch)}
      />
      <RenderJobWidget article={article} language={language} doc={doc} runtime={runtime} onPatch={onPatch} />
    </>
  );

  // 멀티트랙 타임라인 (영상/자막/인서트/라벨/스티커/오디오 · 클릭=선택+시킹 · 플레이헤드)
  const timelineBlock = (
    <ReelTimeline
      player={player}
      chunks={chunks}
      durs={durs}
      starts={starts}
      total={total}
      selected={sel}
      onSelectChunk={(i) => setSelected(i)}
      language={lang}
      runtime={runtime}
      hasPreview={!!preview}
      onCommitStickers={(i, stickers) => patchSelChunk(i, { stickers })}
    />
  );

  const helpLine = <p className="text-[11px] text-gray-400">라벨·스티커 위치는 미리보기 위에서 드래그해 조정해요.</p>;

  // ── 전체화면: createPortal→body 풀뷰포트 (헤더 / 프리뷰|인스펙터 / 타임라인). 인스펙터만 내부 스크롤 ──
  if (fullscreen) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex flex-col bg-gray-100">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
          <div className="flex min-w-0 items-center gap-3 text-sm">
            <span className="whitespace-nowrap font-semibold text-gray-800">✂️ 릴 에디터</span>
            <span className="truncate text-gray-400">{article.title ?? ''} · {lang.toUpperCase()}</span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            {saveStatus}
            <button type="button" onClick={() => setFullscreen(false)}
              className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              ✕ 닫기 (Esc)
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          {/* 좌: 프리뷰 — 높이 기준 9:16 박스 */}
          <div className="flex flex-shrink-0 items-center justify-center p-3" style={{ height: '100%' }}>
            <div className="relative" style={{ height: '100%', aspectRatio: '9 / 16' }}>{previewBox}</div>
          </div>
          {/* 우: 인스펙터 — 내부 스크롤(프리뷰·타임라인은 항상 보이게) */}
          <div className="min-w-0 flex-1 space-y-3 overflow-y-auto border-l border-gray-200 bg-white p-3">
            {limitedBanner}
            {inspectorBlock}
            {helpLine}
          </div>
        </div>
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-3 py-2">{timelineBlock}</div>
      </div>,
      document.body,
    );
  }

  // ── 일반(인라인) ──
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        {saveStatus}
        <button type="button" onClick={() => setFullscreen(true)}
          className="rounded-md border border-gray-300 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">
          ⛶ 전체화면
        </button>
      </div>
      {limitedBanner}
      <div className="grid grid-cols-[minmax(280px,420px)_1fr] gap-4">
        {/* 좌: 프리뷰 — 폭 기준 9:16 박스 + 드래그 레이어(inset-0, 좌표 환산 동일 rect) */}
        <div className="relative w-full self-start" style={{ aspectRatio: '9 / 16' }}>{previewBox}</div>
        {/* 우: 인스펙터 */}
        <div className="min-w-0 space-y-3">
          {inspectorBlock}
          {helpLine}
        </div>
      </div>
      {timelineBlock}
    </div>
  );
}
