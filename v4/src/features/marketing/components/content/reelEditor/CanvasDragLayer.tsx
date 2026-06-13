// 미리보기 Player 위 인서트 라벨 드래그 레이어 — insertLabels 위치를 캔버스에서 직접 이동.
// 좌표계: 라벨 x/y 는 인서트 "패널 존" 분수(캔버스 분수와 다름) → pxToPanelFrac 으로 역변환.
// 드래그 중엔 로컬 state 만 갱신, pointerup 1회만 onCommit(=setDoc 1회=undo 1스텝).
import { useRef, useState } from 'react';
import type { ReelChunk, ReelInsertLabel, ReelLang } from '../../../types';
import { PANEL_H_FRAC, PANEL_TOP_FRAC, pxToPanelFrac, type RectLike } from '../../../utils/reelEditor';

interface Props {
  chunk: ReelChunk;
  language: ReelLang;
  onCommit: (labels: ReelInsertLabel[]) => void;
}

interface DragState { idx: number; labels: ReelInsertLabel[]; rect: RectLike }

export function CanvasDragLayer({ chunk, language, onCommit }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const insert = typeof chunk.insert === 'string' ? chunk.insert : '';
  const committed = Array.isArray(chunk.insertLabels) ? (chunk.insertLabels as ReelInsertLabel[]) : [];
  // 드래그 중엔 로컬 사본(미리보기 즉시 추종), 평소엔 커밋된 doc.
  const labels = drag ? drag.labels : committed;

  // 인서트 없는 청크엔 라벨 좌표계 자체가 무의미 → 레이어 미렌더.
  if (!insert) return null;

  const onPointerDown = (idx: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation(); // 핸들 위 클릭은 Player 컨트롤로 새지 않게
    const layer = layerRef.current;
    if (!layer) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = layer.getBoundingClientRect(); // inset-0 → 캔버스 래퍼와 동일 rect, 드래그 시작 시 1회 캡처
    setDrag({ idx, labels: committed, rect: { left: r.left, top: r.top, width: r.width, height: r.height } });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const { x, y } = pxToPanelFrac(e.clientX, e.clientY, drag.rect);
    setDrag((d) => (d ? { ...d, labels: d.labels.map((l, i) => (i === d.idx ? { ...l, x, y } : l)) } : d));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* 이미 해제됨 */ }
    onCommit(drag.labels); // 단 1회 — undo 1스텝
    setDrag(null);
  };

  return (
    // 레이어는 클릭 투과(Player 컨트롤 보존), 핸들만 pointer-events:auto.
    <div ref={layerRef} className="pointer-events-none absolute inset-0">
      {labels.map((l, i) => {
        const txt = (typeof l[language] === 'string' ? (l[language] as string) : '') || (l.ko ?? '');
        return (
          <div
            key={i}
            onPointerDown={onPointerDown(i)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="pointer-events-auto absolute flex max-w-[60%] cursor-move select-none items-center justify-center rounded border border-dashed border-fuchsia-400/90 bg-fuchsia-500/10 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight text-fuchsia-700"
            style={{
              left: `${l.x * 100}%`,
              top: `${(PANEL_TOP_FRAC + l.y * PANEL_H_FRAC) * 100}%`,
              transform: 'translate(-50%,-50%)',
              touchAction: 'none', // 모바일 스크롤 제스처가 드래그 가로채지 않게
            }}
          >
            {txt || '라벨'}
          </div>
        );
      })}
    </div>
  );
}
