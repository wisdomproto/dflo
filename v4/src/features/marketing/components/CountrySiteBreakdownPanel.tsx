// src/features/marketing/components/CountrySiteBreakdownPanel.tsx
// 국가 탭[한국/태국] → 페이지 4카드 + 이벤트 카드 + 전환율. days 는 부모에서 주입.
import { useEffect, useState } from 'react';
import { fetchSiteBreakdown, type SiteBreakdown, type CountryStats } from '../services/marketingAnalyticsService';

const COUNTRY_TABS: { code: 'ko' | 'th'; label: string; flag: string }[] = [
  { code: 'ko', label: '한국', flag: '🇰🇷' },
  { code: 'th', label: '태국', flag: '🇹🇭' },
];

const PAGE_CARDS: { key: keyof CountryStats['pageViews']; label: string }[] = [
  { key: 'main', label: '메인 페이지' },
  { key: 'clinic', label: '병원 소개' },
  { key: 'cases', label: '치료 사례' },
  { key: 'calculator', label: '예상키 측정' },
];

function PageCard({ label, views, total }: { label: string; views: number; total: number }) {
  const pct = total > 0 ? Math.round((views / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums text-gray-800">{views.toLocaleString()}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-gray-100">
        <div className="h-full rounded bg-[#4A2D6B]" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-gray-400">{pct}%</div>
    </div>
  );
}

export function CountrySiteBreakdownPanel({ days }: { days: number }) {
  const [country, setCountry] = useState<'ko' | 'th'>('ko');
  const [data, setData] = useState<SiteBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const d = await fetchSiteBreakdown(days);
        if (alive) setData(d);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : '사이트 분석 불러오기 실패');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [days]);

  return (
    <div className="space-y-4">
      {/* 국가 탭 */}
      <div className="flex gap-1">
        {COUNTRY_TABS.map((t) => (
          <button
            key={t.code}
            type="button"
            onClick={() => setCountry(t.code)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              country === t.code ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t.flag} {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="py-12 text-center text-sm text-gray-400">불러오는 중…</p>}
      {err && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-amber-700">데이터를 불러오지 못했습니다</p>
          <p className="mt-1 text-xs text-amber-600">{err}</p>
          <p className="mt-2 text-xs text-amber-500">GA4 OAuth 설정(ai-server)을 확인해주세요.</p>
        </div>
      )}

      {!loading && !err && data && (() => {
        const s = data.byCountry[country];
        const messengerLabel = s.messengerChannel === 'line' ? 'LINE' : '카카오톡';
        return (
          <div className="space-y-5">
            {/* 페이지뷰 4카드 */}
            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-500">페이지별 조회수</h4>
              <div className="grid grid-cols-2 gap-2">
                {PAGE_CARDS.map((p) => (
                  <PageCard key={p.key} label={p.label} views={s.pageViews[p.key]} total={s.pageViews.total} />
                ))}
              </div>
            </div>

            {/* 이벤트 카드 */}
            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-500">핵심 이벤트</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div className="text-xs text-gray-400">예상키 측정</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-[#4A2D6B]">{s.events.heightCalc.toLocaleString()}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div className="text-xs text-gray-400">{messengerLabel} 클릭</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-[#4A2D6B]">{s.events.messenger.toLocaleString()}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div className="text-xs text-gray-400">전환율</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-gray-800">{s.conversionRate.toFixed(2)}%</div>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">전환율 = {messengerLabel} 클릭 / 총 페이지뷰</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
