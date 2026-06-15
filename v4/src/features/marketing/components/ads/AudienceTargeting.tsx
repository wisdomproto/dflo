// src/features/marketing/components/ads/AudienceTargeting.tsx
// 맞춤 타겟(리타게팅 풀) 포함/제외 선택 + 유사타겟(Lookalike) 생성.
// 광고계정(act_…)이 있어야 동작 — Meta 에서 그 계정의 custom audiences 를 불러온다.
import { useEffect, useState } from 'react';
import type { AdTargeting, AudienceSpec } from '../../services/adWorkspaceService';
import { listCustomAudiences, createLookalike, type AudienceResult } from '../../services/marketingAdsService';

const MARKET_COUNTRY: Record<string, string> = { ko: 'KR', en: 'US', th: 'TH', vi: 'VN' };
const SUBTYPE_LABEL: Record<string, string> = {
  WEBSITE: '웹사이트', CUSTOM: '맞춤', LOOKALIKE: '유사', ENGAGEMENT: '참여',
  VIDEO: '영상', IG_BUSINESS: '인스타', PAGE: '페이지', OFFLINE_CONVERSION: '오프라인',
};

function fmtCount(n?: number): string {
  if (n === undefined) return '';
  if (n >= 1e6) return `~${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `~${Math.round(n / 1e3)}K`;
  return `~${n}`;
}

export function AudienceTargeting({
  accountExternalId,
  market,
  targeting,
  onChange,
}: {
  accountExternalId?: string;
  market: string;
  targeting: AdTargeting;
  onChange: (t: AdTargeting) => void;
}) {
  const [audiences, setAudiences] = useState<AudienceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [showLal, setShowLal] = useState(false);
  const [lalSource, setLalSource] = useState('');
  const [lalRatio, setLalRatio] = useState(0.01);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | undefined>();

  const load = () => {
    if (!accountExternalId) {
      setAudiences([]);
      setError(undefined);
      return;
    }
    setLoading(true);
    setError(undefined);
    listCustomAudiences(accountExternalId)
      .then((r) => {
        setAudiences(r.audiences);
        setError(r.error);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, [accountExternalId]);

  const inc = targeting.customAudiences;
  const exc = targeting.excludedAudiences;
  const isInc = (id: string) => inc.some((a) => a.id === id);
  const isExc = (id: string) => exc.some((a) => a.id === id);

  const toggleInclude = (a: AudienceResult) => {
    const spec: AudienceSpec = { id: a.id, name: a.name };
    onChange({
      ...targeting,
      customAudiences: isInc(a.id) ? inc.filter((x) => x.id !== a.id) : [...inc, spec],
      excludedAudiences: exc.filter((x) => x.id !== a.id),
    });
  };
  const toggleExclude = (a: AudienceResult) => {
    const spec: AudienceSpec = { id: a.id, name: a.name };
    onChange({
      ...targeting,
      excludedAudiences: isExc(a.id) ? exc.filter((x) => x.id !== a.id) : [...exc, spec],
      customAudiences: inc.filter((x) => x.id !== a.id),
    });
  };

  const doCreateLal = async () => {
    if (!accountExternalId || !lalSource) return;
    setCreating(true);
    setMsg(undefined);
    const country = MARKET_COUNTRY[market] || 'KR';
    const src = audiences.find((a) => a.id === lalSource);
    const r = await createLookalike(accountExternalId, {
      sourceAudienceId: lalSource,
      country,
      ratio: lalRatio,
      name: `유사 ${country} ${Math.round(lalRatio * 100)}% · ${src?.name ?? ''}`.trim(),
    });
    setCreating(false);
    if (r.ok) {
      setMsg('✅ 유사타겟 생성됨 (모수가 채워지는 데 시간이 걸립니다)');
      setShowLal(false);
      load();
    } else {
      setMsg(`⚠ ${r.error || '생성 실패'}`);
    }
  };

  const label = 'mb-1 block text-xs font-medium text-gray-500';
  const seg = (on: boolean, tone: 'inc' | 'exc') =>
    `rounded px-2 py-0.5 text-[11px] ${on ? (tone === 'inc' ? 'bg-[#4A2D6B] text-white' : 'bg-red-500 text-white') : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`;

  return (
    <div>
      <label className={label}>
        맞춤 타겟 <span className="text-[10px] text-gray-400">(리타게팅 풀 · 포함/제외 · 유사타겟)</span>
      </label>

      {!accountExternalId && (
        <p className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-[11px] text-gray-400">
          광고 계정을 먼저 선택하면 그 계정의 리타게팅 풀(웹사이트 방문자·영상 시청자 등)을 불러옵니다.
        </p>
      )}
      {accountExternalId && loading && <p className="px-1 py-1 text-[11px] text-gray-400">불러오는 중…</p>}
      {accountExternalId && !loading && error && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-600">{error}</p>
      )}
      {accountExternalId && !loading && !error && audiences.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-[11px] text-gray-400">
          맞춤 타겟이 없습니다. 픽셀에 방문/측정 데이터가 쌓이면 Meta에서 만들 수 있고, 여기서 유사타겟도 만들 수 있습니다.
        </p>
      )}

      {audiences.length > 0 && (
        <div className="space-y-1">
          {audiences.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-lg border border-gray-100 px-2.5 py-1.5">
              <span className="min-w-0 flex-1 truncate text-xs text-gray-700">
                {a.name}
                <span className="ml-1.5 text-[10px] text-gray-400">
                  {SUBTYPE_LABEL[a.subtype] ?? a.subtype}
                  {a.approxCount !== undefined && ` · ${fmtCount(a.approxCount)}`}
                  {a.ready === false && ' · 준비중'}
                </span>
              </span>
              <button type="button" onClick={() => toggleInclude(a)} className={seg(isInc(a.id), 'inc')}>포함</button>
              <button type="button" onClick={() => toggleExclude(a)} className={seg(isExc(a.id), 'exc')}>제외</button>
            </div>
          ))}
        </div>
      )}

      {/* 유사타겟 만들기 */}
      {accountExternalId && audiences.length > 0 && (
        <div className="mt-1.5">
          <button type="button" onClick={() => setShowLal((v) => !v)} className="text-[11px] font-medium text-[#4A2D6B] hover:underline">
            {showLal ? '− 유사타겟 만들기 닫기' : '+ 유사타겟(Lookalike) 만들기'}
          </button>
          {showLal && (
            <div className="mt-1.5 flex flex-wrap items-end gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2.5">
              <div className="min-w-[160px] flex-1">
                <label className="mb-0.5 block text-[10px] text-gray-400">원본 (시드)</label>
                <select value={lalSource} onChange={(e) => setLalSource(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none">
                  <option value="">선택…</option>
                  {audiences.filter((a) => a.subtype !== 'LOOKALIKE').map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] text-gray-400">유사도</label>
                <select value={lalRatio} onChange={(e) => setLalRatio(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none">
                  <option value={0.01}>1%</option>
                  <option value={0.02}>2%</option>
                  <option value={0.03}>3%</option>
                </select>
              </div>
              <button
                type="button"
                onClick={doCreateLal}
                disabled={!lalSource || creating}
                className="rounded-lg bg-[#4A2D6B] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                {creating ? '생성 중…' : '만들기'}
              </button>
              <span className="text-[10px] text-gray-400">{MARKET_COUNTRY[market] || 'KR'} 기준</span>
            </div>
          )}
          {msg && <p className="mt-1 text-[11px] text-gray-500">{msg}</p>}
        </div>
      )}
    </div>
  );
}
