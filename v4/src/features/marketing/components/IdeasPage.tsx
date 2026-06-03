// src/features/marketing/components/IdeasPage.tsx
import { useEffect, useMemo, useState } from 'react';
import keywordsRaw from '../data/keywords.json';
import type { Keyword, Competition, SavedKeyword } from '../types';
import { fetchPins } from '../services/marketingKeywordService';
import { KeywordAnalysisTab } from './KeywordAnalysisTab';
import { KeywordTable } from './KeywordTable';

const STATIC = keywordsRaw as Keyword[];

function normComp(c: string): Competition {
  const u = c.toUpperCase();
  if (u.includes('HIGH') || c === '높음') return 'high';
  if (u.includes('LOW') || c === '낮음') return 'low';
  return 'medium';
}

function savedToKeyword(s: SavedKeyword): Keyword {
  return {
    keyword: s.keyword,
    pcSearch: s.pcSearch,
    mobileSearch: s.mobileSearch,
    totalSearch: s.totalSearch,
    competition: normComp(s.competition),
    category: s.source,
    isGolden: false,
  };
}

const TABS = [
  { id: 'naver', label: '🟢 네이버 분석' },
  { id: 'google', label: '🔵 구글 분석' },
  { id: 'pins', label: '📁 보관함' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function IdeasPage() {
  const [tab, setTab] = useState<TabId>('naver');
  const [pins, setPins] = useState<SavedKeyword[]>([]);

  const reloadPins = () => {
    fetchPins().then(setPins);
  };
  useEffect(reloadPins, []);

  const merged = useMemo(() => {
    const byKw = new Map<string, Keyword>();
    pins.forEach((p) => byKw.set(p.keyword, savedToKeyword(p)));
    STATIC.forEach((k) => byKw.set(k.keyword, k)); // 정적 72 우선
    return [...byKw.values()];
  }, [pins]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-gray-200 px-6 pt-4">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm ${
              tab === t.id ? 'bg-[#4A2D6B] text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t.label}
            {t.id === 'pins' && <span className="ml-1 text-xs opacity-70">({merged.length})</span>}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'naver' && <KeywordAnalysisTab source="naver" onPinned={reloadPins} />}
        {tab === 'google' && <KeywordAnalysisTab source="google" onPinned={reloadPins} />}
        {tab === 'pins' && <KeywordTable keywords={merged} />}
      </div>
    </div>
  );
}
