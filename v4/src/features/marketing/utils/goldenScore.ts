// src/features/marketing/utils/goldenScore.ts
// 황금 키워드 파생 로직 (100% 클라이언트, 외부 키 0).
// IdeasPage merged(정적 keywords.json 72 + marketing_keywords 보관함 pins)를 입력으로
// "검색량 높고 경쟁 낮은" 키워드를 연속 점수(goldenScore)로 랭크 + 등급(gold/silver/bronze)화.
// 데이터가 high 편중(68 high / 3 medium / 1 low / isGolden 4)이라 하드 low-comp 필터는 거의 0건이 되므로
// 절대 하드필터하지 말 것 — 점수 랭킹 + 완만한 임계치(총검색≥300) + isGolden 항상 gold 승격으로 최소 노출 보장.
import type { Keyword, Competition } from '../types';

export type GoldenTier = 'gold' | 'silver' | 'bronze';
export type GoldenKeyword = Keyword & { goldenScore: number; tier: GoldenTier };

// 경쟁이 낮을수록 가중치 높음 → 같은 검색량이면 저경쟁 키워드가 위로.
export const COMP_WEIGHT: Record<Competition, number> = { low: 3, medium: 2, high: 1 };

// 노출 최소 임계치. 이보다 검색량이 낮으면 황금 풀에서 제외(완만하게).
const FLOOR_SEARCH = 300;

export function goldenScore(k: Keyword): number {
  return k.totalSearch * (COMP_WEIGHT[k.competition] ?? 1);
}

export function tierOf(k: Keyword): GoldenTier {
  // 저경쟁 + 충분한 검색량 = 진짜 황금. isGolden 수동 플래그도 항상 gold 로 승격(최소 노출 폴백).
  if ((k.competition === 'low' && k.totalSearch >= 1000) || k.isGolden) return 'gold';
  // 저경쟁이거나, 중간 경쟁이라도 검색량이 크면 유망.
  if (k.competition === 'low' || (k.competition === 'medium' && k.totalSearch >= 3000)) return 'silver';
  return 'bronze';
}

// 점수 내림차순 + 완만한 검색량 바닥값. (하드 low-comp 필터 금지 — 위 주석 참조.)
export function rankGolden(list: Keyword[]): GoldenKeyword[] {
  return list
    .filter((k) => k.totalSearch >= FLOOR_SEARCH)
    .map((k) => ({ ...k, goldenScore: goldenScore(k), tier: tierOf(k) }))
    .sort((a, b) => b.goldenScore - a.goldenScore);
}
