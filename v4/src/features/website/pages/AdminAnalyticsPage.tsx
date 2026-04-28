// 사이트 분석 대시보드 — /banner-admin/analytics.
// ai-server (/api/analytics/overview) 를 통해 GA4 Data API 호출 (OAuth 인증).
// PIN 인증은 sessionStorage('website-admin-auth') 재사용.
//
// 위젯:
//  1) 요약 카드 4개 (페이지뷰 / 활성 사용자 / 카톡 상담 클릭 / 전환율)
//  2) 일자별 트렌드 (line chart)
//  3) 카톡 클릭 source별 (bar chart)
//  4) 나라별 (bar chart, locale)
//  5) 인기 페이지 top 10 (table)

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { fetchAnalyticsOverview, type AnalyticsOverview } from '../services/analyticsService';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const ADMIN_PIN = '8054';
const PROPERTY_ID = '529244912';
const GA4_DEEPLINK = `https://analytics.google.com/analytics/web/#/p${PROPERTY_ID}/reports/intelligenthome`;

const RANGE_OPTIONS: { label: string; days: number }[] = [
  { label: '최근 7일', days: 7 },
  { label: '최근 30일', days: 30 },
  { label: '최근 90일', days: 90 },
];

export default function AdminAnalyticsPage() {
  const [authed, setAuthed] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [days, setDays] = useState(7);
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem('website-admin-auth') === 'true') setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    setError(null);
    fetchAnalyticsOverview(days)
      .then(setData)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [authed, days]);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
          <h2 className="text-lg font-bold text-gray-900 mb-2">사이트 분석</h2>
          <p className="text-sm text-gray-500 mb-6">관리자 PIN 을 입력하세요</p>
          <input
            type="password" value={pinInput} maxLength={4} autoFocus
            onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (pinInput === ADMIN_PIN) {
                  sessionStorage.setItem('website-admin-auth', 'true');
                  sessionStorage.setItem('website_admin_pin', pinInput);
                  setAuthed(true);
                } else {
                  setPinError('비밀번호가 틀렸습니다');
                  setPinInput('');
                }
              }
            }}
            className="w-full text-center text-2xl tracking-widest font-bold bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-[#0F6E56] outline-none"
            placeholder="••••"
          />
          {pinError && <p className="mt-3 text-xs text-red-500 text-center">{pinError}</p>}
          <Link to="/banner-admin" className="mt-4 block text-center text-xs text-gray-400 hover:text-[#0F6E56]">
            ← 섹션 관리로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-14 px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="text-sm text-gray-500 hover:text-[#0F6E56] whitespace-nowrap">웹사이트</Link>
            <span className="text-gray-300">|</span>
            <Link to="/banner-admin" className="text-sm text-gray-500 hover:text-[#0F6E56] whitespace-nowrap">섹션 관리</Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-base font-bold text-gray-800 truncate">📊 사이트 분석</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 bg-gray-100 rounded-lg p-1">
              {RANGE_OPTIONS.map((opt) => (
                <button key={opt.days} onClick={() => setDays(opt.days)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                    days === opt.days ? 'bg-white text-[#0F6E56] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <a href={GA4_DEEPLINK} target="_blank" rel="noopener noreferrer"
              className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 whitespace-nowrap"
              title="GA4 사이트에서 직접 보기">
              GA4 ↗
            </a>
          </div>
        </div>
        {/* mobile range buttons */}
        <div className="md:hidden flex items-center gap-1.5 bg-gray-100 mx-4 mb-3 rounded-lg p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button key={opt.days} onClick={() => setDays(opt.days)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                days === opt.days ? 'bg-white text-[#0F6E56] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        {error && <ErrorCard error={error} />}

        {loading && !data && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">불러오는 중...</p>
          </div>
        )}

        {data && (
          <>
            <SummaryCards data={data} loading={loading} />
            <DailyChartCard data={data} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <KakaoSourceCard data={data} />
              <LocaleCard data={data} />
            </div>
            <TopPagesCard data={data} />
          </>
        )}
      </main>
    </div>
  );
}

function ErrorCard({ error }: { error: string }) {
  const isAuthMissing = /OAUTH_REFRESH_TOKEN|OAUTH_CLIENT/i.test(error);
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4">
      <p className="text-sm font-bold text-amber-900">데이터 로드 실패</p>
      <p className="text-xs text-amber-800 mt-1 whitespace-pre-wrap font-mono">{error}</p>
      {isAuthMissing && (
        <div className="mt-3 text-xs text-amber-800 space-y-1">
          <p className="font-bold">OAuth 설정이 아직 안 됐어요. ai-server 디렉토리에서:</p>
          <pre className="bg-white/60 rounded px-2 py-1.5 mt-1">npm run setup-ga4-oauth</pre>
          <p className="mt-1">실행 → 브라우저 인증 → 출력된 refresh token 을 .env 에 추가 → ai-server 재시작.</p>
        </div>
      )}
    </div>
  );
}

function SummaryCards({ data, loading }: { data: AnalyticsOverview; loading: boolean }) {
  const cards = [
    { label: '페이지뷰', value: data.totals.pageViews.toLocaleString(), color: 'text-indigo-600 bg-indigo-50' },
    { label: '활성 사용자', value: data.totals.activeUsers.toLocaleString(), color: 'text-blue-600 bg-blue-50' },
    { label: '카톡 상담 클릭', value: data.totals.kakaoConsultClicks.toLocaleString(), color: 'text-yellow-700 bg-yellow-50' },
    { label: '전환율', value: `${data.totals.conversionRate}%`, color: 'text-emerald-600 bg-emerald-50' },
  ];
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${loading ? 'opacity-60' : ''}`}>
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-2xl border border-gray-200 px-4 py-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-2">{c.label}</p>
          <p className={`inline-block text-2xl font-extrabold rounded-lg px-2 ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function fmtDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(6, 8)}`;
}

function DailyChartCard({ data }: { data: AnalyticsOverview }) {
  const labels = data.daily.map((d) => fmtDate(d.date));
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: '페이지뷰',
        data: data.daily.map((d) => d.pageViews),
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        yAxisID: 'y1',
        tension: 0.3,
        fill: true,
      },
      {
        label: '카톡 상담 클릭',
        data: data.daily.map((d) => d.kakaoClicks),
        borderColor: '#CA8A04',
        backgroundColor: 'rgba(202,138,4,0.15)',
        yAxisID: 'y2',
        tension: 0.3,
        fill: true,
      },
    ],
  }), [data, labels]);

  const options = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { position: 'bottom' as const } },
    scales: {
      y1: { type: 'linear' as const, position: 'left' as const, beginAtZero: true, title: { display: true, text: '페이지뷰' } },
      y2: { type: 'linear' as const, position: 'right' as const, beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: '카톡 클릭' } },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <h2 className="text-sm font-bold text-gray-700 mb-4">일자별 트렌드</h2>
      <div style={{ height: 320 }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

function KakaoSourceCard({ data }: { data: AnalyticsOverview }) {
  const sources = data.kakaoBySource;
  const empty = sources.length === 0;

  const chartData = {
    labels: sources.map((s) => sourceLabel(s.source)),
    datasets: [{
      label: '카톡 클릭',
      data: sources.map((s) => s.clicks),
      backgroundColor: '#CA8A04',
      borderRadius: 6,
    }],
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <h2 className="text-sm font-bold text-gray-700 mb-4">카톡 클릭 위치별</h2>
      {empty ? (
        <EmptyHint msg="아직 카톡 상담 클릭이 없거나, GA4 어드민에 'source' 가 사용자 정의 측정기준으로 등록되지 않았어요." />
      ) : (
        <div style={{ height: Math.max(220, sources.length * 32 + 40) }}>
          <Bar data={chartData} options={options} />
        </div>
      )}
    </div>
  );
}

function LocaleCard({ data }: { data: AnalyticsOverview }) {
  const rows = data.byLocale;
  const empty = rows.length === 0;
  const localeName: Record<string, string> = {
    ko: '🇰🇷 한국어', vn: '🇻🇳 베트남어', th: '🇹🇭 태국어',
    en: '🇬🇧 영어', zh: '🇨🇳 중국어', ja: '🇯🇵 일본어',
  };
  const chartData = {
    labels: rows.map((r) => localeName[r.locale] || r.locale.toUpperCase()),
    datasets: [
      {
        label: '페이지뷰', data: rows.map((r) => r.pageViews),
        backgroundColor: '#6366F1', borderRadius: 6,
      },
      {
        label: '카톡 클릭', data: rows.map((r) => r.kakaoClicks),
        backgroundColor: '#CA8A04', borderRadius: 6,
      },
    ],
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <h2 className="text-sm font-bold text-gray-700 mb-4">나라별 (locale)</h2>
      {empty ? (
        <EmptyHint msg="GA4 어드민에 'locale' 이 사용자 정의 측정기준으로 등록되지 않았거나, 아직 데이터가 없어요." />
      ) : (
        <div style={{ height: Math.max(220, rows.length * 50 + 60) }}>
          <Bar data={chartData} options={options} />
        </div>
      )}
    </div>
  );
}

function TopPagesCard({ data }: { data: AnalyticsOverview }) {
  const pages = data.topPages;
  const totalViews = pages.reduce((s, p) => s + p.views, 0) || 1;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <h2 className="text-sm font-bold text-gray-700 mb-4">인기 페이지 (Top {pages.length})</h2>
      {pages.length === 0 ? (
        <p className="text-xs text-gray-400 py-6 text-center">데이터 없음</p>
      ) : (
        <div className="space-y-2">
          {pages.map((p, i) => {
            const pct = (p.views / totalViews) * 100;
            return (
              <div key={`${p.path}-${i}`} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-6 tabular-nums text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-gray-700 truncate">{p.path}</span>
                    <span className="ml-3 tabular-nums text-gray-500">{p.views.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyHint({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-6 text-center">
      <p className="text-xs text-gray-500 leading-relaxed">{msg}</p>
    </div>
  );
}

function sourceLabel(source: string): string {
  const m: Record<string, string> = {
    header_drawer: '헤더 메뉴',
    bottom_tabbar: '하단 탭바',
    height_calc_result: '예상키 결과',
    case_slider: '사례 슬라이더',
    case_modal: '사례 모달',
    cases_slide: 'cases 슬라이드',
    guide_section: '가이드 섹션',
  };
  return m[source] || source;
}
