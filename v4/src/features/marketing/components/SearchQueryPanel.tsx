// src/features/marketing/components/SearchQueryPanel.tsx
// 🔍 구글 검색 유입 — 검색어 / 국가 / 페이지 (Google Search Console).
//
// ★이 패널만 GA4 가 아니라 GSC 를 쓴다. 구글은 오가닉 검색어를 애널리틱스에 안 넘겨서
//   ("not provided") GA4 로는 sessionSource=google 까지만 알 수 있다. 검색어는 GSC 에만 있다.
// ⚠️ GSC 는 속성 등록 이전 데이터를 소급 제공하지 않고 반영이 1~3일 지연된다(2026-07-17 등록).
import { useEffect, useState } from 'react';
import { fetchSearchConsole, type CountryKey, type SearchConsoleData, type SearchRow } from '../services/marketingAnalyticsService';

const TABS: { key: CountryKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'ko', label: '🇰🇷 한국어' },
  { key: 'th', label: '🇹🇭 태국어' },
  { key: 'vi', label: '🇻🇳 베트남어' },
  { key: 'en', label: '🇺🇸 영어' },
  { key: 'zh-hant', label: '🇹🇼 번체' },
  { key: 'zh-hans', label: '🀄 간체' },
  { key: 'ar', label: '🇸🇦 아랍어' },
  { key: 'ja', label: '🇯🇵 일본어' },
  { key: 'es', label: '🇪🇸 스페인어' },
];

type View = 'queries' | 'countries' | 'pages';
const VIEWS: { key: View; label: string }[] = [
  { key: 'queries', label: '검색어' },
  { key: 'countries', label: '국가' },
  { key: 'pages', label: '페이지' },
];

const pillBase = 'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors';
const active = 'bg-[#4A2D6B] text-white';
const idle = 'bg-gray-100 text-gray-500 hover:bg-gray-200';

/** 페이지 URL 은 길어서 표에서 도메인을 떼고 경로만 보여준다. */
function shortLabel(view: View, label: string): string {
  if (view !== 'pages') return label;
  try {
    return new URL(label).pathname;
  } catch {
    return label;
  }
}

const COLLAPSED_ROWS = 12; // 접힘 상태에서 보여줄 행 수.

export function SearchQueryPanel({ days, date }: { days: number; date: string | null }) {
  const [lang, setLang] = useState<CountryKey>('all');
  const [view, setView] = useState<View>('queries');
  const [data, setData] = useState<SearchConsoleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // 탭/기간/언어가 바뀌면 목록이 달라지므로 다시 접는다.
  useEffect(() => setExpanded(false), [view, lang, days, date]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const d = await fetchSearchConsole(date ? { date } : days, lang);
        if (alive) setData(d);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : '검색어 분석 불러오기 실패');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [days, date, lang]);

  // 클릭된 검색어를 무조건 맨 위에. GSC 응답 순서에 의존하지 않고 명시적으로 클릭 내림차순 정렬.
  // JS sort 는 안정 정렬이라 0클릭 동률 행은 GSC 원래 순서(노출 순)를 유지한다.
  const rows: SearchRow[] = data ? [...data[view]].sort((a, b) => b.clicks - a.clicks) : [];
  const visibleRows = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);
  const hiddenCount = rows.length - visibleRows.length;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h4 className="text-xs font-semibold text-gray-500">🔍 구글 검색 유입</h4>
        <span className="text-[11px] text-gray-400">Search Console · GA4 엔 없는 데이터</span>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setLang(t.key)}
            className={`${pillBase} ${lang === t.key ? active : idle}`}>{t.label}</button>
        ))}
        <span className="mx-1 h-3 w-px bg-gray-200" />
        {VIEWS.map((v) => (
          <button key={v.key} type="button" onClick={() => setView(v.key)}
            className={`${pillBase} ${view === v.key ? active : idle}`}>{v.label}</button>
        ))}
      </div>

      {loading && <p className="py-6 text-center text-xs text-gray-400">불러오는 중…</p>}

      {err && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-center">
          <p className="text-xs font-semibold text-amber-700">데이터를 불러오지 못했습니다</p>
          <p className="mt-1 text-[11px] text-amber-600">{err}</p>
          <p className="mt-2 text-[11px] text-amber-600">
            Search Console 권한이 없다는 오류면 <code className="rounded bg-amber-100 px-1">npm run setup-ga4-oauth</code> 를
            다시 돌려 토큰을 재발급하세요(검색어 조회 스코프가 새로 추가됐습니다).
          </p>
        </div>
      )}

      {!loading && !err && data && (
        <>
          <div className="mb-2 grid grid-cols-4 gap-2">
            {[
              { label: '클릭', value: data.totals.clicks.toLocaleString() },
              { label: '노출', value: data.totals.impressions.toLocaleString() },
              { label: 'CTR', value: `${data.totals.ctr.toFixed(1)}%` },
              { label: '평균 순위', value: data.totals.position > 0 ? data.totals.position.toFixed(1) : '—' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                <p className="text-[11px] text-gray-400">{s.label}</p>
                <p className="text-sm font-bold tabular-nums text-gray-800">{s.value}</p>
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-[11px] text-gray-400">
              아직 표시할 검색 데이터가 없습니다 · GSC 는 등록(2026-07-17) 이전 데이터를 제공하지 않고 반영이 1~3일 걸립니다
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full min-w-[520px] text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-400">
                    <th className="px-3 py-2 font-semibold">{VIEWS.find((v) => v.key === view)?.label}</th>
                    <th className="px-3 py-2 text-right font-semibold">클릭</th>
                    <th className="px-3 py-2 text-right font-semibold">노출</th>
                    <th className="px-3 py-2 text-right font-semibold">CTR</th>
                    <th className="px-3 py-2 text-right font-semibold">평균 순위</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => (
                    <tr key={r.label} className="border-b border-gray-50 last:border-0">
                      <td className="max-w-[260px] truncate px-3 py-2 font-medium text-gray-700" title={r.label}>
                        {shortLabel(view, r.label)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-[#4A2D6B]">{r.clicks.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.impressions.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.ctr.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > COLLAPSED_ROWS && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="flex w-full items-center justify-center gap-1 border-t border-gray-100 bg-gray-50 py-2 text-[11px] font-semibold text-[#4A2D6B] hover:bg-gray-100"
                >
                  {expanded ? '▲ 접기' : `▼ 더 보기 (${hiddenCount}개)`}
                </button>
              )}
            </div>
          )}
        </>
      )}

      <p className="mt-1.5 text-[11px] text-gray-400">
        {date ? `📅 ${date} 하루` : '지난 기간'} · <strong>클릭된 검색어 우선</strong>(클릭 내림차순). 검색어 상위 200 · 국가·페이지 상위 50.
        총계는 국가 기준 합산이며, <strong>검색어 행의 합과 다를 수 있습니다</strong> — GSC 가 개인정보 보호를 위해 희소한 검색어를 숨깁니다(총계에만 잡히고 검색어로는 안 나옴).
      </p>
    </div>
  );
}
