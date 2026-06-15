// src/features/marketing/components/AdsManagerPage.tsx
// 유료 광고 워크스페이스 — 시장(국가·언어) → 광고계정 → 캠페인(설정+콘텐츠 한 화면).
// 기획·구성 모드: Meta 광고관리자에서 실제 게재, 성과는 캠페인에 기록. (migration 047)
import { useEffect, useState } from 'react';
import { fetchAnalyticsOverview } from '@/features/website/services/analyticsService';
import type { AnalyticsOverview } from '@/features/website/services/analyticsService';
import type { AdCampaign } from '../services/marketingAdsService';
import { fetchCampaigns, deleteCampaign } from '../services/marketingAdsService';
import type { AdAccount } from '../services/adWorkspaceService';
import { fetchAdAccounts, saveAdAccount, deleteAdAccount } from '../services/adWorkspaceService';
import { LOCALES } from '../services/marketingChannelService';
import { AccountBar } from './ads/AccountBar';
import { AdStrategyPanel } from './ads/AdStrategyPanel';
import { AdDocPanel } from './ads/AdDocPanel';
import { CampaignEditor } from './ads/CampaignEditor';
import { STATUS_CONFIG, objectiveLabel, fmtNumber } from './ads/adConstants';

export function AdsManagerPage() {
  const [market, setMarket] = useState('ko');
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [editing, setEditing] = useState<AdCampaign | 'new' | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);

  const loadAccounts = () => fetchAdAccounts().then(setAccounts);
  const loadCampaigns = () => fetchCampaigns().then(setCampaigns);
  useEffect(() => {
    loadAccounts();
    loadCampaigns();
    fetchAnalyticsOverview(30).then(setOverview).catch(() => setOverview(null));
  }, []);

  const marketAccounts = accounts.filter((a) => a.market === market);
  const marketCampaigns = campaigns.filter((c) => (c.market || 'ko') === market);

  const onSaveAccount = async (patch: Partial<AdAccount> & { id?: string }) => {
    await saveAdAccount(patch);
    await loadAccounts();
  };
  const onDeleteAccount = async (id: string) => {
    await deleteAdAccount(id);
    loadAccounts();
  };
  const onDeleteCampaign = async (id: string) => {
    if (!window.confirm('이 캠페인을 삭제할까요? (콘텐츠 연결도 함께 삭제됩니다)')) return;
    await deleteCampaign(id);
    loadCampaigns();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">광고 관리</h1>
        <p className="text-xs text-gray-400">유료 광고 캠페인 기획·구성 · Meta(FB·IG)</p>
      </div>

      {editing ? (
        <CampaignEditor
          initial={editing === 'new' ? null : editing}
          market={market}
          accounts={marketAccounts}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadCampaigns();
          }}
        />
      ) : (
        <>
          {/* 시장 셀렉터 */}
          <div className="flex flex-wrap gap-1.5">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setMarket(l.code)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                  market === l.code ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>

          <AdStrategyPanel market={market} />

          <AdDocPanel
            title="📘 인스타 링크 광고 직접 만들기"
            subtitle="— Meta 광고 관리자 단계별 가이드 (앱 검수 없이 지금 가능)"
            src="/marketing/ads/ig-ads-manager-guide.html"
          />

          <AdDocPanel
            title="🚀 앱 검수·라이브 준비"
            subtitle="— 자동화 잠금 해제용 제출 자료·체크리스트"
            src="/marketing/ads/app-review-guide.html"
          />

          <AccountBar market={market} accounts={marketAccounts} onSave={onSaveAccount} onDelete={onDeleteAccount} />

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">
              캠페인 <span className="text-gray-400">({marketCampaigns.length})</span>
            </h2>
            <button type="button" onClick={() => setEditing('new')} className="rounded-lg bg-[#4A2D6B] px-4 py-1.5 text-sm font-semibold text-white">
              + 캠페인
            </button>
          </div>

          {marketCampaigns.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
              {LOCALES.find((l) => l.code === market)?.flag} 이 시장의 캠페인이 없습니다. <span className="text-[#4A2D6B]">+ 캠페인</span>으로 시작하세요.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {marketCampaigns.map((c) => {
                const st = STATUS_CONFIG[c.status];
                const acct = accounts.find((a) => a.id === c.accountId);
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setEditing(c)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditing(c)}
                    className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                      <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5">{objectiveLabel(c.objective)}</span>
                      {acct && <span className="rounded bg-gray-100 px-1.5 py-0.5">{acct.name}</span>}
                      {c.periodStart && (
                        <span>
                          {c.periodStart}~{c.periodEnd || ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCampaign(c.id);
                        }}
                        className="text-xs text-gray-300 hover:text-red-500"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {overview && (
            <div className="rounded-xl border border-[#4A2D6B]/20 bg-[#4A2D6B]/5 p-3 text-xs text-gray-500">
              <span className="font-semibold text-[#4A2D6B]">사이트 실측 (참고)</span> · 카톡 상담 클릭 {fmtNumber(overview.totals.kakaoConsultClicks)} · 페이지뷰{' '}
              {fmtNumber(overview.totals.pageViews)} <span className="text-gray-400">(GA4 30일)</span>
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-gray-400">
            ⓘ 여기서 캠페인을 기획·구성한 뒤 Meta 광고관리자에서 실제 게재하고, 성과는 캠페인에 기록하세요. 추후 API 자동 집행이 연결되면 동일 구조로 바로 푸시됩니다.
          </p>
        </>
      )}
    </div>
  );
}
