// src/features/marketing/components/MarketingArticlesPage.tsx
import { useEffect, useState } from 'react';
import type { MarketingArticle } from '../types';
import { fetchArticles, deleteArticle } from '../services/marketingArticleService';
import { ArticleList } from './ArticleList';
import { ArticleEditor } from './ArticleEditor';

export function MarketingArticlesPage() {
  const [articles, setArticles] = useState<MarketingArticle[]>([]);
  const [view, setView] = useState<{ mode: 'list' } | { mode: 'edit'; article: MarketingArticle | null }>({
    mode: 'list',
  });

  const reload = () => {
    fetchArticles().then(setArticles);
  };
  useEffect(reload, []);

  if (view.mode === 'edit') {
    return (
      <ArticleEditor
        article={view.article}
        onSaved={() => {
          setView({ mode: 'list' });
          reload();
        }}
        onCancel={() => setView({ mode: 'list' })}
      />
    );
  }

  return (
    <ArticleList
      articles={articles}
      onNew={() => setView({ mode: 'edit', article: null })}
      onEdit={(a) => setView({ mode: 'edit', article: a })}
      onDelete={async (id) => {
        await deleteArticle(id);
        reload();
      }}
    />
  );
}
