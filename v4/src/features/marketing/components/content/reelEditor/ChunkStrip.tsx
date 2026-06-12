// 하단 청크 스트립 — 길이 비례 폭, 클릭=해당 구간 시킹. 🎙 = 나레이션이 마지막 TTS와 다름(재생성 필요).
const ACCENT = '#4A2D6B';

interface Item { id: string; durFrames: number; dirty: boolean }
interface Props { items: Item[]; selected: number; onSelect: (i: number) => void }

export function ChunkStrip({ items, selected, onSelect }: Props) {
  const total = items.reduce((a, b) => a + b.durFrames, 0) || 1;
  return (
    <div className="flex w-full gap-1">
      {items.map((it, i) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onSelect(i)}
          title={`${it.id} · ${it.durFrames}f (${(it.durFrames / 30).toFixed(1)}초)`}
          style={{ width: `${(it.durFrames / total) * 100}%`, ...(i === selected ? { borderColor: ACCENT, color: ACCENT } : {}) }}
          className={`relative h-12 min-w-0 rounded border bg-white text-[11px] ${
            i === selected ? 'border-2 bg-[#4A2D6B]/5 font-semibold' : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          <span className="block truncate px-1">{it.id}</span>
          {it.dirty && <span className="absolute right-0.5 top-0.5 text-[10px]">🎙</span>}
        </button>
      ))}
    </div>
  );
}
