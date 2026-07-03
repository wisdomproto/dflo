// src/features/marketing/components/CampaignBreakdownPanel.tsx
// 캠페인(utm_campaign) 비교 — 광고 캠페인별 세션/열람/측정완료/상담클릭/완료율.
// 언어 탭과 무관한 크로스 언어 지표(캠페인은 언어를 가로지르는 광고 단위)라 독립 패널.
import { useEffect, useState } from 'react';
import { fetchSiteBreakdown, type CampaignStats } from '../services/marketingAnalyticsService';

export function CampaignBreakdownPanel({ days, date }: { days: number; date: string | null }) {
  const [campaigns, setCampaigns] = useState<CampaignStats[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const d = await fetchSiteBreakdown(date ? { date } : days);
        if (alive) setCampaigns(d.campaigns ?? []);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : '캠페인 분석 불러오기 실패');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [days, date]);

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <h4 className="text-xs font-semibold text-gray-500">🎯 캠페인 비교</h4>
        <span className="text-[11px] text-gray-400">전체 언어 합산 · UTM 태그된 광고 캠페인만</span>
      </div>

      {loading && <p className="py-6 text-center text-xs text-gray-400">불러오는 중…</p>}
      {err && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-center">
          <p className="text-xs font-semibold text-amber-700">데이터를 불러오지 못했습니다</p>
          <p className="mt-1 text-[11px] text-amber-600">{err}</p>
        </div>
      )}

      {!loading && !err && campaigns && campaigns.length === 0 && (
        <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-[11px] text-gray-400">
          아직 UTM 태그된 캠페인 데이터가 없습니다 (광고가 트래픽을 보내면 표시됩니다)
        </p>
      )}

      {!loading && !err && campaigns && campaigns.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-400">
                <th className="px-3 py-2 font-semibold">캠페인</th>
                <th className="px-3 py-2 text-right font-semibold">세션</th>
                <th className="px-3 py-2 text-right font-semibold">열람(calc_open)</th>
                <th className="px-3 py-2 text-right font-semibold">측정완료</th>
                <th className="px-3 py-2 text-right font-semibold">상담클릭</th>
                <th className="px-3 py-2 text-right font-semibold">측정완료율</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.name} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2 font-medium text-gray-700">{c.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{c.sessions.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{c.calcOpen.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{c.heightCalc.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{c.consult.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums text-[#4A2D6B]">{c.completionRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-gray-400">
        {date ? `📅 ${date} 하루` : '지난 기간'} · GA4 sessionCampaignName(utm_campaign) 기준, (not set)/(direct)/(organic)/(referral) 등 태그 안 된 트래픽은 제외. 세션 내림차순.
      </p>
    </div>
  );
}
