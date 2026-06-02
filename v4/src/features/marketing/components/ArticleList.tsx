// src/features/marketing/components/ArticleList.tsx
import type { MarketingArticle } from '../types';

export function ArticleList({
  articles,
  onNew,
  onEdit,
  onDelete,
}: {
  articles: MarketingArticle[];
  onNew: () => void;
  onEdit: (a: MarketingArticle) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-3 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">블로그 글</h1>
        <button type="button" onClick={onNew} className="rounded-lg bg-[#4A2D6B] px-4 py-1.5 text-sm font-semibold text-white">
          + 새 글 생성
        </button>
      </div>
      {articles.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">아직 생성된 글이 없습니다.</p>
      ) : (
        articles.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
            <button type="button" onClick={() => onEdit(a)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium text-gray-800">{a.title || '(제목 없음)'}</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                {a.category && <span className="rounded bg-gray-100 px-1.5 py-0.5">{a.category}</span>}
                <span>{a.language}</span>
                <span className={a.status === 'done' ? 'text-emerald-600' : 'text-amber-600'}>
                  {a.status === 'done' ? '완료' : '초안'}
                </span>
                <span>{a.updatedAt.slice(0, 10)}</span>
              </div>
            </button>
            <button type="button" onClick={() => onDelete(a.id)} className="px-2 text-gray-300 hover:text-red-500">
              🗑
            </button>
          </div>
        ))
      )}
    </div>
  );
}
