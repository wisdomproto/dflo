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
import { ContentStatusPanel } from './content/ContentStatusPanel';
import { CustomReelsPanel } from './content/CustomReelsPanel';

export function MarketingArticlesPage() {
  const [articles, setArticles] = useState<MarketingArticle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'editor' | 'status'>('editor');

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
    setView('editor');
  };

  // 커스텀 콘텐츠(ad-hoc 릴스) — sort_order 1000번대(정규 1~62와 분리). migration 055 필요.
  const handleNewCustom = async () => {
    const maxCustom = articles
      .filter((a) => a.kind === 'custom')
      .reduce((m, a) => Math.max(m, a.sortOrder), 1000);
    try {
      const a = await saveArticle({
        title: '새 커스텀 릴스',
        language: 'ko',
        status: 'draft',
        keywords: [],
        category: '',
        kind: 'custom',
        sortOrder: maxCustom + 1,
      });
      await reload();
      setSelectedId(a.id);
      setView('editor');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(
        /kind/.test(msg)
          ? '커스텀 콘텐츠를 만들려면 migration 055(marketing_articles.kind)를 먼저 적용해야 합니다.'
          : `생성 실패: ${msg}`,
      );
    }
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

  // 패널이 저장(reels/reelAssets 등)하면 부모 articles 도 in-place 갱신 → 페이지 이동 후 재마운트해도 최신값 표시(stale 방지).
  const patchSelected = (partial: Partial<MarketingArticle>) =>
    setArticles((prev) => prev.map((a) => (a.id === selectedId ? { ...a, ...partial } : a)));

  return (
    <div className="flex h-full">
      <ContentListPanel
        articles={articles}
        selectedId={selectedId}
        onSelect={(id) => { setSelectedId(id); setView('editor'); }}
        onNew={handleNew}
        onNewCustom={handleNewCustom}
        onDelete={handleDelete}
        onReorder={handleReorder}
        onStatus={() => setView('status')}
        statusActive={view === 'status'}
      />
      <div className="flex-1 overflow-y-auto">
        {view === 'status' ? (
          <ContentStatusPanel articles={articles.filter((a) => a.kind !== 'custom')} />
        ) : selected?.kind === 'custom' ? (
          <CustomReelsPanel key={selected.id} article={selected} onSaved={reload} onPatch={patchSelected} />
        ) : selected ? (
          <ContentTabs key={selected.id} article={selected} onSaved={reload} onPatch={patchSelected} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            왼쪽에서 글을 선택하거나 + 새 글 으로 시작하세요.
          </div>
        )}
      </div>
    </div>
  );
}
