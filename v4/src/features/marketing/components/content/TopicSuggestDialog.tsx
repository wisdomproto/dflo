// src/features/marketing/components/content/TopicSuggestDialog.tsx
import { useState } from 'react';
import { suggestTopics, type TopicSuggestion } from '../../services/marketingArticleService';

interface Props {
  categories: { code: string; name: string; context: string }[];
  onPick: (t: TopicSuggestion) => void;
  onClose: () => void;
}

export function TopicSuggestDialog({ categories, onPick, onClose }: Props) {
  const [category, setCategory] = useState('');
  const [seed, setSeed] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<TopicSuggestion[] | null>(null);

  const handleSuggest = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await suggestTopics({
        count,
        category: category || undefined,
        seed: seed.trim() || undefined,
      });
      setTopics(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '추천 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="max-w-lg w-full rounded-xl bg-white p-5 max-h-[85vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#4A2D6B]">🎯 AI 주제 추천</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">— 카테고리 선택(선택) —</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="시드 키워드 (선택)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value={3}>3개</option>
              <option value={5}>5개</option>
              <option value={8}>8개</option>
            </select>
            <button
              type="button"
              onClick={handleSuggest}
              disabled={loading}
              className="flex-1 rounded-lg bg-[#4A2D6B] px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? '추천 중…' : '추천 받기'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="mt-4 space-y-2">
          {!topics && !error && (
            <p className="text-sm text-gray-400">카테고리나 시드 키워드로 주제를 추천받으세요.</p>
          )}
          {topics?.map((t, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-3">
              <p className="font-bold text-gray-800">{t.title}</p>
              {t.angle && <p className="text-sm text-gray-500">{t.angle}</p>}
              {t.keywords?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {t.keywords.map((k, j) => (
                    <span key={j} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {k}
                    </span>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => onPick(t)}
                className="mt-2 text-sm font-semibold text-[#4A2D6B] hover:underline"
              >
                이 주제로 →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
