// ai-server/src/services/advisor/types.ts
// 광고 어드바이저 공유 타입 + 캘리브레이션 상수. 순수(런타임 의존성 없음).

export type Track = 'engagement' | 'homepage' | 'conversion';
export type Phase = 'initial' | 'mid' | 'mature';

/** 사용자가 넣는 주간 목표 (지표별, 미설정은 undefined) */
export interface WeeklyGoals {
  calcCompletions?: number; // 홈페이지 트랙
  lineLeads?: number;       // 전환 트랙
  viewerPoolGrowth?: number;// 참여 트랙
}

/** 직전 윈도우 실측 데이터 (advisorData가 채움) */
export interface AdvisorStats {
  windowDays: number;
  campaignsWithSpend: number;
  maxCampaignRuntimeDays: number;
  videoViewDays: number;
  // 광고 기여(approx) 전환 수
  calcCompletions: number;
  lineLeads: number;
  // 실측 단가 (분모 0이면 null)
  calcCpa: number | null;
  lineCpa: number | null;
  costPerViewer: number | null;
  // 단계 판정 입력
  retargetPoolSize: number;
  pixelMature: boolean;
  // 소재 평가/후보용
  runningCreatives: RunningCreative[];
  organicReels: OrganicReel[];
  topicLibrary: TopicAsset[];
}

export interface RunningCreative {
  reelId: number;
  title: string;
  track: Track;
  impressions: number;
  runtimeDays: number;
  frequency: number;
  ctr: number;            // %
  costPer3sView: number | null; // engagement track
  costPerCompletion: number | null; // homepage track
}

export interface OrganicReel {
  reelId: number;
  title: string;
  advertised: boolean;
  organicReach: number;
  organicEngagementRate: number; // %
}

export interface TopicAsset {
  reelId: number;       // = sort_order 1..62
  title: string;
  advertised: boolean;
  hasThaiReel: boolean;
  painPoints: string[]; // 매칭용 태그
}

export const GATE = {
  windowDays: 14,
  minConversions: 30,
  minGlobalRuntimeDays: 7,
  minVideoDays: 7,
  minCreativeImpressions: 1000,
  minCreativeRuntimeDays: 3,
} as const;

export const PROFIT = {
  leadCostFloorWon: 200_000,
  leadCostCeilWon: 400_000,
  assumedConsultToTreatment: 0.2,
  treatmentRevenueWon: 10_000_000,
} as const;

export const CREATIVE = {
  fatigueFrequency: 3.5,
} as const;

/** 단계별 권장 트랙 비율 (engagement / homepage / conversion) */
export const PHASE_RATIO: Record<Phase, Record<Track, number>> = {
  initial: { engagement: 0.7, homepage: 0.3, conversion: 0 },
  mid:     { engagement: 0.5, homepage: 0.5, conversion: 0 },
  mature:  { engagement: 0.3, homepage: 0.3, conversion: 0.4 },
};
