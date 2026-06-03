// src/features/marketing/components/KeywordIdeasTab.tsx
// ✨ AI 아이디어 탭. 시드(IdeasPage seed prop) + 채널 토글 → fetchKeywordIdeas → 아이디어 카드 그리드.
// 생성만 Gemini 게이트 — 키 없으면 에러 배너로 graceful. 입력/토글/렌더는 키 없이 동작.
import { useState } from 'react';
import { fetchKeywordIdeas } from '../services/keywordIdeaService';
import { MarketingIdeaCard, type KeywordIdea } from './MarketingIdeaCard';

const CHANNELS = [
  { id: 'blog', label: '📝 블로그' },
  { id: 'cardnews', label: '🖼️ 카드뉴스' },
  { id: 'youtube', label: '🎬 유튜브' },
] as const;

export function KeywordIdeasTab({
  seed,
  onSeedChange,
}: {
  seed: string;
  onSeedChange: (v: string) => void;
}) {
  const [channels, setChannels] = useState<string[]>(['blog', 'cardnews', 'youtube']);
  const [ideas, setIdeas] = useState<KeywordIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ran, setRan] = useState(false);

  const toggleChannel = (id: string) => {
    setChannels((cs) => (cs.includes(id) ? cs.filter((c) => c !== id) : [...cs, id]));
  };

  const run = async () => {
    if (!seed.trim()) {
      setErr('시드 키워드/주제를 입력하세요.');
      return;
    }
    if (channels.length === 0) {
      setErr('채널을 1개 이상 선택하세요.');
      return;
    }
    setLoading(true);
    setErr(null);
    setRan(true);
    try {
      const r = await fetchKeywordIdeas(seed.trim(), channels);
      setIdeas(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '생성 실패');
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={seed}
          onChange={(e) => onSeedChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="시드 키워드/주제 (예: 성조숙증 검사)"
          className="min-w-[240px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-[#4A2D6B] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {loading ? '생성 중…' : '✨ AI 아이디어 생성'}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400">채널</span>
        {CHANNELS.map((c) => (
          <button
            type="button"
            key={c.id}
            onClick={() => toggleChannel(c.id)}
            className={`rounded-full px-3 py-1 text-xs ${
              channels.includes(c.id) ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {err}
        </div>
      )}

      {ideas.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea, i) => (
            <MarketingIdeaCard key={`${idea.channel}-${i}`} idea={idea} />
          ))}
        </div>
      )}

      {!loading && !err && ideas.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-400">
          {ran
            ? '아이디어를 생성하지 못했습니다. 시드를 바꿔 다시 시도해보세요.'
            : '시드 키워드와 채널을 고르고 생성하세요. (AI 생성은 Gemini 키 연결 시 동작합니다.)'}
        </p>
      )}
    </div>
  );
}
