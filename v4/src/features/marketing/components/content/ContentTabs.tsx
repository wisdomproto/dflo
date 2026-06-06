// src/features/marketing/components/content/ContentTabs.tsx
import { useEffect, useState } from 'react';
import type { MarketingArticle } from '../../types';
import { LanguageSelector } from './LanguageSelector';
import { BaseArticlePanel } from './BaseArticlePanel';
import { BlogPanel } from './BlogPanel';
import { CardNewsPanel } from './CardNewsPanel';
import { PublishDialog } from './PublishDialog';
import type { ContentKind } from '../../utils/publishRows';

const ACCENT = '#4A2D6B';

type Tab = 'base' | 'blog' | 'cardnews';

interface Props {
  article: MarketingArticle;
  onSaved: () => void;
}

export function ContentTabs({ article, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>('base');
  const [language, setLanguage] = useState('ko');
  const [showPublish, setShowPublish] = useState(false);
  const contentKind: ContentKind = tab === 'blog' ? 'blog' : tab === 'cardnews' ? 'cardnews' : 'post';

  // Switching articles resets to 기본글 + 한국어 원본.
  useEffect(() => {
    setTab('base');
    setLanguage('ko');
  }, [article.id]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'base', label: '기본글' },
    { key: 'blog', label: '블로그' },
    { key: 'cardnews', label: '카드뉴스' },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Language selector (applies to 기본글) */}
      <LanguageSelector article={article} language={language} onChange={setLanguage} />

      {/* Tab bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4">
        <div className="flex gap-1">
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
        <button
          type="button"
          onClick={() => setShowPublish(true)}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          📥 발행 큐에 넣기
        </button>
      </div>

      {/* Tab body */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'base' ? (
          <BaseArticlePanel article={article} language={language} onSaved={onSaved} />
        ) : tab === 'blog' ? (
          <BlogPanel article={article} />
        ) : (
          <CardNewsPanel article={article} />
        )}
      </div>
      {showPublish && (
        <PublishDialog
          article={article}
          contentKind={contentKind}
          initialLanguage={language}
          onClose={() => setShowPublish(false)}
          onDone={() => setShowPublish(false)}
        />
      )}
    </div>
  );
}
