import { useState } from 'react';
import { suggestTopics } from '../../services/marketingArticleService';
import type { TopicSuggestion } from '../../types';

interface Props {
  categories: { code: string; name: string; context: string }[];
  onPick: (t: { title: string; angle: string; keywords: string[] }) => void;
  onClose: () => void;
}

export function TopicSuggestDialog(props: Props) {
  const [category, setCategory] = useState('');
  const [seed, setSeed] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TopicSuggestion[]>([]);

  const handleSuggest = async () => {
    setLoading(true);
    setError(null);
    try {
      const topics = await suggestTopics({
        count,
        category: category || undefined,
        seed: seed.trim() || undefined,
      });
      setResults(topics);
    } catch (e) {
      setError(e instanceof Error ? e.message : '주제 추천 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">🎯 AI 주제 추천</h2>
          <button
            type="button"
            onClick={props.onClose}
            className="text-lg text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div className="mb-4 space-y-3">
          {/* Category select */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A2D6B]/20"
            >
              <option value="">— 카테고리 선택(선택) —</option>
              {props.categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Seed input */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">시드 키워드 (선택)</label>
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="예: 성장 관리, 어린이 영양"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A2D6B]/20"
            />
          </div>

          {/* Count select */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">추천 개수</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A2D6B]/20"
            >
              <option value={3}>3개</option>
              <option value={5}>5개</option>
              <option value={8}>8개</option>
            </select>
          </div>
        </div>

        {/* Error message */}
        {error && <div className="mb-3 text-xs text-red-500">{error}</div>}

        {/* Suggest button */}
        <button
          type="button"
          onClick={handleSuggest}
          disabled={loading}
          className="mb-4 w-full rounded-lg bg-[#4A2D6B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {loading ? '추천 중…' : '추천 받기'}
        </button>

        {/* Results */}
        {results.length === 0 && !loading ? (
          <div className="text-sm text-gray-400">카테고리나 시드 키워드로 주제를 추천받으세요.</div>
        ) : (
          <div className="space-y-2">
            {results.map((topic, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2">
                  <p className="font-semibold text-gray-800">{topic.title}</p>
                  <p className="text-xs text-gray-500">{topic.angle}</p>
                </div>
                <div className="mb-3 flex flex-wrap gap-1">
                  {topic.keywords.map((kw, i) => (
                    <span key={i} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                      {kw}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => props.onPick(topic)}
                  className="text-xs font-semibold text-[#4A2D6B] hover:underline"
                >
                  이 주제로 →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
