// src/features/marketing/components/CountrySiteBreakdownPanel.tsx
// 국가 탭[전체/한국/태국] → 요약 스코어카드(증감) + 일자별 추세 + 페이지별 + 이벤트 + 유입채널 + 디바이스.
import { useEffect, useState } from 'react';
import {
  fetchSiteBreakdown,
  type SiteBreakdown,
  type CountryStats,
  type CountryKey,
  type NamedCount,
  type GeoCountry,
} from '../services/marketingAnalyticsService';
import { SiteTrendChart } from './SiteTrendChart';

// 탭 = 언어(사이트) 단위 ko/th/vi/en. (방문자 실제 위치는 아래 '유입 지역' 패널)
const COUNTRY_TABS: { code: CountryKey; label: string; flag: string }[] = [
  { code: 'all', label: '전체', flag: '🌏' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'th', label: '태국어', flag: '🇹🇭' },
  { code: 'vi', label: '베트남어', flag: '🇻🇳' },
  { code: 'en', label: '영어', flag: '🇺🇸' },
];

const PAGE_CARDS: { key: keyof CountryStats['pageViews']; label: string }[] = [
  { key: 'main', label: '메인 페이지' },
  { key: 'clinic', label: '병원 소개' },
  { key: 'cases', label: '치료 사례' },
  { key: 'calculator', label: '예상키 측정(페이지)' },
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

// 유입 지역 — 나라(막대) → 클릭 시 도시 펼침
function GeoBreakdown({ items }: { items: GeoCountry[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!items.length) return <p className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-400">데이터 없음</p>;
  const max = Math.max(...items.map((i) => i.sessions), 1);
  return (
    <ul className="space-y-1.5">
      {items.slice(0, 10).map((c) => (
        <li key={c.label} className="text-xs">
          <button type="button" onClick={() => setOpen(open === c.label ? null : c.label)} className="w-full text-left">
            <div className="flex justify-between">
              <span className="text-gray-700">{c.cities.length > 0 ? (open === c.label ? '▾ ' : '▸ ') : ''}{c.label}</span>
              <span className="tabular-nums text-gray-500">{c.sessions.toLocaleString()} · {c.pct}%</span>
            </div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-gray-100">
              <div className="h-full rounded bg-[#4A2D6B]" style={{ width: `${(c.sessions / max) * 100}%` }} />
            </div>
          </button>
          {open === c.label && (
            <ul className="mb-1 mt-1 space-y-0.5 pl-4">
              {c.cities.slice(0, 10).map((ci) => (
                <li key={ci.label} className="flex justify-between text-[11px] text-gray-500">
                  <span>{ci.label}</span>
                  <span className="tabular-nums">{ci.sessions.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export function CountrySiteBreakdownPanel({ days, date }: { days: number; date: string | null }) {
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
        const d = await fetchSiteBreakdown(date ? { date } : days);
        if (alive) setData(d);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : '사이트 분석 불러오기 실패');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [days, date]);

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
              <p className="mt-1.5 text-[11px] text-gray-400">
                {date ? `📅 ${date} 하루 · ▲▼ 는 전일 대비 증감` : '▲▼ 는 직전 동일 기간 대비 증감'}
              </p>
            </div>

            {/* 일자별 추세 — 단일 하루(date)면 1포인트라 숨김 */}
            {!date && (
              <div>
                <h4 className="mb-2 text-xs font-semibold text-gray-500">일자별 추세 (사용자 / 세션 / 페이지뷰)</h4>
                <SiteTrendChart daily={s.daily} />
              </div>
            )}

            {/* 페이지별 */}
            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-500">페이지별 조회수</h4>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {PAGE_CARDS.map((p) => (
                  <PageCard key={p.key} label={p.label} views={s.pageViews[p.key]} total={s.pageViews.total} />
                ))}
              </div>
            </div>

            {/* 전환 퍼널 — 단계별 드롭오프(어디서 이탈?) */}
            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-500">전환 퍼널 — 어디서 이탈하나</h4>
              {(() => {
                const stages = [
                  { label: '홈 방문', value: s.pageViews.main },
                  { label: '예측키 패널 열람', value: s.events.calcOpen },
                  { label: '측정 완료', value: s.events.heightCalc },
                  { label: `${messengerLabel} 클릭`, value: s.events.messenger },
                ];
                const max = Math.max(1, ...stages.map((x) => x.value));
                return (
                  <div className="space-y-0.5">
                    {stages.map((st, i) => {
                      const prev = i > 0 ? stages[i - 1].value : null;
                      const drop = prev && prev > 0 ? Math.max(0, (1 - st.value / prev) * 100) : null;
                      const keep = prev && prev > 0 ? (st.value / prev) * 100 : null;
                      return (
                        <div key={st.label}>
                          {i > 0 && (
                            <div className="py-0.5 pl-24 text-[10px] text-rose-500">
                              ↓ {drop !== null ? `${drop.toFixed(1)}% 이탈` : '—'}
                              {keep !== null && <span className="text-gray-400"> (유지 {keep.toFixed(0)}%)</span>}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <div className="w-24 shrink-0 text-xs text-gray-500">{st.label}</div>
                            <div className="h-6 flex-1 overflow-hidden rounded bg-gray-100">
                              <div className="h-full rounded bg-[#667eea]" style={{ width: `${(st.value / max) * 100}%` }} />
                            </div>
                            <div className="w-14 text-right text-sm font-bold tabular-nums text-[#4A2D6B]">{st.value.toLocaleString()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <p className="mt-2 text-[11px] text-gray-400">
                치료사례 페이지 열람 {s.pageViews.cases.toLocaleString()}회 · 전체 전환율 {s.conversionRate.toFixed(2)}%({messengerLabel} 클릭 / 총 PV)
                <br />광고(cpc) 유입은 홈에서 예측키 패널이 자동으로 떠 <b>홈 방문 ≈ 열람</b>. 큰 이탈은 보통 <b>열람→측정 완료</b> 구간.
              </p>
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

            {/* 유입 지역 — 방문자의 실제 지리적 위치 (언어 탭과 별개) */}
            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-500">유입 지역 — 실제 접속 위치 (나라 ▸ 도시)</h4>
              <GeoBreakdown key={country} items={s.geo} />
              <p className="mt-1.5 text-[11px] text-gray-400">
                {COUNTRY_TABS.find((t) => t.code === country)?.label} 사이트 방문자가 <b>실제로 어느 나라·도시</b>에서 접속했는지 (GA4 위치). 나라를 누르면 도시별로 펼쳐집니다.
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
