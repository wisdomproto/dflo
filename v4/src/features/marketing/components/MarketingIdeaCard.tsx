// src/features/marketing/components/MarketingIdeaCard.tsx
// 단일 콘텐츠 아이디어 카드 (ContentFlow idea-card 포팅). 채널 아이콘 + 제목 + 구성/훅 + 아웃라인.

// Keep field lists in sync: ai-server keywordIdeas.ts KeywordIdea ↔ keywordIdeaService.ts ↔ this.
export interface KeywordIdea {
  channel: string;
  title: string;
  structure: string;
  hook: string;
  outline: string[];
}

const CHANNEL_META: Record<string, { icon: string; label: string }> = {
  blog: { icon: '📝', label: '블로그' },
  cardnews: { icon: '🖼️', label: '카드뉴스' },
  youtube: { icon: '🎬', label: '유튜브' },
};

export function MarketingIdeaCard({ idea }: { idea: KeywordIdea }) {
  const meta = CHANNEL_META[idea.channel] ?? { icon: '💡', label: idea.channel };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-base">{meta.icon}</span>
        <span className="rounded-full bg-[#4A2D6B]/10 px-2 py-0.5 text-xs font-medium text-[#4A2D6B]">
          {meta.label}
        </span>
        {idea.structure && <span className="text-xs text-gray-400">{idea.structure}</span>}
      </div>
      <h4 className="mb-1.5 text-sm font-semibold text-gray-800">{idea.title}</h4>
      {idea.hook && <p className="mb-2 text-xs leading-relaxed text-gray-500">“{idea.hook}”</p>}
      {idea.outline.length > 0 && (
        <ol className="list-decimal space-y-0.5 pl-4 text-xs text-gray-600">
          {idea.outline.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
