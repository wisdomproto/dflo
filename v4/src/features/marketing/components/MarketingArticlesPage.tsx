// src/features/marketing/components/MarketingArticlesPage.tsx
import { useEffect, useState } from 'react';
import type { MarketingArticle } from '../types';
import {
  fetchArticles,
  saveArticle,
  deleteArticle,
  reorderArticles,
} from '../services/marketingArticleService';
import { ContentListPanel } from './content/ContentListPanel';
import { ContentTabs } from './content/ContentTabs';

export function MarketingArticlesPage() {
  const [articles, setArticles] = useState<MarketingArticle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reload = () => fetchArticles().then(setArticles);
  useEffect(() => {
    reload();
  }, []);

  const selected = articles.find((a) => a.id === selectedId) ?? null;

  const handleNew = async () => {
    const a = await saveArticle({
      title: '새 글',
      language: 'ko',
      status: 'draft',
      keywords: [],
      category: '',
    });
    await reload();
    setSelectedId(a.id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 글을 삭제할까요?')) return;
    await deleteArticle(id);
    if (selectedId === id) setSelectedId(null);
    reload();
  };

  const handleReorder = async (ids: string[]) => {
    await reorderArticles(ids);
    reload();
  };

  return (
    <div className="flex h-full">
      <ContentListPanel
        articles={articles}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNew={handleNew}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <ContentTabs key={selected.id} article={selected} onSaved={reload} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            왼쪽에서 글을 선택하거나 + 새 글 으로 시작하세요.
          </div>
        )}
      </div>
    </div>
  );
}
