// src/features/marketing/components/ads/TargetingFields.tsx
// 타겟 입력(지역·연령·성별·관심사) + 노출 위치 — 캠페인 편집기에서 사용하는 controlled 필드.
import { useState } from 'react';
import type { AdTargeting, Gender } from '../../services/adWorkspaceService';
import { PLACEMENTS, GEO_PRESETS, INTEREST_PRESETS } from './adConstants';

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function TargetingFields({
  market,
  targeting,
  onChange,
  placements,
  onPlacementsChange,
}: {
  market: string;
  targeting: AdTargeting;
  onChange: (t: AdTargeting) => void;
  placements: string[];
  onPlacementsChange: (p: string[]) => void;
}) {
  const [geoInput, setGeoInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const t = targeting;
  const num = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const geoPresets = GEO_PRESETS[market] ?? [];
  const addGeo = (g: string) => {
    const v = g.trim();
    if (v && !t.geos.includes(v)) onChange({ ...t, geos: [...t.geos, v] });
    setGeoInput('');
  };
  const addInterest = (g: string) => {
    const v = g.trim();
    if (v && !t.interests.includes(v)) onChange({ ...t, interests: [...t.interests, v] });
    setInterestInput('');
  };

  const label = 'mb-1 block text-xs font-medium text-gray-500';
  const field = 'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none';
  const chip = (on: boolean) =>
    `rounded-full border px-2.5 py-1 text-xs ${on ? 'border-[#4A2D6B] bg-[#4A2D6B]/10 text-[#4A2D6B]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`;

  return (
    <div className="space-y-3">
      {/* 지역 */}
      <div>
        <label className={label}>타겟 지역</label>
        {t.geos.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {t.geos.map((g) => (
              <span key={g} className="inline-flex items-center gap-1 rounded-full bg-[#4A2D6B]/10 px-2.5 py-1 text-xs text-[#4A2D6B]">
                {g}
                <button type="button" onClick={() => onChange({ ...t, geos: t.geos.filter((x) => x !== g) })} className="text-[#4A2D6B]/60 hover:text-[#4A2D6B]">✕</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {geoPresets.filter((g) => !t.geos.includes(g)).map((g) => (
            <button key={g} type="button" onClick={() => addGeo(g)} className={chip(false)}>+ {g}</button>
          ))}
          <input
            value={geoInput}
            onChange={(e) => setGeoInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGeo(geoInput); } }}
            placeholder="직접 + Enter"
            className="w-28 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs focus:outline-none"
          />
        </div>
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
        <label className={label}>관심사</label>
        {t.interests.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {t.interests.map((g) => (
              <span key={g} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                {g}
                <button type="button" onClick={() => onChange({ ...t, interests: t.interests.filter((x) => x !== g) })} className="text-gray-400 hover:text-gray-600">✕</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {INTEREST_PRESETS.filter((g) => !t.interests.includes(g)).map((g) => (
            <button key={g} type="button" onClick={() => addInterest(g)} className={chip(false)}>+ {g}</button>
          ))}
          <input
            value={interestInput}
            onChange={(e) => setInterestInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(interestInput); } }}
            placeholder="직접 + Enter"
            className="w-28 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs focus:outline-none"
          />
        </div>
      </div>

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
