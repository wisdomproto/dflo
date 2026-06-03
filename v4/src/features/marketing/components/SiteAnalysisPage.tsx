// src/features/marketing/components/SiteAnalysisPage.tsx
// 사이트 분석: 좌(GA4 트래픽 요약, 기존 프록시 재사용) + 우(규칙 기반 SEO 감사, 키 없이 동작) 2분할.
import { useEffect, useState } from 'react';
import { fetchAuditHistory, type SavedAudit } from '../services/marketingAuditService';
import { TrafficSummaryPanel } from './TrafficSummaryPanel';
import { SeoAuditPanel } from './SeoAuditPanel';

const DAY_OPTIONS = [7, 30, 90] as const;

export function SiteAnalysisPage() {
  const [days, setDays] = useState<number>(30);
  const [history, setHistory] = useState<SavedAudit[]>([]);

  const reloadHistory = () => {
    fetchAuditHistory().then(setHistory);
  };
  useEffect(reloadHistory, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-6 py-3">
        <h2 className="text-base font-bold text-gray-800">사이트 분석</h2>
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 text-xs text-gray-400">트래픽 기간</span>
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

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-600">📈 우리 사이트 트래픽 (GA4)</h3>
          <TrafficSummaryPanel days={days} />
        </section>
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-600">🔍 SEO / 온페이지 감사</h3>
          <SeoAuditPanel history={history} onSaved={reloadHistory} />
        </section>
      </div>
    </div>
  );
}
