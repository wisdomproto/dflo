// src/features/marketing/components/AddToQueueModal.tsx
import { useEffect, useState } from 'react';
import type { MarketingArticle } from '../types';
import { fetchArticles } from '../services/marketingArticleService';
import { enqueue, type PublishChannel } from '../services/marketingPublishService';
import { CHANNELS } from '../utils/publishConstants';

export function AddToQueueModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [articles, setArticles] = useState<MarketingArticle[]>([]);
  const [articleId, setArticleId] = useState<string>('');
  const [channels, setChannels] = useState<Set<PublishChannel>>(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles().then((a) => {
      setArticles(a);
      if (a.length) setArticleId(a[0].id);
    });
  }, []);

  const selectedArticle = articles.find((a) => a.id === articleId) ?? null;

  const toggleChannel = (ch: PublishChannel) => {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!articleId) {
      setErr('글을 선택하세요.');
      return;
    }
    if (channels.size === 0) {
      setErr('채널을 1개 이상 선택하세요.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await enqueue({
        articleId,
        language: selectedArticle?.language ?? 'ko',
        contentKind: 'post',
        targets: [...channels].map((channel) => ({ channelId: null, channel })),
      });
      onAdded();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '큐 추가 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">큐에 추가</h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">글 선택</span>
          {articles.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-400">
              생성된 글이 없습니다. 먼저 “콘텐츠 생성”에서 글을 만들어주세요.
            </p>
          ) : (
            <select
              value={articleId}
              onChange={(e) => setArticleId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
            >
              {articles.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.language}] {a.title || '(제목 없음)'}
                </option>
              ))}
            </select>
          )}
        </label>

        <div>
          <span className="mb-1 block text-xs font-medium text-gray-500">발행 채널 (복수 선택 — 채널당 1행 생성)</span>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => {
              const on = channels.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChannel(c.id)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    on ? `${c.badge} font-semibold` : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {on ? '✓ ' : ''}
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {err && <span className="text-xs text-red-500">{err}</span>}
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || articles.length === 0}
            className="ml-auto rounded-lg bg-[#4A2D6B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? '추가 중…' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
