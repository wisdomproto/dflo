// src/features/marketing/components/content/ContentTabs.tsx
import { useEffect, useState } from 'react';
import type { MarketingArticle } from '../../types';
import { BaseArticlePanel } from './BaseArticlePanel';
import { BlogPanel } from './BlogPanel';

const ACCENT = '#4A2D6B';

type Tab = 'base' | 'blog' | 'cardnews';

interface Props {
  article: MarketingArticle;
  onSaved: () => void;
}

export function ContentTabs({ article, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>('base');

  // Switching articles resets to 기본글 (avoids stranding on a now-hidden tab).
  useEffect(() => {
    setTab('base');
  }, [article.id]);

  const showBlog = article.language === 'ko';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'base', label: '기본글' },
    ...(showBlog ? [{ key: 'blog' as Tab, label: 'N블로그' }] : []),
    { key: 'cardnews', label: '카드뉴스' },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex shrink-0 gap-1 border-b border-gray-200 px-4">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                active ? 'text-[#4A2D6B]' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
              style={active ? { borderColor: ACCENT } : undefined}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'base' ? (
          <BaseArticlePanel article={article} onSaved={onSaved} />
        ) : tab === 'blog' ? (
          <BlogPanel article={article} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            준비 중입니다 (Phase 3)
          </div>
        )}
      </div>
    </div>
  );
}
