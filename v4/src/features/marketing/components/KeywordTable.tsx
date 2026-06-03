// src/features/marketing/components/KeywordTable.tsx
import { useMemo, useState } from 'react';
import keywordsRaw from '../data/keywords.json';
import type { Keyword, Competition } from '../types';

const STATIC_KEYWORDS = keywordsRaw as Keyword[];
type SortKey = 'keyword' | 'pcSearch' | 'mobileSearch' | 'totalSearch';
const COMP_LABEL: Record<Competition, string> = { high: '높음', medium: '중간', low: '낮음' };
const COMP_COLOR: Record<Competition, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
};

export function KeywordTable({ keywords = STATIC_KEYWORDS }: { keywords?: Keyword[] }) {
  const [q, setQ] = useState('');
  const [comp, setComp] = useState<'all' | Competition>('all');
  const [goldenOnly, setGoldenOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('totalSearch');
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    let r = keywords.filter((k) => k.keyword.includes(q));
    if (comp !== 'all') r = r.filter((k) => k.competition === comp);
    if (goldenOnly) r = r.filter((k) => k.isGolden);
    r = [...r].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return asc ? cmp : -cmp;
    });
    return r;
  }, [keywords, q, comp, goldenOnly, sortKey, asc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="키워드 검색"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none"
        />
        {(['all', 'high', 'medium', 'low'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setComp(c)}
            className={`rounded-full px-3 py-1 text-xs ${
              comp === c ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {c === 'all' ? '전체' : COMP_LABEL[c]}
          </button>
        ))}
        <button
          onClick={() => setGoldenOnly((v) => !v)}
          className={`rounded-full px-3 py-1 text-xs ${
            goldenOnly ? 'bg-amber-400 text-amber-900' : 'bg-gray-100 text-gray-600'
          }`}
        >
          ⭐ 골든만
        </button>
        <span className="ml-auto text-xs text-gray-400">{rows.length}개</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200 text-left text-xs text-gray-400">
            <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort('keyword')}>키워드</th>
            <th className="cursor-pointer px-3 py-2 text-right" onClick={() => toggleSort('pcSearch')}>PC</th>
            <th className="cursor-pointer px-3 py-2 text-right" onClick={() => toggleSort('mobileSearch')}>모바일</th>
            <th className="cursor-pointer px-3 py-2 text-right" onClick={() => toggleSort('totalSearch')}>총검색</th>
            <th className="px-3 py-2">경쟁도</th>
            <th className="px-3 py-2">분류</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => (
            <tr key={k.keyword} className={`border-b border-gray-100 ${k.isGolden ? 'bg-amber-50' : ''}`}>
              <td className="px-3 py-2 font-medium text-gray-800">
                {k.isGolden && <span className="mr-1">⭐</span>}
                {k.keyword}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.pcSearch.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.mobileSearch.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{k.totalSearch.toLocaleString()}</td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${COMP_COLOR[k.competition]}`}>
                  {COMP_LABEL[k.competition]}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-gray-500">{k.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-400">결과 없음</p>
      )}
    </div>
  );
}
