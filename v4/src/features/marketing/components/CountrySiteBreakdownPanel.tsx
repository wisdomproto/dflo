// src/features/marketing/components/CountrySiteBreakdownPanel.tsx
// 국가 탭[전체/한국/태국] → 요약 스코어카드(증감) + 일자별 추세 + 페이지별 + 이벤트 + 유입채널 + 디바이스.
import { useEffect, useState } from 'react';
import {
  fetchSiteBreakdown,
  type SiteBreakdown,
  type CountryStats,
  type CountryKey,
  type NamedCount,
} from '../services/marketingAnalyticsService';
import { SiteTrendChart } from './SiteTrendChart';

const COUNTRY_TABS: { code: CountryKey; label: string; flag: string }[] = [
  { code: 'all', label: '전체', flag: '🌏' },
  { code: 'ko', label: '한국', flag: '🇰🇷' },
  { code: 'th', label: '태국', flag: '🇹🇭' },
];

const PAGE_CARDS: { key: keyof CountryStats['pageViews']; label: string }[] = [
  { key: 'main', label: '메인 페이지' },
  { key: 'clinic', label: '병원 소개' },
  { key: 'cases', label: '치료 사례' },
  { key: 'calculator', label: '예상키 측정' },
];

// 유입채널 라벨은 ai-server 가 소스를 플랫폼 단위(🔍 구글/📸 인스타그램/🤖 ChatGPT…)로
// 정규화해 내려줌 — 클라 측 라벨 매핑 불필요 (옛 채널 그룹 매핑 제거).
const DEVICE_LABELS: Record<string, string> = { mobile: '모바일', desktop: '데스크톱', tablet: '태블릿' };

function fmtDuration(sec: number): string {
  const s = Math.round(sec);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}분 ${r}초` : `${m}분`;
}

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (prev <= 0) {
    return cur > 0
      ? <span className="text-[11px] font-semibold text-emerald-600">신규</span>
      : <span className="text-[11px] text-gray-300">—</span>;
  }
  const d = ((cur - prev) / prev) * 100;
  const up = d >= 0;
  return (
    <span className={`text-[11px] font-semibold ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(d).toFixed(0)}%
    </span>
  );
}

function ScoreCard({ label, value, cur, prev, accent }: { label: string; value: string; cur: number; prev: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-1">
        <span className={`text-xl font-bold tabular-nums ${accent ? 'text-[#4A2D6B]' : 'text-gray-800'}`}>{value}</span>
        <Delta cur={cur} prev={prev} />
      </div>
    </div>
  );
}

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

function BreakdownBars({ items, labels }: { items: NamedCount[]; labels?: Record<string, string> }) {
  if (!items.length) return <p className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-400">데이터 없음</p>;
  const max = Math.max(...items.map((i) => i.sessions), 1);
  return (
    <ul className="space-y-1.5">
      {items.slice(0, 8).map((it) => (
        <li key={it.label} className="text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">{labels?.[it.label] ?? it.label}</span>
            <span className="tabular-nums text-gray-500">{it.sessions.toLocaleString()} · {it.pct}%</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-gray-100">
            <div className="h-full rounded bg-[#7C5BA6]" style={{ width: `${(it.sessions / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CountrySiteBreakdownPanel({ days }: { days: number }) {
  const [country, setCountry] = useState<CountryKey>('all');
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
        const su = s.summary;
        const pu = s.prevSummary;
        const messengerLabel = s.messengerChannel === 'line' ? 'LINE' : s.messengerChannel === 'kakao' ? '카카오톡' : '메신저';
        return (
          <div className="space-y-6">
            {/* 요약 스코어카드 */}
            <div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <ScoreCard label="사용자" value={su.users.toLocaleString()} cur={su.users} prev={pu.users} accent />
                <ScoreCard label="신규 사용자" value={su.newUsers.toLocaleString()} cur={su.newUsers} prev={pu.newUsers} />
                <ScoreCard label="재방문자" value={su.returningUsers.toLocaleString()} cur={su.returningUsers} prev={pu.returningUsers} />
                <ScoreCard label="세션" value={su.sessions.toLocaleString()} cur={su.sessions} prev={pu.sessions} />
                <ScoreCard label="페이지뷰" value={su.pageViews.toLocaleString()} cur={su.pageViews} prev={pu.pageViews} />
                <ScoreCard label="평균 참여시간" value={fmtDuration(su.avgEngagementSec)} cur={su.avgEngagementSec} prev={pu.avgEngagementSec} />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">▲▼ 는 직전 동일 기간 대비 증감</p>
            </div>

            {/* 일자별 추세 */}
            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-500">일자별 추세 (사용자 / 세션 / 페이지뷰)</h4>
              <SiteTrendChart daily={s.daily} />
            </div>

            {/* 페이지별 */}
            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-500">페이지별 조회수</h4>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {PAGE_CARDS.map((p) => (
                  <PageCard key={p.key} label={p.label} views={s.pageViews[p.key]} total={s.pageViews.total} />
                ))}
              </div>
            </div>

            {/* 이벤트 — 예측키 열람→측정 완료 퍼널 + 메신저 전환 */}
            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-500">핵심 이벤트 (예측키 퍼널)</h4>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div className="text-xs text-gray-400">예측키 패널 열람</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-[#4A2D6B]">{s.events.calcOpen.toLocaleString()}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div className="text-xs text-gray-400">예상키 측정 완료</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-[#4A2D6B]">{s.events.heightCalc.toLocaleString()}</div>
                  <div className="mt-0.5 text-[10px] text-emerald-600">열람 중 {s.calcCompletionRate.toFixed(1)}% 완료</div>
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
              <p className="mt-1 text-[11px] text-gray-400">열람→완료 = 측정 완료 / 패널 열람 · 전환율 = {messengerLabel} 클릭 / 총 페이지뷰</p>
            </div>

            {/* 유입 채널 + 디바이스 */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <h4 className="mb-2 text-xs font-semibold text-gray-500">유입 채널</h4>
                <BreakdownBars items={s.channels} />
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold text-gray-500">디바이스</h4>
                <BreakdownBars items={s.devices} labels={DEVICE_LABELS} />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
