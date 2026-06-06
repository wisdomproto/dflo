// src/features/marketing/components/AdCampaignForm.tsx
import { useState } from 'react';
import type { AdCampaign, AdPlatform, AdStatus, BudgetType } from '../services/marketingAdsService';
import { deriveMetrics, AD_REGIONS } from '../services/marketingAdsService';

const PLATFORMS: { id: AdPlatform; label: string }[] = [
  { id: 'meta', label: 'Meta' },
  { id: 'google', label: 'Google' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'naver', label: '네이버' },
];

const STATUSES: { id: AdStatus; label: string }[] = [
  { id: 'active', label: '진행중' },
  { id: 'paused', label: '일시중지' },
  { id: 'ended', label: '종료' },
  { id: 'draft', label: '초안' },
];

function numOr0(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function AdCampaignForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: AdCampaign | null;
  onSave: (patch: Partial<AdCampaign> & { id?: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [platform, setPlatform] = useState<AdPlatform>(initial?.platform ?? 'meta');
  const [status, setStatus] = useState<AdStatus>(initial?.status ?? 'active');
  const [objective, setObjective] = useState(initial?.objective ?? '');
  const [language, setLanguage] = useState(initial?.language ?? 'ko');
  const [region, setRegion] = useState(initial?.region ?? '');
  const [budget, setBudget] = useState(String(initial?.budget ?? 0));
  const [budgetType, setBudgetType] = useState<BudgetType>(initial?.budgetType ?? 'daily');
  const [periodStart, setPeriodStart] = useState(initial?.periodStart ?? '');
  const [periodEnd, setPeriodEnd] = useState(initial?.periodEnd ?? '');
  const [impressions, setImpressions] = useState(String(initial?.impressions ?? 0));
  const [clicks, setClicks] = useState(String(initial?.clicks ?? 0));
  const [conversions, setConversions] = useState(String(initial?.conversions ?? 0));
  const [spend, setSpend] = useState(String(initial?.spend ?? 0));
  const [revenue, setRevenue] = useState(String(initial?.revenue ?? 0));
  const [note, setNote] = useState(initial?.note ?? '');

  const d = deriveMetrics({
    impressions: numOr0(impressions),
    clicks: numOr0(clicks),
    conversions: numOr0(conversions),
    spend: numOr0(spend),
    revenue: numOr0(revenue),
  });

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id,
      name: name.trim(),
      platform,
      status,
      objective: objective.trim(),
      language: language.trim() || 'ko',
      region,
      channelId: initial?.channelId ?? null,
      budget: numOr0(budget),
      budgetType,
      periodStart: periodStart || null,
      periodEnd: periodEnd || null,
      impressions: numOr0(impressions),
      clicks: numOr0(clicks),
      conversions: numOr0(conversions),
      spend: numOr0(spend),
      revenue: numOr0(revenue),
      note: note.trim(),
    });
  };

  const fieldCls =
    'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none';
  const labelCls = 'mb-1 block text-xs font-medium text-gray-500';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-bold text-gray-800">{initial ? '캠페인 편집' : '새 캠페인'}</h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelCls}>캠페인 이름</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 5월 예상키 측정 유입" className={fieldCls} />
        </div>

        <div>
          <label className={labelCls}>플랫폼</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value as AdPlatform)} className={fieldCls}>
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>상태</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as AdStatus)} className={fieldCls}>
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>목표</label>
          <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="예: 전환 / 트래픽 / 인지도" className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>언어</label>
          <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="ko" className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>지역 (광고 타겟)</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className={fieldCls}>
            <option value="">미지정</option>
            {AD_REGIONS.map((r) => (
              <option key={r.code} value={r.code}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>예산</label>
          <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>예산 유형</label>
          <select value={budgetType} onChange={(e) => setBudgetType(e.target.value as BudgetType)} className={fieldCls}>
            <option value="daily">일 예산</option>
            <option value="lifetime">총 예산</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>시작일</label>
          <input type="date" value={periodStart ?? ''} onChange={(e) => setPeriodStart(e.target.value)} className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>종료일</label>
          <input type="date" value={periodEnd ?? ''} onChange={(e) => setPeriodEnd(e.target.value)} className={fieldCls} />
        </div>

        <div>
          <label className={labelCls}>노출</label>
          <input type="number" value={impressions} onChange={(e) => setImpressions(e.target.value)} className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>클릭</label>
          <input type="number" value={clicks} onChange={(e) => setClicks(e.target.value)} className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>전환</label>
          <input type="number" value={conversions} onChange={(e) => setConversions(e.target.value)} className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>지출 (₩)</label>
          <input type="number" value={spend} onChange={(e) => setSpend(e.target.value)} className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>매출 (₩)</label>
          <input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} className={fieldCls} />
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>메모</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="비고" className={fieldCls} />
        </div>
      </div>

      {/* 실시간 파생 미리보기 */}
      <div className="mt-3 grid grid-cols-5 gap-2 rounded-lg bg-gray-50 p-3 text-center">
        <Preview label="CTR" value={`${d.ctr.toFixed(2)}%`} />
        <Preview label="CPC" value={`₩${Math.round(d.cpc).toLocaleString()}`} />
        <Preview label="CPA" value={`₩${Math.round(d.cpa).toLocaleString()}`} />
        <Preview label="ROAS" value={d.roas.toFixed(2)} />
        <Preview label="전환율" value={`${d.convRate.toFixed(2)}%`} />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-600">
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving || !name.trim()}
          className="rounded-lg bg-[#4A2D6B] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );
}

function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-sm font-semibold tabular-nums text-[#4A2D6B]">{value}</div>
    </div>
  );
}
