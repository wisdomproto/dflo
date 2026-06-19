// 기존 서비스를 묶어 AdvisorStats로 정규화한다. 어느 소스가 비어도 graceful(0/null/[]).
// v1 한계: Meta 캠페인 인사이트는 지출/노출/도달까지만 제공한다(전환·동영상조회·소재단가·빈도 없음).
// 광고 기여 전환(계산기/LINE)·동영상 조회 풀·소재 성과·오가닉 실적·62토픽 라이브러리는
// GA4 paid 귀속·ad-level insights·metaFeed·자산 현황 배선이 붙은 뒤 채운다(아래 TODO).
// 현재는 데이터가 없으므로 게이트가 ready:false 로 막는 것이 의도된 동작이다.
import { GATE, type AdvisorStats, type RunningCreative, type OrganicReel, type TopicAsset } from './types.js';
// 타입만 정적 import(런타임 무관). 값(fetchAccountInsights)은 metaAds→metaConnectionStore가
// import 시 createClient를 호출해 env 없는 테스트에서 throw하므로, collectStats 안에서 동적 import.
import type { AccountInsightRow } from '../metaAds.js';

export interface CollectInput {
  accountExternalId?: string;
  windowDays?: number;
}

/** 캠페인 인사이트 → 부분 통계(순수). 현재 endpoint 로 신뢰성 있게 뽑을 수 있는 건 지출 캠페인 수뿐. */
export function deriveFromInsights(rows: AccountInsightRow[]): { campaignsWithSpend: number } {
  return { campaignsWithSpend: rows.filter((r) => (r.spend ?? 0) > 0).length };
}

export async function collectStats(input: CollectInput): Promise<AdvisorStats> {
  const windowDays = input.windowDays ?? GATE.windowDays;

  let campaignsWithSpend = 0;
  const maxCampaignRuntimeDays = 0; // TODO: campaign created_time / time_increment 로 가동일수 산출
  const videoViewDays = 0;          // TODO: 동영상 조회 인사이트(time_increment)에서 산출
  const calcCompletions = 0;        // TODO: GA4 paid 귀속 height_calc_complete 수
  const lineLeads = 0;              // TODO: GA4 paid 귀속 Lead(LINE) 수
  const calcCpa: number | null = null;     // TODO: paid spend / calcCompletions
  const lineCpa: number | null = null;     // TODO: paid spend / lineLeads
  const costPerViewer: number | null = null; // TODO: spend / video viewers
  const runningCreatives: RunningCreative[] = []; // TODO: ad-level insights(동영상조회·빈도) 매핑
  const organicReels: OrganicReel[] = [];   // TODO: metaFeed fetchChannelFeed 로 미광고 게시물 실적
  const topicLibrary: TopicAsset[] = [];    // TODO: 62토픽 자산 현황(태국어 보유·광고 소진) 배선
  const retargetPoolSize = 0;       // TODO: 누적 동영상 시청자 + 픽셀 전환 모수 추정
  const pixelMature = false;        // TODO: 픽셀 전환 누적 임계 도달 여부

  // Meta 캠페인 인사이트 (지출 캠페인 수). 연결 없거나 실패 시 graceful.
  if (input.accountExternalId) {
    try {
      const { fetchAccountInsights } = await import('../metaAds.js');
      const rows = await fetchAccountInsights(input.accountExternalId);
      campaignsWithSpend = deriveFromInsights(rows).campaignsWithSpend;
    } catch {
      /* Meta 연결 없음/실패 → 0 유지 */
    }
  }

  return {
    windowDays, campaignsWithSpend, maxCampaignRuntimeDays, videoViewDays,
    calcCompletions, lineLeads, calcCpa, lineCpa, costPerViewer,
    retargetPoolSize, pixelMature, runningCreatives, organicReels, topicLibrary,
  };
}
