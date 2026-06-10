// src/features/marketing/components/SeoAuditPage.tsx
// SEO / 온페이지 감사 — 사이트 분석에서 분리된 독립 페이지 (규칙 기반, 키 없이 동작).
import { useEffect, useState } from 'react';
import { fetchAuditHistory, type SavedAudit } from '../services/marketingAuditService';
import { SeoAuditPanel } from './SeoAuditPanel';

export function SeoAuditPage() {
  const [history, setHistory] = useState<SavedAudit[]>([]);

  const reload = () => {
    fetchAuditHistory().then(setHistory);
  };
  useEffect(reload, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-6 py-3">
        <h2 className="text-base font-bold text-gray-800">SEO / 온페이지 감사</h2>
        <span className="text-xs text-gray-400">규칙 기반 온페이지 점검 (키 없이 동작)</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <SeoAuditPanel history={history} onSaved={reload} />
      </div>
    </div>
  );
}
