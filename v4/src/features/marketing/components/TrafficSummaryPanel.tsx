// src/features/marketing/components/TrafficSummaryPanel.tsx
// 좌측 트래픽 요약 패널 — 기존 website analyticsService(GA4 OAuth 프록시)를 그대로 재사용.
// AnalyticsOverview 는 재정의하지 않고 import. GA4 미설정/만료 시 에러 메시지 표시.
import { useEffect, useState } from 'react';
import {
  fetchAnalyticsOverview,
  type AnalyticsOverview,
} from '@/features/website/services/analyticsService';

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${accent ? 'text-[#4A2D6B]' : 'text-gray-800'}`}>
        {value}
      </div>
    </div>
  );
}

export function TrafficSummaryPanel({ days }: { days: number }) {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const d = await fetchAnalyticsOverview(days);
        if (alive) setData(d);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : '트래픽 데이터 불러오기 실패');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [days]);

  if (loading) {
    return <p className="py-12 text-center text-sm text-gray-400">트래픽 불러오는 중…</p>;
  }
  if (err) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
        <p className="text-sm font-semibold text-amber-700">트래픽 데이터를 불러오지 못했습니다</p>
        <p className="mt-1 text-xs text-amber-600">{err}</p>
        <p className="mt-2 text-xs text-amber-500">GA4 OAuth 설정(ai-server)을 확인해주세요.</p>
      </div>
    );
  }
  if (!data) return null;

  const maxDailyPv = Math.max(1, ...data.daily.map((d) => d.pageViews));
  const topPages = data.topPages.slice(0, 10);

  return (
    <div className="space-y-5">
      {/* 총합 카드 */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="총 페이지뷰" value={data.totals.pageViews.toLocaleString()} />
        <StatCard label="활성 사용자" value={data.totals.activeUsers.toLocaleString()} />
        <StatCard label="카톡 상담 클릭" value={data.totals.kakaoConsultClicks.toLocaleString()} accent />
        <StatCard label="전환율" value={`${data.totals.conversionRate.toFixed(2)}%`} accent />
      </div>

      {/* 일자별 추세 */}
      <div>
        <h4 className="mb-2 text-xs font-semibold text-gray-500">일자별 페이지뷰 / 카톡 클릭</h4>
        {data.daily.length === 0 ? (
          <p className="text-xs text-gray-400">데이터 없음</p>
        ) : (
          <div className="space-y-1">
            {data.daily.map((d) => (
              <div key={d.date} className="flex items-center gap-2 text-xs">
                <span className="w-16 shrink-0 text-gray-400">{d.date.slice(4)}</span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-gray-100">
                  <div
                    className="h-full rounded bg-[#4A2D6B]"
                    style={{ width: `${(d.pageViews / maxDailyPv) * 100}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right tabular-nums text-gray-600">
                  {d.pageViews.toLocaleString()}
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums text-amber-600">
                  {d.kakaoClicks > 0 ? `📞${d.kakaoClicks}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 인기 페이지 Top10 */}
      <div>
        <h4 className="mb-2 text-xs font-semibold text-gray-500">인기 페이지 Top 10</h4>
        {topPages.length === 0 ? (
          <p className="text-xs text-gray-400">데이터 없음</p>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              {topPages.map((p, i) => (
                <tr key={p.path} className="border-b border-gray-100">
                  <td className="py-1 pr-2 text-gray-400">{i + 1}</td>
                  <td className="truncate py-1 text-gray-700" title={p.path}>
                    {p.path}
                  </td>
                  <td className="py-1 pl-2 text-right tabular-nums font-semibold text-gray-800">
                    {p.views.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 소스 / 로케일 분해 (커스텀 디멘션 미등록 시 빈 배열) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h4 className="mb-2 text-xs font-semibold text-gray-500">카톡 클릭 — 소스별</h4>
          {data.kakaoBySource.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-400">
              커스텀 디멘션(source) 등록 전입니다.
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {data.kakaoBySource.map((s) => (
                <li key={s.source} className="flex justify-between">
                  <span className="text-gray-600">{s.source}</span>
                  <span className="tabular-nums font-semibold text-gray-800">{s.clicks.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold text-gray-500">로케일별</h4>
          {data.byLocale.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-400">
              커스텀 디멘션(locale) 등록 전입니다.
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {data.byLocale.map((l) => (
                <li key={l.locale} className="flex justify-between">
                  <span className="text-gray-600">{l.locale}</span>
                  <span className="tabular-nums text-gray-800">
                    {l.pageViews.toLocaleString()} PV · 📞{l.kakaoClicks}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
