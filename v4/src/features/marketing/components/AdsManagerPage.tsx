// src/features/marketing/components/AdsManagerPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { logger } from '@/shared/lib/logger';
import { fetchAnalyticsOverview } from '@/features/website/services/analyticsService';
import type { AnalyticsOverview } from '@/features/website/services/analyticsService';
import type { AdCampaign, AdPlatform, AdStatus } from '../services/marketingAdsService';
import {
  fetchCampaigns,
  saveCampaign,
  deleteCampaign,
  deriveMetrics,
  requestAdsInsights,
  AD_REGIONS,
} from '../services/marketingAdsService';
import { AdCampaignForm } from './AdCampaignForm';

const PLATFORM_TABS: { id: 'all' | AdPlatform; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'meta', label: 'Meta' },
  { id: 'google', label: 'Google' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'naver', label: '네이버' },
];

const STATUS_CONFIG: Record<AdStatus, { label: string; cls: string }> = {
  active: { label: '진행중', cls: 'bg-emerald-100 text-emerald-700' },
  paused: { label: '일시중지', cls: 'bg-amber-100 text-amber-700' },
  ended: { label: '종료', cls: 'bg-gray-200 text-gray-600' },
  draft: { label: '초안', cls: 'bg-slate-100 text-slate-500' },
};

const PLATFORM_LABEL: Record<AdPlatform, string> = {
  meta: 'Meta',
  google: 'Google',
  youtube: 'YouTube',
  naver: '네이버',
};

// 억/만 단축
function formatNumber(n: number): string {
  const v = n || 0;
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}억`;
  if (v >= 1e4) return `${(v / 1e4).toFixed(1)}만`;
  return v.toLocaleString('ko-KR');
}

function formatCurrency(n: number): string {
  return `₩${formatNumber(n)}`;
}

export function AdsManagerPage() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [gaError, setGaError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'all' | AdPlatform>('all');
  const [region, setRegion] = useState<string>('all');
  const [editing, setEditing] = useState<{ open: boolean; campaign: AdCampaign | null }>({ open: false, campaign: null });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [insight, setInsight] = useState<string | null>(null);
  const [insightErr, setInsightErr] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const reload = () => {
    fetchCampaigns().then(setCampaigns);
    fetchAnalyticsOverview(30)
      .then((o) => {
        setOverview(o);
        setGaError(null);
      })
      .catch((e) => {
        setOverview(null);
        setGaError(e instanceof Error ? e.message : 'GA4 데이터를 불러오지 못했습니다.');
        logger.warn('[marketing] ads GA4 overview failed:', e);
      });
  };
  useEffect(reload, []);

  const filtered = useMemo(
    () =>
      campaigns.filter(
        (c) =>
          (platform === 'all' || c.platform === platform) &&
          (region === 'all' || c.region === region),
      ),
    [campaigns, platform, region],
  );

  const summary = useMemo(() => {
    const totals = filtered.reduce(
      (a, c) => ({
        spend: a.spend + c.spend,
        impressions: a.impressions + c.impressions,
        clicks: a.clicks + c.clicks,
        conversions: a.conversions + c.conversions,
        revenue: a.revenue + c.revenue,
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
    );
    const avg = deriveMetrics(totals);
    return { totals, avg };
  }, [filtered]);

  const onSave = async (patch: Partial<AdCampaign> & { id?: string }) => {
    setSaving(true);
    setErr(null);
    try {
      await saveCampaign(patch);
      setEditing({ open: false, campaign: null });
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('이 캠페인을 삭제할까요?')) return;
    try {
      await deleteCampaign(id);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const runInsights = async () => {
    setInsightLoading(true);
    setInsightErr(null);
    setInsight(null);
    try {
      const text = await requestAdsInsights(filtered, overview?.totals.kakaoConsultClicks ?? 0);
      setInsight(text);
    } catch (e) {
      setInsightErr(e instanceof Error ? e.message : 'AI 진단을 불러오지 못했습니다.');
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">광고 관리</h1>
        {!editing.open && (
          <button
            type="button"
            onClick={() => setEditing({ open: true, campaign: null })}
            className="rounded-lg bg-[#4A2D6B] px-4 py-1.5 text-sm font-semibold text-white"
          >
            + 캠페인 추가
          </button>
        )}
      </div>

      {/* 플랫폼 탭 */}
      <div className="flex flex-wrap gap-1">
        {PLATFORM_TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setPlatform(t.id)}
            className={`rounded-full px-3 py-1 text-xs ${
              platform === t.id ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 지역 필터 */}
      <div className="flex flex-wrap gap-1">
        {[{ code: 'all', label: '전체 지역' }, ...AD_REGIONS].map((r) => (
          <button
            type="button"
            key={r.code}
            onClick={() => setRegion(r.code)}
            className={`rounded-full px-3 py-1 text-xs ${
              region === r.code ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* 요약 메트릭 카드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="총 지출" value={formatCurrency(summary.totals.spend)} />
        <MetricCard label="총 노출" value={formatNumber(summary.totals.impressions)} />
        <MetricCard label="총 클릭" value={formatNumber(summary.totals.clicks)} />
        <MetricCard label="총 전환" value={formatNumber(summary.totals.conversions)} />
        <MetricCard label="평균 CTR" value={`${summary.avg.ctr.toFixed(2)}%`} />
        <MetricCard label="평균 CPC" value={formatCurrency(summary.avg.cpc)} />
        <MetricCard label="평균 CPA" value={formatCurrency(summary.avg.cpa)} />
        <MetricCard label="평균 ROAS" value={summary.avg.roas.toFixed(2)} accent />
      </div>

      {/* GA4 벤치마크 카드 (참고용) */}
      <div className="rounded-xl border border-[#4A2D6B]/20 bg-[#4A2D6B]/5 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-[#4A2D6B]">사이트 실측 전환 (참고용)</div>
          <span className="rounded bg-[#4A2D6B]/10 px-2 py-0.5 text-[10px] text-[#4A2D6B]">GA4 · 지난 30일</span>
        </div>
        {gaError ? (
          <p className="mt-2 text-xs text-red-500">{gaError}</p>
        ) : overview ? (
          <div className="mt-2 flex flex-wrap items-end gap-6">
            <div>
              <div className="text-2xl font-bold tabular-nums text-[#4A2D6B]">
                {overview.totals.kakaoConsultClicks.toLocaleString('ko-KR')}
              </div>
              <div className="text-xs text-gray-500">카카오톡 상담 클릭</div>
            </div>
            <div className="text-xs text-gray-500">
              페이지뷰 {formatNumber(overview.totals.pageViews)} · 활성 사용자 {formatNumber(overview.totals.activeUsers)}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-400">불러오는 중…</p>
        )}
        <p className="mt-2 text-[11px] text-gray-400">
          ※ 사이트 전체 합계 신호로, 특정 광고 캠페인 전환과 1:1로 귀속되지 않습니다.
        </p>
      </div>

      {err && <p className="text-xs text-red-500">{err}</p>}

      {editing.open && (
        <AdCampaignForm
          initial={editing.campaign}
          onSave={onSave}
          onCancel={() => setEditing({ open: false, campaign: null })}
          saving={saving}
        />
      )}

      {/* 캠페인 표 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 text-left text-xs text-gray-400">
              <th className="px-3 py-2">캠페인</th>
              <th className="px-3 py-2">플랫폼</th>
              <th className="px-3 py-2">지역</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2 text-right">지출</th>
              <th className="px-3 py-2 text-right">노출</th>
              <th className="px-3 py-2 text-right">클릭</th>
              <th className="px-3 py-2 text-right">CTR</th>
              <th className="px-3 py-2 text-right">CPC</th>
              <th className="px-3 py-2 text-right">전환</th>
              <th className="px-3 py-2 text-right">CPA</th>
              <th className="px-3 py-2 text-right">ROAS</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const d = deriveMetrics(c);
              const st = STATUS_CONFIG[c.status];
              return (
                <tr key={c.id} className="border-b border-gray-100">
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => setEditing({ open: true, campaign: c })} className="text-left font-medium text-gray-800 hover:text-[#4A2D6B]">
                      {c.name || '(이름 없음)'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{PLATFORM_LABEL[c.platform]}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {AD_REGIONS.find((r) => r.code === c.region)?.label ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{formatCurrency(c.spend)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{formatNumber(c.impressions)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{formatNumber(c.clicks)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{d.ctr.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{formatCurrency(d.cpc)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{formatNumber(c.conversions)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{formatCurrency(d.cpa)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-[#4A2D6B]">{d.roas.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" aria-label="삭제" onClick={() => onDelete(c.id)} className="px-2 text-gray-300 hover:text-red-500">
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">
            등록된 캠페인이 없습니다. <span className="text-[#4A2D6B]">+ 캠페인 추가</span>로 시작하세요.
          </p>
        )}
      </div>

      {/* AI 진단 (Gemini 게이트) */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-gray-800">✨ AI 광고 진단</div>
            <p className="text-xs text-gray-400">비효율 캠페인 + 예산 재배분 제안 (Gemini)</p>
          </div>
          <button
            type="button"
            onClick={runInsights}
            disabled={insightLoading || filtered.length === 0}
            className="rounded-lg bg-[#4A2D6B] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {insightLoading ? '진단 중…' : 'AI 진단'}
          </button>
        </div>
        {insightErr && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            AI 진단을 불러오지 못했습니다 — {insightErr}
          </div>
        )}
        {insight && (
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">
            {insight}
          </pre>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${accent ? 'text-[#4A2D6B]' : 'text-gray-800'}`}>{value}</div>
    </div>
  );
}
