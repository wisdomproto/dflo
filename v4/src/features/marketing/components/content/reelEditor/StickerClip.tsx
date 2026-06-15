// 타임라인 스티커 칩 — 본체 드래그=이동(fromFrac), 양끝 핸들=트림(좌:오른끝 고정 / 우:왼끝 고정).
// 드래그 중 로컬 state, pointerup 1회 commit(=undo 1스텝). 데드존 4px 미만=클릭(선택).
import { useState } from 'react';
import type { ReelStickerItem } from '../../../types';
import { stickerFracRange, resolveStickerTimeDrag } from '../../../utils/reelEditor';

const DEADZONE = 4; // px

interface Props {
  sticker: ReelStickerItem;
  // 청크의 시간축 위치(분수) — 칩 배치 + 포인터→청크분수 환산용. (chunkIdx는 부모 onCommit 클로저가 가짐 → 불필요)
  chunkLeftFrac: number;
  chunkWidthFrac: number;
  laneWidthPx: () => number;     // 레인 px 폭(환산 분모). ref 게터.
  onSelect: () => void;          // 클릭(데드존 내)
  onCommit: (next: { fromFrac: number; durFrac: number }) => void; // pointerup 1회
}

type Mode = 'move' | 'trim-left' | 'trim-right';
type Drag = { mode: Mode; startX: number; grabOffset: number; moved: boolean; cur: { fromFrac: number; durFrac: number } } | null;

export function StickerClip({ sticker, chunkLeftFrac, chunkWidthFrac, laneWidthPx, onSelect, onCommit }: Props) {
  const [drag, setDrag] = useState<Drag>(null);
  const base = stickerFracRange(sticker); // durFrac null → 정규화
  const view = drag ? drag.cur : base;    // 드래그 중 로컬

  // 칩의 시간축 위치 = 청크 위치 + 청크 내 from/dur 비율
  const leftFrac = chunkLeftFrac + view.fromFrac * chunkWidthFrac;
  const widthFrac = view.durFrac * chunkWidthFrac;

  // 포인터 clientX → 청크 내 분수(0..1). laneW=레인 px, 청크 px범위 = chunkLeftFrac..+chunkWidthFrac.
  const pointerFracInChunk = (clientX: number, rectLeft: number): number => {
    const laneW = laneWidthPx();
    if (laneW <= 0 || chunkWidthFrac <= 0) return 0;
    const fracInLane = (clientX - rectLeft) / laneW;
    return (fracInLane - chunkLeftFrac) / chunkWidthFrac;
  };

  const down = (mode: Mode) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rectLeft = e.currentTarget.closest('[data-lane]')?.getBoundingClientRect().left ?? 0;
    const grabOffset = pointerFracInChunk(e.clientX, rectLeft) - base.fromFrac;
    setDrag({ mode, startX: e.clientX, grabOffset, moved: false, cur: base });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const moved = drag.moved || Math.abs(e.clientX - drag.startX) >= DEADZONE;
    const rectLeft = e.currentTarget.closest('[data-lane]')?.getBoundingClientRect().left ?? 0;
    const p = pointerFracInChunk(e.clientX, rectLeft);
    const cur = resolveStickerTimeDrag(drag.mode, p, base, drag.grabOffset);
    setDrag({ ...drag, moved, cur });
  };
  const up = (e: React.PointerEvent) => {
    if (!drag) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* 해제됨 */ }
    if (drag.moved) onCommit(drag.cur); else onSelect(); // 데드존 내 = 클릭
    setDrag(null);
  };

  return (
    <div
      onPointerDown={down('move')} onPointerMove={move} onPointerUp={up}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-0 h-full cursor-grab overflow-hidden rounded border border-pink-400 bg-pink-50 text-[9px] text-pink-700"
      style={{ left: `${leftFrac * 100}%`, width: `${widthFrac * 100}%`, touchAction: 'none' }}
      title="스티커 — 드래그=이동, 양끝=트림"
    >
      <span className="flex h-full items-center justify-center">✨</span>
      {/* 트림 핸들 — 본체 드래그(move)로 전파 안 되게 stopPropagation */}
      <span onPointerDown={down('trim-left')} onPointerMove={move} onPointerUp={up}
        className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-pink-400/70" style={{ touchAction: 'none' }} />
      <span onPointerDown={down('trim-right')} onPointerMove={move} onPointerUp={up}
        className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-pink-400/70" style={{ touchAction: 'none' }} />
    </div>
  );
}
