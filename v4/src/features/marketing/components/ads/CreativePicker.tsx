// src/features/marketing/components/ads/CreativePicker.tsx
// 광고 소재 선택 — 이미 만든 카드뉴스/릴스를 광고 크리에이티브로 연결.
// 좌: 콘텐츠 목록 / 우: 선택 콘텐츠의 해당 시장(언어) 카드뉴스·릴스 미리보기.
// 소재 선택 시 그 시장의 캡션도 함께 넘겨 광고 본문 카피 기본값으로 쓴다.
import { useEffect, useState } from 'react';
import { fetchArticles } from '../../services/marketingArticleService';
import { fetchCardnews } from '../../services/cardnewsService';
import type { MarketingArticle, CardLang, Cardnews } from '../../types';
import type { CreativeKind } from '../../services/adWorkspaceService';

export interface PickedCreative {
  kind: CreativeKind;
  articleId: string;
  lang: string;
  thumbnailUrl: string;
  mediaUrl: string;
  name: string;
  caption: string;
}

function toCardLang(lang: string): CardLang {
  return (['ko', 'en', 'th', 'vi', 'ch', 'cn'].includes(lang) ? lang : 'ko') as CardLang;
}

export function CreativePicker({
  market,
  onPick,
  onClose,
}: {
  market: string;
  onPick: (c: PickedCreative) => void;
  onClose: () => void;
}) {
  const [articles, setArticles] = useState<MarketingArticle[]>([]);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<MarketingArticle | null>(null);
  const [cn, setCn] = useState<Cardnews | null>(null);
  const [loading, setLoading] = useState(false);
  const lang = toCardLang(market);

  useEffect(() => {
    fetchArticles().then(setArticles);
  }, []);

  useEffect(() => {
    if (!sel) {
      setCn(null);
      return;
    }
    setLoading(true);
    fetchCardnews(sel.id)
      .then(setCn)
      .finally(() => setLoading(false));
  }, [sel]);

  const caption = cn?.captions?.[lang] ?? '';
  const cardImgs = (cn?.slides ?? []).map((s) => s.canvas.images?.[lang] ?? s.canvas.imageUrl ?? '').filter(Boolean);
  const reel = sel?.reels?.[market];
  const filtered = articles.filter((a) => !q || a.title.toLowerCase().includes(q.toLowerCase()));

  const pickCard = (url: string) =>
    sel && onPick({ kind: 'cardnews', articleId: sel.id, lang: market, thumbnailUrl: url, mediaUrl: url, name: sel.title, caption });
  const pickReel = () =>
    sel && reel?.videoUrl &&
    onPick({ kind: 'reels', articleId: sel.id, lang: market, thumbnailUrl: reel.coverUrl ?? '', mediaUrl: reel.videoUrl, name: sel.title, caption });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* 좌: 콘텐츠 목록 */}
        <div className="flex w-64 flex-shrink-0 flex-col border-r border-gray-200">
          <div className="border-b border-gray-100 p-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="콘텐츠 검색…"
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSel(a)}
                className={`block w-full truncate px-3 py-2 text-left text-sm ${
                  sel?.id === a.id ? 'bg-[#4A2D6B]/10 font-medium text-[#4A2D6B]' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {a.sortOrder ? `${a.sortOrder}. ` : ''}
                {a.title}
              </button>
            ))}
          </div>
        </div>

        {/* 우: 소재 미리보기 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">소재 선택 · {market.toUpperCase()}</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          {!sel ? (
            <p className="grid h-[60%] place-items-center text-sm text-gray-400">왼쪽에서 콘텐츠를 선택하세요</p>
          ) : (
            <div className="space-y-4">
              <div className="text-sm font-semibold text-gray-800">{sel.title}</div>

              {reel?.videoUrl && (
                <div>
                  <div className="mb-1 text-xs font-medium text-gray-400">릴스</div>
                  <button
                    type="button"
                    onClick={pickReel}
                    className="group relative aspect-[9/16] w-28 overflow-hidden rounded-lg border-2 border-transparent hover:border-[#4A2D6B]"
                  >
                    {reel.coverUrl ? (
                      <img src={reel.coverUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center bg-gray-100 text-2xl">🎬</div>
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] text-white opacity-0 group-hover:opacity-100">
                      이 릴스 선택
                    </span>
                  </button>
                </div>
              )}

              <div>
                <div className="mb-1 text-xs font-medium text-gray-400">카드뉴스{loading ? ' · 불러오는 중…' : ''}</div>
                {cardImgs.length === 0 && !loading ? (
                  <p className="text-xs text-gray-400">이 시장({market})의 카드뉴스 이미지가 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {cardImgs.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => pickCard(url)}
                        className="aspect-[4/5] overflow-hidden rounded-lg border-2 border-transparent hover:border-[#4A2D6B]"
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
