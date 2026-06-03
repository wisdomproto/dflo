// src/features/marketing/components/GoldenKeywordTab.tsx
// 🏆 황금 키워드 탭. props로 받은 Keyword[](IdeasPage merged)에서 goldenScore 파생 →
// 등급(🏆/🥇/🥈) 칩 필터 + 점수/총검색/경쟁도 정렬 테이블. 100% 클라이언트, 외부 키 0.
import { useMemo, useState } from 'react';
import type { Keyword, Competition } from '../types';
import { rankGolden, type GoldenTier } from '../utils/goldenScore';

type SortKey = 'goldenScore' | 'totalSearch' | 'keyword';

const COMP_LABEL: Record<Competition, string> = { high: '높음', medium: '중간', low: '낮음' };
const COMP_COLOR: Record<Competition, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
};

const TIER_META: Record<GoldenTier, { icon: string; label: string; chip: string }> = {
  gold: { icon: '🏆', label: '황금', chip: 'bg-amber-400 text-amber-900' },
  silver: { icon: '🥈', label: '유망', chip: 'bg-slate-200 text-slate-700' },
  bronze: { icon: '🥉', label: '일반', chip: 'bg-orange-100 text-orange-700' },
};
const TIER_ORDER: GoldenTier[] = ['gold', 'silver', 'bronze'];

export function GoldenKeywordTab({
  keywords,
  onSeedToIdeas,
}: {
  keywords: Keyword[];
  onSeedToIdeas: (keyword: string) => void;
}) {
  const [tier, setTier] = useState<'all' | GoldenTier>('all');
  const [sortKey, setSortKey] = useState<SortKey>('goldenScore');
  const [asc, setAsc] = useState(false);

  const ranked = useMemo(() => rankGolden(keywords), [keywords]);
  const counts = useMemo(() => {
    const c: Record<GoldenTier, number> = { gold: 0, silver: 0, bronze: 0 };
    ranked.forEach((k) => (c[k.tier] += 1));
    return c;
  }, [ranked]);

  const rows = useMemo(() => {
    let r = tier === 'all' ? ranked : ranked.filter((k) => k.tier === tier);
    r = [...r].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return asc ? cmp : -cmp;
    });
    return r;
  }, [ranked, tier, sortKey, asc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(false);
    }
  };

  return (
    <div className="p-6">
      <p className="mb-3 text-xs text-gray-400">
        보관함 + 정적 키워드에서 검색량·경쟁도로 점수화한 황금 키워드입니다. 보관함에 키워드를 추가할수록
        풀이 커집니다.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTier('all')}
          className={`rounded-full px-3 py-1 text-xs ${
            tier === 'all' ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          전체 ({ranked.length})
        </button>
        {TIER_ORDER.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTier(t)}
            className={`rounded-full px-3 py-1 text-xs ${
              tier === t ? TIER_META[t].chip : 'bg-gray-100 text-gray-600'
            }`}
          >
            {TIER_META[t].icon} {TIER_META[t].label} ({counts[t]})
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{rows.length}개</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200 text-left text-xs text-gray-400">
            <th className="px-3 py-2">등급</th>
            <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort('keyword')}>
              키워드
            </th>
            <th className="cursor-pointer px-3 py-2 text-right" onClick={() => toggleSort('goldenScore')}>
              점수
            </th>
            <th className="cursor-pointer px-3 py-2 text-right" onClick={() => toggleSort('totalSearch')}>
              총검색
            </th>
            <th className="px-3 py-2">경쟁도</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => (
            <tr
              key={k.keyword}
              className={`border-b border-gray-100 ${k.tier === 'gold' ? 'bg-amber-50' : ''}`}
            >
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${TIER_META[k.tier].chip}`}>
                  {TIER_META[k.tier].icon} {TIER_META[k.tier].label}
                </span>
              </td>
              <td className="px-3 py-2 font-medium text-gray-800">{k.keyword}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                {k.goldenScore.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                {k.totalSearch.toLocaleString()}
              </td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${COMP_COLOR[k.competition]}`}>
                  {COMP_LABEL[k.competition]}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onSeedToIdeas(k.keyword)}
                  className="rounded bg-[#4A2D6B]/10 px-2 py-0.5 text-xs font-medium text-[#4A2D6B] hover:bg-[#4A2D6B]/20"
                >
                  ✨ 이 키워드로 아이디어
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="py-12 text-center text-sm text-gray-400">결과 없음</p>}
    </div>
  );
}
