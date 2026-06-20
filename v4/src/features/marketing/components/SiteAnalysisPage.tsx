// src/features/marketing/components/SiteAnalysisPage.tsx
// 사이트 분석: GA4 트래픽 전용. 국가 탭(전체/한국/태국) + 기간 선택(지난 N일) 또는 특정 하루(일별).
// (SEO / 온페이지 감사는 /marketing/seo-audit 로 분리됨)
import { useState } from 'react';
import { CountrySiteBreakdownPanel } from './CountrySiteBreakdownPanel';

const DAY_OPTIONS = [7, 14, 30, 90] as const;

const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => fmtDate(new Date());
function shiftStr(s: string, delta: number): string {
  const d = new Date(`${s}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return fmtDate(d);
}

export function SiteAnalysisPage() {
  const [days, setDays] = useState<number>(30);
  // date 가 set 이면 그 하루(일별 보기), null 이면 기간(지난 N일) 모드.
  const [date, setDate] = useState<string | null>(null);
  const today = todayStr();

  const pickDays = (d: number) => { setDays(d); setDate(null); };
  const goToday = () => setDate(today);
  const goPrev = () => setDate((cur) => shiftStr(cur ?? today, -1));
  const goNext = () => setDate((cur) => {
    const n = shiftStr(cur ?? today, 1);
    return n > today ? today : n; // 미래는 데이터 없음 → 오늘로 캡
  });

  const dateMode = date !== null;
  const pillBase = 'rounded-full px-3 py-1 text-xs transition-colors';
  const active = 'bg-[#4A2D6B] text-white';
  const idle = 'bg-gray-100 text-gray-600 hover:bg-gray-200';

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 px-6 py-3">
        <h2 className="text-base font-bold text-gray-800">사이트 분석</h2>
        <span className="text-xs text-gray-400">우리 사이트 GA4 트래픽</span>

        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* 기간(지난 N일) */}
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs text-gray-400">기간</span>
            {DAY_OPTIONS.map((d) => (
              <button type="button" key={d} onClick={() => pickDays(d)}
                className={`${pillBase} ${!dateMode && days === d ? active : idle}`}>
                {d}일
              </button>
            ))}
          </div>

          <span className="text-gray-200">|</span>

          {/* 특정 하루(일별) */}
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs text-gray-400">날짜</span>
            <input
              type="date"
              value={date ?? ''}
              max={today}
              onChange={(e) => setDate(e.target.value || null)}
              className={`rounded-lg border px-2 py-1 text-xs ${dateMode ? 'border-[#4A2D6B] text-[#4A2D6B]' : 'border-gray-200 text-gray-500'}`}
            />
            <button type="button" onClick={goPrev} className={`${pillBase} ${idle}`} title="하루 전">◀ 어제</button>
            <button type="button" onClick={goToday}
              className={`${pillBase} ${dateMode && date === today ? active : idle}`}>오늘</button>
            <button type="button" onClick={goNext} disabled={dateMode && date >= today}
              className={`${pillBase} ${idle} disabled:opacity-40`} title="하루 뒤">다음날 ▶</button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <CountrySiteBreakdownPanel days={days} date={date} />
      </div>
    </div>
  );
}
