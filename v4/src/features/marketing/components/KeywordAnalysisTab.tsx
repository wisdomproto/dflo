// src/features/marketing/components/KeywordAnalysisTab.tsx
import { useState } from 'react';
import type { KeywordHit } from '../types';
import { searchNaver, searchGoogle, savePin } from '../services/marketingKeywordService';

export function KeywordAnalysisTab({ source, onPinned }: { source: 'naver' | 'google'; onPinned: () => void }) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<KeywordHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Set<string>>(new Set());

  const run = async () => {
    const kws = input.split(',').map((s) => s.trim()).filter(Boolean);
    if (!kws.length) {
      setErr('검색어를 입력하세요 (쉼표로 여러 개).');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const r = source === 'naver' ? await searchNaver(kws) : await searchGoogle(kws);
      setResults(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '분석 실패');
    } finally {
      setLoading(false);
    }
  };

  const pin = async (h: KeywordHit) => {
    try {
      await savePin(h);
      setPinned((s) => new Set(s).add(h.keyword));
      onPinned();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder={source === 'naver' ? '네이버 검색어 (쉼표로 여러 개)' : '구글 검색어 (쉼표로 여러 개)'}
          className="min-w-[240px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-[#4A2D6B] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {loading ? '분석 중…' : '분석'}
        </button>
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>

      {results.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 text-left text-xs text-gray-400">
              <th className="px-3 py-2">키워드</th>
              <th className="px-3 py-2 text-right">PC</th>
              <th className="px-3 py-2 text-right">모바일</th>
              <th className="px-3 py-2 text-right">총검색</th>
              <th className="px-3 py-2 text-right">CPC</th>
              <th className="px-3 py-2">경쟁도</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {results.map((k) => (
              <tr key={k.keyword} className="border-b border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-800">{k.keyword}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.pcSearch.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.mobileSearch.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{k.totalSearch.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.cpc.toLocaleString()}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{k.competition}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => pin(k)}
                    disabled={pinned.has(k.keyword)}
                    className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 disabled:opacity-40"
                  >
                    {pinned.has(k.keyword) ? '✓ 추가됨' : '📌 추가'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
