// src/features/marketing/components/ads/AsyncTokenField.tsx
// 디바운스 비동기 검색 + 드롭다운 선택 토큰 필드. 지역·관심사 타게팅 자동완성에 재사용.
// 검색 결과(T)는 부모가 search()로 공급하고, 선택 시 onPick(T)으로 콜백.
import { useEffect, useRef, useState } from 'react';

export function AsyncTokenField<T,>({
  placeholder,
  presets,
  search,
  getKey,
  getLabel,
  getSub,
  onPick,
}: {
  placeholder: string;
  presets?: string[];
  search: (q: string) => Promise<{ results: T[]; error?: string }>;
  getKey: (r: T) => string;
  getLabel: (r: T) => string;
  getSub?: (r: T) => string | undefined;
  onPick: (r: T) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const seq = useRef(0);
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setError(undefined);
      setLoading(false);
      return;
    }
    const my = ++seq.current;
    setLoading(true);
    const h = setTimeout(async () => {
      const r = await searchRef.current(query);
      if (my !== seq.current) return; // stale 응답 무시
      setResults(r.results);
      setError(r.error);
      setLoading(false);
      setOpen(true);
    }, 350);
    return () => clearTimeout(h);
  }, [q]);

  const pick = (r: T) => {
    onPick(r);
    setQ('');
    setResults([]);
    setOpen(false);
  };

  const chip = 'rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:border-gray-300';

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {presets?.map((p) => (
          <button key={p} type="button" onClick={() => setQ(p)} className={chip}>+ {p}</button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="min-w-[140px] flex-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs focus:outline-none"
        />
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-gray-400">검색 중…</div>}
          {!loading && error && <div className="px-3 py-2 text-xs text-red-500">{error}</div>}
          {!loading && !error && results.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">결과 없음</div>}
          {!loading &&
            results.map((r) => (
              <button
                key={getKey(r)}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-[#4A2D6B]/5"
              >
                <span className="text-gray-700">{getLabel(r)}</span>
                {getSub?.(r) && <span className="shrink-0 text-[10px] text-gray-400">{getSub(r)}</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
