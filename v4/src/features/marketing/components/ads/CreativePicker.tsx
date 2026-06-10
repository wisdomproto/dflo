// src/features/marketing/components/ads/CreativePicker.tsx
// 광고 소재 선택 — 소스 탭 2개:
//  📡 채널 피드 = 채널에 이미 발행된 게시물을 골라 증폭(boosting, 소셜 프루프 누적)
//  ⬆️ 직접 업로드 = 광고 전용 소재(마케팅 릴·이미지)를 올려 다크 포스트(피드 미노출)로 집행
// 옛 "콘텐츠 스튜디오에서 고르기" 패널은 폐기 — 스튜디오 콘텐츠는 발행 후 채널 피드에서
// 부스팅하고, 광고 전용 소재는 스튜디오에 없는 파일이라 직접 업로드가 맞다.
import { useEffect, useState } from 'react';
import { fetchArticles } from '../../services/marketingArticleService';
import type { MarketingArticle } from '../../types';
import type { CreativeKind } from '../../services/adWorkspaceService';
import { ChannelFeedTab } from './ChannelFeedTab';
import { DirectUploadTab } from './DirectUploadTab';

export interface PickedCreative {
  kind: CreativeKind;
  articleId: string | null;
  lang: string;
  thumbnailUrl: string;
  mediaUrl: string;
  name: string;
  caption: string;
  // 기존 게시물(boosting) 선택 시에만 채워진다.
  sourcePostId?: string;
  sourceChannel?: string;
  sourceUrl?: string;
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
  const [tab, setTab] = useState<'feed' | 'upload'>('feed');
  const [articles, setArticles] = useState<MarketingArticle[]>([]);

  useEffect(() => {
    fetchArticles().then(setArticles); // 채널 피드 탭의 콘텐츠 제목 enrich 용
  }, []);

  const tabBtn = (id: 'feed' | 'upload', label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-lg px-3 py-1.5 text-sm ${
        tab === id ? 'bg-[#4A2D6B] font-semibold text-white' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* 헤더: 소스 탭 + 닫기 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <h3 className="mr-2 text-sm font-bold text-gray-800">소재 선택 · {market.toUpperCase()}</h3>
            {tabBtn('feed', '📡 채널 피드')}
            {tabBtn('upload', '⬆️ 직접 업로드')}
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <p className="border-b border-gray-50 px-4 py-1.5 text-[11px] text-gray-400">
          {tab === 'feed'
            ? '채널에 이미 발행된 게시물을 광고로 증폭(부스팅) — 좋아요·댓글이 한 게시물에 누적됩니다.'
            : '광고 전용 소재를 직접 업로드 — 다크 포스트로 피드에 노출되지 않고 타겟에게만 보입니다.'}
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === 'feed'
            ? <ChannelFeedTab market={market} articles={articles} onPick={onPick} />
            : <DirectUploadTab market={market} onPick={onPick} />}
        </div>
      </div>
    </div>
  );
}
