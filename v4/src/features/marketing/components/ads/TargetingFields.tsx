// src/features/marketing/components/ads/TargetingFields.tsx
// 타겟 입력 — 지역·관심사는 Meta 타게팅 검색으로 실제 엔티티(geo key·관심사 id)를 골라
// 저장하므로 푸시 시 그대로 Meta Marketing API 에 반영된다. 연령·성별·노출위치는 칩/숫자.
import type { AdTargeting, GeoSpec, InterestSpec, Gender } from '../../services/adWorkspaceService';
import { searchAdGeo, searchAdInterest, type GeoResult, type InterestResult } from '../../services/marketingAdsService';
import { PLACEMENTS, GEO_PRESETS, INTEREST_PRESETS } from './adConstants';
import { AsyncTokenField } from './AsyncTokenField';
import { AudienceTargeting } from './AudienceTargeting';

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

// 시장(언어) → 타겟 국가코드. 지역 검색에서 region/city 를 이 국가로 필터.
const MARKET_COUNTRY: Record<string, string> = { ko: 'KR', en: 'US', th: 'TH', vi: 'VN' };
const TYPE_LABEL: Record<GeoSpec['type'], string> = { country: '국가', region: '지역', city: '도시', zip: '우편' };

function fmtAudience(n?: number): string | undefined {
  if (!n) return undefined;
  if (n >= 1e6) return `~${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `~${Math.round(n / 1e3)}K`;
  return `~${n}`;
}

export function TargetingFields({
  market,
  targeting,
  onChange,
  placements,
  onPlacementsChange,
  accountExternalId,
}: {
  market: string;
  targeting: AdTargeting;
  onChange: (t: AdTargeting) => void;
  placements: string[];
  onPlacementsChange: (p: string[]) => void;
  accountExternalId?: string;
}) {
  const t = targeting;
  const num = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const country = MARKET_COUNTRY[market];

  const addGeo = (r: GeoResult) => {
    if (r.key && t.geos.some((g) => g.key === r.key)) return;
    const spec: GeoSpec = { type: r.type, key: r.key, name: r.name };
    if (r.type === 'city') {
      spec.radius = 17;
      spec.distanceUnit = 'kilometer';
    }
    onChange({ ...t, geos: [...t.geos, spec] });
  };
  const updateGeo = (i: number, patch: Partial<GeoSpec>) =>
    onChange({ ...t, geos: t.geos.map((g, idx) => (idx === i ? { ...g, ...patch } : g)) });
  const removeGeo = (i: number) => onChange({ ...t, geos: t.geos.filter((_, idx) => idx !== i) });

  const addInterest = (r: InterestResult) => {
    if (r.id && t.interests.some((x) => x.id === r.id)) return;
    const spec: InterestSpec = { id: r.id, name: r.name };
    onChange({ ...t, interests: [...t.interests, spec] });
  };
  const removeInterest = (i: number) => onChange({ ...t, interests: t.interests.filter((_, idx) => idx !== i) });

  const label = 'mb-1 block text-xs font-medium text-gray-500';
  const field = 'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none';
  const chip = (on: boolean) =>
    `rounded-full border px-2.5 py-1 text-xs ${on ? 'border-[#4A2D6B] bg-[#4A2D6B]/10 text-[#4A2D6B]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`;

  return (
    <div className="space-y-3">
      {/* 지역 */}
      <div>
        <label className={label}>타겟 지역 <span className="text-[10px] text-gray-400">(검색해서 선택 — 도시는 반경 조절)</span></label>
        {t.geos.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {t.geos.map((g, i) => (
              <span key={`${g.key}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-[#4A2D6B]/10 px-2 py-1 text-xs text-[#4A2D6B]">
                {!g.key && <span title="미해석 — 다시 검색해 선택하세요(타겟 미반영)" className="text-amber-500">⚠</span>}
                <span className="text-[10px] text-[#4A2D6B]/50">{TYPE_LABEL[g.type]}</span>
                {g.name}
                {g.type === 'city' && g.key && (
                  <span className="inline-flex items-center gap-0.5">
                    <input
                      type="number"
                      min={1}
                      max={80}
                      value={g.radius ?? 17}
                      onChange={(e) => updateGeo(i, { radius: Math.min(80, Math.max(1, num(e.target.value) || 17)) })}
                      className="w-9 rounded border border-[#4A2D6B]/20 px-1 text-[10px] focus:outline-none"
                    />
                    <span className="text-[9px] text-[#4A2D6B]/60">km</span>
                  </span>
                )}
                <button type="button" onClick={() => removeGeo(i)} className="text-[#4A2D6B]/60 hover:text-[#4A2D6B]">✕</button>
              </span>
            ))}
          </div>
        )}
        <AsyncTokenField<GeoResult>
          placeholder="지역 검색 (예: Bangkok)"
          presets={GEO_PRESETS[market] ?? []}
          search={(q) => searchAdGeo(q, country)}
          getKey={(r) => `${r.type}:${r.key}`}
          getLabel={(r) => r.name}
          getSub={(r) => [TYPE_LABEL[r.type as GeoSpec['type']] ?? r.type, r.region, r.countryName ?? r.countryCode].filter(Boolean).join(' · ')}
          onPick={addGeo}
        />
      </div>

      {/* 연령 + 성별 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>연령</label>
          <div className="flex items-center gap-2">
            <input type="number" value={t.ageMin} onChange={(e) => onChange({ ...t, ageMin: num(e.target.value) })} className={field} />
            <span className="text-gray-400">~</span>
            <input type="number" value={t.ageMax} onChange={(e) => onChange({ ...t, ageMax: num(e.target.value) })} className={field} />
          </div>
        </div>
        <div>
          <label className={label}>성별 {t.genders.length === 0 && <span className="text-[10px] text-gray-400">(전체)</span>}</label>
          <div className="flex gap-1.5 pt-1">
            {([['female', '여성'], ['male', '남성']] as [Gender, string][]).map(([g, lab]) => (
              <button key={g} type="button" onClick={() => onChange({ ...t, genders: toggle(t.genders, g) })} className={chip(t.genders.includes(g))}>{lab}</button>
            ))}
          </div>
        </div>
      </div>

      {/* 관심사 */}
      <div>
        <label className={label}>관심사 <span className="text-[10px] text-gray-400">(Meta 관심사 검색)</span></label>
        {t.interests.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {t.interests.map((it, i) => (
              <span key={`${it.id}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                {!it.id && <span title="미해석 — 다시 검색해 선택하세요(타겟 미반영)" className="text-amber-500">⚠</span>}
                {it.name}
                <button type="button" onClick={() => removeInterest(i)} className="text-gray-400 hover:text-gray-600">✕</button>
              </span>
            ))}
          </div>
        )}
        <AsyncTokenField<InterestResult>
          placeholder="관심사 검색 (예: Parenting)"
          presets={INTEREST_PRESETS}
          search={searchAdInterest}
          getKey={(r) => r.id}
          getLabel={(r) => r.name}
          getSub={(r) => fmtAudience(r.audienceUpper ?? r.audienceLower) ?? (r.path?.[r.path.length - 1])}
          onPick={addInterest}
        />
      </div>

      {/* 맞춤 타겟(리타게팅) */}
      <AudienceTargeting accountExternalId={accountExternalId} market={market} targeting={t} onChange={onChange} />

      {/* 노출 위치 */}
      <div>
        <label className={label}>
          노출 위치 {placements.length === 0 && <span className="text-[10px] text-gray-400">(Meta 자동)</span>}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PLACEMENTS.map((p) => (
            <button key={p.id} type="button" onClick={() => onPlacementsChange(toggle(placements, p.id))} className={chip(placements.includes(p.id))}>{p.label}</button>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-gray-400">선택 안 하면 Meta가 페북·인스타·릴스 등에 자동 배분합니다.</p>
      </div>
    </div>
  );
}
