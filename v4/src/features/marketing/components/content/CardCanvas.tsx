// src/features/marketing/components/content/CardCanvas.tsx
import { useRef, useState } from 'react';
import type { CardCanvasData, TextBlock } from '../../types';

interface Props {
  canvas: CardCanvasData;
  onChange: (next: CardCanvasData) => void;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function CardCanvas({ canvas, onChange }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const updateBlocks = (blocks: TextBlock[]) => onChange({ ...canvas, textBlocks: blocks });

  const patchBlock = (id: string, patch: Partial<TextBlock>) =>
    updateBlocks(canvas.textBlocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const handlePointerDown = (e: React.PointerEvent, block: TextBlock) => {
    if (editingId === block.id) return; // don't drag while editing
    e.stopPropagation();
    setSelectedId(block.id);
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { id: block.id, startX: e.clientX, startY: e.clientY, origX: block.x, origY: block.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const dx = ((e.clientX - d.startX) / rect.width) * 100;
    const dy = ((e.clientY - d.startY) / rect.height) * 100;
    patchBlock(d.id, { x: clamp(d.origX + dx, 0, 100), y: clamp(d.origY + dy, 0, 100) });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    dragRef.current = null;
  };

  const addBlock = () => {
    const nb: TextBlock = {
      id: crypto.randomUUID(),
      text: '새 텍스트',
      x: 10,
      y: 10,
      fontSize: 24,
      color: '#111111',
      fontWeight: 'normal',
      textAlign: 'left',
      width: 80,
    };
    updateBlocks([...canvas.textBlocks, nb]);
    setSelectedId(nb.id);
  };

  const deleteBlock = (id: string) => {
    updateBlocks(canvas.textBlocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) setEditingId(null);
  };

  const selected = canvas.textBlocks.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* Canvas */}
      <div
        ref={boxRef}
        className="aspect-[4/5] w-full max-w-[400px] relative overflow-hidden rounded-lg select-none"
        style={{ backgroundColor: canvas.bgColor }}
        onPointerDown={() => setSelectedId(null)}
      >
        {canvas.imageUrl && (
          <img
            src={canvas.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: '50% ' + canvas.imageY + '%' }}
            draggable={false}
          />
        )}

        {canvas.textBlocks
          .filter((b) => !b.hidden)
          .map((block) => {
            const isSelected = selectedId === block.id;
            const isEditing = editingId === block.id;
            return (
              <div
                key={block.id}
                className={`absolute cursor-move px-1 ${isSelected ? 'ring-2 ring-[#4A2D6B] rounded' : ''}`}
                style={{ left: `${block.x}%`, top: `${block.y}%`, width: `${block.width}%` }}
                onPointerDown={(e) => handlePointerDown(e, block)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(block.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingId(block.id);
                  setSelectedId(block.id);
                }}
              >
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={block.text}
                    onChange={(e) => patchBlock(block.id, { text: e.target.value })}
                    onBlur={() => setEditingId(null)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-full bg-white/90 text-black rounded resize-none outline-none p-1"
                    style={{ fontSize: `${block.fontSize}px`, textAlign: block.textAlign }}
                    rows={2}
                  />
                ) : (
                  <div
                    className="whitespace-pre-wrap break-words leading-tight"
                    style={{
                      fontSize: `${block.fontSize}px`,
                      color: block.color,
                      fontWeight: block.fontWeight,
                      textAlign: block.textAlign,
                      fontFamily: block.fontFamily ? `"${block.fontFamily}", sans-serif` : undefined,
                      textShadow: block.shadow ? '0 1px 4px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.3)' : undefined,
                    }}
                  >
                    {block.text || ' '}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addBlock}
          className="h-7 px-2 text-xs rounded border border-[#4A2D6B] text-[#4A2D6B] hover:bg-[#4A2D6B]/10"
        >
          + 텍스트 추가
        </button>

        {selected && (
          <>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500">크기</span>
              <input
                type="number"
                min={8}
                max={120}
                value={selected.fontSize}
                onChange={(e) => patchBlock(selected.id, { fontSize: clamp(parseInt(e.target.value) || 24, 8, 120) })}
                className="w-12 h-7 text-xs text-center border border-gray-300 rounded"
              />
            </div>
            <input
              type="color"
              value={selected.color}
              onChange={(e) => patchBlock(selected.id, { color: e.target.value })}
              className="w-7 h-7 rounded border border-gray-300 cursor-pointer p-0"
            />
            <button
              type="button"
              onClick={() => patchBlock(selected.id, { fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold' })}
              className={`h-7 w-7 text-xs font-bold rounded border ${
                selected.fontWeight === 'bold' ? 'border-[#4A2D6B] bg-[#4A2D6B]/10 text-[#4A2D6B]' : 'border-gray-300'
              }`}
            >
              B
            </button>
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => patchBlock(selected.id, { textAlign: a })}
                className={`h-7 px-2 text-[10px] rounded border ${
                  selected.textAlign === a ? 'border-[#4A2D6B] bg-[#4A2D6B]/10 text-[#4A2D6B]' : 'border-gray-300'
                }`}
              >
                {a === 'left' ? '왼쪽' : a === 'center' ? '가운데' : '오른쪽'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => deleteBlock(selected.id)}
              className="h-7 px-2 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50"
            >
              삭제
            </button>
          </>
        )}
      </div>
    </div>
  );
}
