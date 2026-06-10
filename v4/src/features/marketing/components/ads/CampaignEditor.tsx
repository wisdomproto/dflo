// src/features/marketing/components/ads/CampaignEditor.tsx
// 통합 캠페인 편집기 — 한 화면에서 설정·타겟·예산·콘텐츠까지.
// 저장 시 Meta 구조로 정리: 캠페인 + 자동 광고세트 1개(타겟·예산·성과) + 콘텐츠당 광고 1개.
import { useEffect, useState } from 'react';
import type { AdCampaign, AdStatus } from '../../services/marketingAdsService';
import { saveCampaign } from '../../services/marketingAdsService';
import type { AdAccount, AdTargeting, CreativeKind } from '../../services/adWorkspaceService';
import { defaultTargeting, fetchAdSets, saveAdSet, fetchAds, saveAd, deleteAd } from '../../services/adWorkspaceService';
import { OBJECTIVES, STATUSES, CREATIVE_KIND_LABEL } from './adConstants';
import { TargetingFields } from './TargetingFields';
import { CreativePicker, type PickedCreative } from './CreativePicker';

interface ContentDraft {
  key: string;
  id?: string;
  kind: CreativeKind;
  articleId: string | null;
  lang: string;
  thumbnailUrl: string;
  mediaUrl: string;
  name: string;
  caption: string;
}

let _k = 0;
const nextKey = () => `c${++_k}`;
const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export function CampaignEditor({
  initial,
  market,
  accounts,
  onClose,
  onSaved,
}: {
  initial: AdCampaign | null;
  market: string;
  accounts: AdAccount[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [objective, setObjective] = useState(initial?.objective || 'traffic');
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? '');
  const [status, setStatus] = useState<AdStatus>(initial?.status ?? 'active');
  const [targeting, setTargeting] = useState<AdTargeting>(defaultTargeting());
  const [placements, setPlacements] = useState<string[]>([]);
  const [budget, setBudget] = useState('0');
  const [budgetType, setBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [periodStart, setPeriodStart] = useState(initial?.periodStart ?? '');
  const [periodEnd, setPeriodEnd] = useState(initial?.periodEnd ?? '');
  const [landingUrl, setLandingUrl] = useState('');
  const [contents, setContents] = useState<ContentDraft[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [setId, setSetId] = useState<string | undefined>(undefined);
  const [showPerf, setShowPerf] = useState(false);
  const [perf, setPerf] = useState({ spend: '0', impressions: '0', clicks: '0', conversions: '0', revenue: '0' });
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  // 편집: 자동세트 + 광고 로드
  useEffect(() => {
    if (!initial) return;
    fetchAdSets(initial.id).then((sets) => {
      const s = sets[0];
      if (!s) return;
      setSetId(s.id);
      setTargeting(s.targeting);
      setPlacements(s.placements);
      setBudget(String(s.budget));
      setBudgetType(s.budgetType);
      setPerf({ spend: String(s.spend), impressions: String(s.impressions), clicks: String(s.clicks), conversions: String(s.conversions), revenue: String(s.revenue) });
      fetchAds(s.id).then((ads) => {
        setContents(ads.map((a) => ({ key: nextKey(), id: a.id, kind: a.creativeKind, articleId: a.articleId, lang: a.creativeLang, thumbnailUrl: a.thumbnailUrl, mediaUrl: a.mediaUrl, name: a.name, caption: a.primaryText })));
        if (ads[0]?.landingUrl) setLandingUrl(ads[0].landingUrl);
      });
    });
  }, [initial]);

  const onPick = (c: PickedCreative) => {
    setContents((arr) => [...arr, { key: nextKey(), kind: c.kind, articleId: c.articleId, lang: c.lang, thumbnailUrl: c.thumbnailUrl, mediaUrl: c.mediaUrl, name: c.name, caption: c.caption }]);
    setPicking(false);
  };
  const removeContent = (key: string) => {
    setContents((arr) => {
      const item = arr.find((x) => x.key === key);
      if (item?.id) setRemovedIds((r) => [...r, item.id as string]);
      return arr.filter((x) => x.key !== key);
    });
  };

  const onSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const camp = await saveCampaign({
        id: initial?.id, name: name.trim(), objective, accountId: accountId || null, market,
        platform: 'meta', status, language: market, region: initial?.region ?? '',
        periodStart: periodStart || null, periodEnd: periodEnd || null,
      });
      const set = await saveAdSet({
        id: setId, campaignId: camp.id, name: '기본', status, targeting,
        budget: num(budget), budgetType, periodStart: periodStart || null, periodEnd: periodEnd || null, placements,
        spend: num(perf.spend), impressions: num(perf.impressions), clicks: num(perf.clicks), conversions: num(perf.conversions), revenue: num(perf.revenue),
      });
      for (const id of removedIds) await deleteAd(id);
      for (const c of contents) {
        await saveAd({
          id: c.id, adSetId: set.id, name: c.name, status: 'active',
          creativeKind: c.kind, articleId: c.articleId, creativeLang: c.lang,
          thumbnailUrl: c.thumbnailUrl, mediaUrl: c.mediaUrl, headline: '', primaryText: c.caption, landingUrl: landingUrl.trim(),
        });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none';
  const label = 'mb-1 block text-xs font-medium text-gray-500';
  const card = 'rounded-xl border border-gray-200 bg-white p-4';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-2.5 py-1 text-sm text-gray-500 hover:bg-gray-50">← 목록</button>
        <h2 className="text-lg font-bold text-gray-800">{initial ? '캠페인 편집' : '새 캠페인'}</h2>
      </div>

      {/* 설정 */}
      <div className={card}>
        <div className="space-y-3">
          <div>
            <label className={label}>캠페인 이름</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 여름방학 미국한인 상담유입" className={field} />
          </div>
          <div>
            <label className={label}>목표</label>
            <div className="grid grid-cols-5 gap-1.5">
              {OBJECTIVES.map((o) => (
                <button key={o.id} type="button" onClick={() => setObjective(o.id)} title={o.desc}
                  className={`rounded-lg border px-2 py-1.5 text-xs ${objective === o.id ? 'border-[#4A2D6B] bg-[#4A2D6B]/10 font-semibold text-[#4A2D6B]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>광고 계정</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={field}>
                <option value="">미지정</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>상태</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as AdStatus)} className={field}>
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>예산</label>
              <div className="flex gap-2">
                <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className={field} />
                <select value={budgetType} onChange={(e) => setBudgetType(e.target.value as 'daily' | 'lifetime')} className="rounded-lg border border-gray-300 px-2 text-sm focus:outline-none">
                  <option value="daily">일</option>
                  <option value="lifetime">총</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>시작일</label>
                <input type="date" value={periodStart ?? ''} onChange={(e) => setPeriodStart(e.target.value)} className={field} />
              </div>
              <div>
                <label className={label}>종료일</label>
                <input type="date" value={periodEnd ?? ''} onChange={(e) => setPeriodEnd(e.target.value)} className={field} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 타겟 */}
      <div className={card}>
        <h3 className="mb-3 text-sm font-bold text-gray-800">🎯 타겟</h3>
        <TargetingFields market={market} targeting={targeting} onChange={setTargeting} placements={placements} onPlacementsChange={setPlacements} />
      </div>

      {/* 콘텐츠 */}
      <div className={card}>
        <h3 className="mb-2 text-sm font-bold text-gray-800">📎 콘텐츠 <span className="text-gray-400">({contents.length})</span></h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {contents.map((c) => (
            <div key={c.key} className="group relative overflow-hidden rounded-lg border border-gray-200">
              <div className="aspect-[4/5] bg-gray-100">
                {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xl text-gray-300">🖼</div>}
              </div>
              <button type="button" onClick={() => removeContent(c.key)} className="absolute right-1 top-1 rounded-full bg-black/50 px-1.5 text-xs text-white opacity-0 group-hover:opacity-100">✕</button>
              <div className="truncate px-1.5 py-1 text-[10px] text-gray-500">{CREATIVE_KIND_LABEL[c.kind]}</div>
            </div>
          ))}
          <button type="button" onClick={() => setPicking(true)} className="grid aspect-[4/5] place-items-center rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-400 hover:border-[#4A2D6B] hover:text-[#4A2D6B]">
            + 콘텐츠
          </button>
        </div>
        <p className="mt-2 text-[10px] text-gray-400">여러 개 담으면 Meta가 반응 좋은 소재를 자동으로 더 노출합니다. 본문 카피는 소재 캡션을 자동 사용해요.</p>
        <div className="mt-3">
          <label className={label}>랜딩 URL (공통)</label>
          <input value={landingUrl} onChange={(e) => setLandingUrl(e.target.value)} placeholder="https://dr187growup.com/…" className={field} />
        </div>
      </div>

      {/* 성과 (집행 후) */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <button type="button" onClick={() => setShowPerf((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-600">
          <span>📊 성과 입력 (집행 후)</span>
          <span>{showPerf ? '▲' : '▼'}</span>
        </button>
        {showPerf && (
          <div className="grid grid-cols-5 gap-2 border-t border-gray-100 p-4">
            {([['지출', 'spend'], ['노출', 'impressions'], ['클릭', 'clicks'], ['전환', 'conversions'], ['매출', 'revenue']] as [string, keyof typeof perf][]).map(([lab, k]) => (
              <div key={k}>
                <label className="mb-1 block text-[10px] text-gray-400">{lab}</label>
                <input type="number" value={perf[k]} onChange={(e) => setPerf((p) => ({ ...p, [k]: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs focus:outline-none" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 저장 */}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600">취소</button>
        <button type="button" onClick={onSave} disabled={saving || !name.trim()} className="rounded-lg bg-[#4A2D6B] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>

      {picking && <CreativePicker market={market} onPick={onPick} onClose={() => setPicking(false)} />}
    </div>
  );
}
