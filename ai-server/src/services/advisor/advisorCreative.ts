// 가동 광고 판정(유지/컷/교체/보류) + 신규 후보 선별(오가닉 1순위·주제적합 2순위). 순수.
import { CREATIVE, type OrganicReel, type RunningCreative, type TopicAsset } from './types.js';

export type Verdict = 'keep' | 'cut' | 'refresh' | 'hold';
export interface CreativeJudgement {
  reelId: number; title: string; verdict: Verdict; reason: string;
}

const CREATIVE_MIN_IMPR = 1000;
const CREATIVE_MIN_DAYS = 3;

export function judgeRunning(creatives: RunningCreative[]): CreativeJudgement[] {
  return creatives.map((c) => {
    if (c.impressions < CREATIVE_MIN_IMPR || c.runtimeDays < CREATIVE_MIN_DAYS) {
      return j(c, 'hold', `데이터 부족 (노출 ${c.impressions}, ${c.runtimeDays}일)`);
    }
    const cost = c.track === 'engagement' ? c.costPer3sView : c.costPerCompletion;
    const good = cost != null && cost <= medianCost(creatives, c.track);
    if (good && c.frequency >= CREATIVE.fatigueFrequency) {
      return j(c, 'refresh', `성과 양호하나 빈도 ${c.frequency.toFixed(1)} — 같은 주제 새 소재로 교체`);
    }
    if (good) return j(c, 'keep', `성과 상위 · 빈도 ${c.frequency.toFixed(1)}`);
    return j(c, 'cut', `성과 하위 (단가 ${cost ?? '∞'})`);
  });
}

function medianCost(creatives: RunningCreative[], track: RunningCreative['track']): number {
  const vals = creatives
    .filter((c) => c.track === track)
    .map((c) => (track === 'engagement' ? c.costPer3sView : c.costPerCompletion))
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);
  if (!vals.length) return Infinity;
  return vals[Math.floor(vals.length / 2)];
}

function j(c: RunningCreative, verdict: Verdict, reason: string): CreativeJudgement {
  return { reelId: c.reelId, title: c.title, verdict, reason };
}

export interface NewCandidate {
  reelId: number; title: string; source: 'organic' | 'topic-fit';
  score: number; needsThaiReel: boolean; reason: string;
}

export function pickNewCandidates(
  organic: OrganicReel[], topics: TopicAsset[], limit: number,
): NewCandidate[] {
  const organicCands: NewCandidate[] = organic
    .filter((o) => !o.advertised)
    .sort((a, b) => b.organicReach * b.organicEngagementRate - a.organicReach * a.organicEngagementRate)
    .map((o) => ({
      reelId: o.reelId, title: o.title, source: 'organic' as const,
      score: o.organicReach * o.organicEngagementRate,
      needsThaiReel: false,
      reason: `오가닉 도달 ${o.organicReach.toLocaleString('ko-KR')} · 참여율 ${o.organicEngagementRate}% · 미광고`,
    }));

  const seen = new Set(organicCands.map((c) => c.reelId));
  const topicCands: NewCandidate[] = topics
    .filter((t) => !t.advertised && !seen.has(t.reelId))
    .map((t) => ({
      reelId: t.reelId, title: t.title, source: 'topic-fit' as const,
      score: t.painPoints.length,
      needsThaiReel: !t.hasThaiReel,
      reason: `주제 적합 (페인 ${t.painPoints.join('·') || '일반'})${t.hasThaiReel ? '' : ' · 태국어 제작 필요'}`,
    }))
    .sort((a, b) => b.score - a.score);

  return [...organicCands, ...topicCands].slice(0, limit);
}
