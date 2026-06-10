// src/features/marketing/components/SiteAnalysisPage.tsx
// 사이트 분석: GA4 트래픽 전용. 국가 탭(전체/한국/태국) + 기간 선택.
// (SEO / 온페이지 감사는 /marketing/seo-audit 로 분리됨)
import { useState } from 'react';
import { CountrySiteBreakdownPanel } from './CountrySiteBreakdownPanel';

const DAY_OPTIONS = [7, 14, 30, 90] as const;

export function SiteAnalysisPage() {
  const [days, setDays] = useState<number>(30);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-6 py-3">
        <h2 className="text-base font-bold text-gray-800">사이트 분석</h2>
        <span className="text-xs text-gray-400">우리 사이트 GA4 트래픽</span>
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 text-xs text-gray-400">기간</span>
          {DAY_OPTIONS.map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full px-3 py-1 text-xs ${
                days === d ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <CountrySiteBreakdownPanel days={days} />
      </div>
    </div>
  );
}
