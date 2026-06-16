// 미리보기 Player 위 드래그 레이어 — 인서트 라벨 + 스티커를 캔버스에서 직접 이동/리사이즈.
// 좌표계 2종 (절대 혼용 금지):
//   · 라벨(insertLabels) x/y = 인서트 "패널 존" 분수 → pxToPanelFrac
//   · 스티커(stickers)   x/y = 전체 캔버스(1080×1920) 분수(중심 기준) → pxToCanvasFrac, w=가로폭 분수
// 드래그 중엔 로컬 state 만 갱신, pointerup 1회만 commit(=setDoc 1회=undo 1스텝). 회전은 인스펙터 숫자 input.
import { useRef, useState } from 'react';
import type { ReelChunk, ReelInsertLabel, ReelLang, ReelStickerItem } from '../../../types';
import { PANEL_H_FRAC, PANEL_TOP_FRAC, pxToCanvasFrac, pxToPanelFrac, snapFrac, type RectLike } from '../../../utils/reelEditor';

const STICKER_W_MIN = 0.04;
const STICKER_W_MAX = 0.9;
const clampW = (w: number) => Math.min(STICKER_W_MAX, Math.max(STICKER_W_MIN, w));

interface Props {
  chunk: ReelChunk;
  language: ReelLang;
  selectedIdx: number | null;
  onSelectLabel: (idx: number) => void;
  onCommit: (labels: ReelInsertLabel[]) => void;           // 라벨 위치 커밋
  onCommitStickers: (stickers: ReelStickerItem[]) => void; // 스티커 위치/크기 커밋
}

// 라벨 드래그(본체 이동)와 스티커 드래그(본체 이동 / 코너 리사이즈)를 한 state 로 구분.
type DragState =
  | { type: 'label'; idx: number; labels: ReelInsertLabel[]; rect: RectLike }
  | { type: 'sticker-move' | 'sticker-resize'; idx: number; stickers: ReelStickerItem[]; rect: RectLike };

export function CanvasDragLayer({ chunk, language, selectedIdx, onSelectLabel, onCommit, onCommitStickers }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const insert = typeof chunk.insert === 'string' ? chunk.insert : '';
  const committedLabels = Array.isArray(chunk.insertLabels) ? (chunk.insertLabels as ReelInsertLabel[]) : [];
  const committedStickers = Array.isArray(chunk.stickers) ? (chunk.stickers as ReelStickerItem[]) : [];
  // 드래그 중엔 로컬 사본(미리보기 즉시 추종), 평소엔 커밋된 doc.
  const labels = drag?.type === 'label' ? drag.labels : committedLabels;
  const stickers = drag && drag.type !== 'label' ? drag.stickers : committedStickers;

  // 드래그 시작 시 1회 rect 캡처 (inset-0 → 캔버스 래퍼와 동일 rect).
  const startRect = (e: React.PointerEvent): RectLike | null => {
    const layer = layerRef.current;
    if (!layer) return null;
    e.preventDefault();
    e.stopPropagation(); // 핸들 위 클릭은 Player 컨트롤로 새지 않게
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = layer.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  };

  // ── 라벨 ──────────────────────────────────────────────────────────────────
  const onLabelDown = (idx: number) => (e: React.PointerEvent) => {
    onSelectLabel(idx);
    const rect = startRect(e);
    if (rect) setDrag({ type: 'label', idx, labels: committedLabels, rect });
  };

  // ── 스티커 ────────────────────────────────────────────────────────────────
  const onStickerDown = (idx: number) => (e: React.PointerEvent) => {
    const rect = startRect(e);
    if (rect) setDrag({ type: 'sticker-move', idx, stickers: committedStickers, rect });
  };
  const onStickerResizeDown = (idx: number) => (e: React.PointerEvent) => {
    const rect = startRect(e);
    if (rect) setDrag({ type: 'sticker-resize', idx, stickers: committedStickers, rect });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    if (drag.type === 'label') {
      const raw = pxToPanelFrac(e.clientX, e.clientY, drag.rect);
      const x = snapFrac(raw.x), y = snapFrac(raw.y);
      setDrag((d) => (d && d.type === 'label'
        ? { ...d, labels: d.labels.map((l, i) => (i === d.idx ? { ...l, x, y } : l)) }
        : d));
      return;
    }
    if (drag.type === 'sticker-move') {
      const { x, y } = pxToCanvasFrac(e.clientX, e.clientY, drag.rect);
      setDrag((d) => (d && d.type === 'sticker-move'
        ? { ...d, stickers: d.stickers.map((s, i) => (i === d.idx ? { ...s, x, y } : s)) }
        : d));
      return;
    }
    // sticker-resize: 코너 핸들 — 중심 기준 반폭 × 2 = 가로폭 분수.
    setDrag((d) => {
      if (!d || d.type !== 'sticker-resize') return d;
      const cur = d.stickers[d.idx];
      const centerX = d.rect.left + cur.x * d.rect.width;
      const w = clampW(((e.clientX - centerX) * 2) / d.rect.width);
      return { ...d, stickers: d.stickers.map((s, i) => (i === d.idx ? { ...s, w } : s)) };
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* 이미 해제됨 */ }
    if (drag.type === 'label') onCommit(drag.labels); // 단 1회 — undo 1스텝
    else onCommitStickers(drag.stickers);
    setDrag(null);
  };

  // 인서트도 스티커도 없으면 레이어 자체가 무의미.
  if (!insert && stickers.length === 0) return null;

  return (
    // 레이어는 클릭 투과(Player 컨트롤 보존), 핸들만 pointer-events:auto.
    <div ref={layerRef} className="pointer-events-none absolute inset-0">
      {/* 라벨 — 인서트 패널 존 좌표계.
          실제 라벨 텍스트는 Player(PresenterShort)가 이미 같은 좌표에 WYSIWYG 렌더 → 핸들은 드래그 외곽선만(텍스트 투명)
          으로 이중 표시 방지. 빈 라벨(렌더 안 됨)만 '라벨' 플레이스홀더를 보여 잡을 수 있게 함. */}
      {insert && labels.map((l, i) => {
        const txt = (typeof l[language] === 'string' ? (l[language] as string) : '') || (l.ko ?? '');
        return (
          <div
            key={'l' + i}
            onPointerDown={onLabelDown(i)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={
              'pointer-events-auto absolute flex max-w-[60%] cursor-move select-none items-center justify-center rounded px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight ' +
              (i === selectedIdx
                ? 'border-2 border-cyan-400 bg-cyan-400/20'
                : 'border border-dashed border-fuchsia-400/90 bg-fuchsia-500/5')
            }
            style={{
              left: `${l.x * 100}%`,
              top: `${(PANEL_TOP_FRAC + l.y * PANEL_H_FRAC) * 100}%`,
              transform: 'translate(-50%,-50%)',
              color: txt ? 'transparent' : '#a21caf', // 실제 라벨 있으면 핸들 텍스트 숨김(이중 방지), 빈 라벨만 표시
              touchAction: 'none', // 모바일 스크롤 제스처가 드래그 가로채지 않게
            }}
          >
            {txt || '라벨'}
          </div>
        );
      })}

      {/* 스티커 — 전체 캔버스 좌표계(중심 기준). 본체=이동, 우하단 코너=가로폭. */}
      {stickers.map((s, i) => (
        <div
          key={'s' + s.id}
          onPointerDown={onStickerDown(i)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="pointer-events-auto absolute cursor-move select-none rounded border border-dashed border-sky-400/90 bg-sky-500/10"
          style={{
            left: `${s.x * 100}%`,
            top: `${s.y * 100}%`,
            width: `${s.w * 100}%`,
            aspectRatio: '1 / 1', // 핸들 박스는 정사각 가이드(실제 스티커는 비율 유지 — 위치/폭만 편집)
            transform: `translate(-50%,-50%) rotate(${s.rot}deg)`,
            touchAction: 'none',
          }}
        >
          {/* 우하단 코너 리사이즈 핸들 */}
          <div
            onPointerDown={onStickerResizeDown(i)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-full border border-white bg-sky-500 shadow"
            style={{ touchAction: 'none' }}
          />
        </div>
      ))}
    </div>
  );
}
