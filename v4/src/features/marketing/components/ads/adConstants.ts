// src/features/marketing/components/ads/adConstants.ts
// 광고 워크스페이스 공용 상수 + 포맷 헬퍼.
import type { AdStatus } from '../../services/marketingAdsService';
import type { CreativeKind } from '../../services/adWorkspaceService';

export const ACCENT = '#4A2D6B';

// 캠페인 목표 (Meta objective 단순화)
export const OBJECTIVES: { id: string; label: string; desc: string }[] = [
  { id: 'awareness', label: '인지도', desc: '브랜드를 더 많은 사람에게 노출' },
  { id: 'traffic', label: '트래픽', desc: '홈페이지·랜딩 방문 유도' },
  { id: 'engagement', label: '참여', desc: '좋아요·댓글·공유·메시지' },
  { id: 'leads', label: '리드', desc: '상담 신청·DB 수집' },
  { id: 'conversions', label: '전환', desc: '예약·구매 등 핵심 액션' },
];

export function objectiveLabel(id: string): string {
  return OBJECTIVES.find((o) => o.id === id)?.label ?? (id || '—');
}

export const STATUSES: { id: AdStatus; label: string }[] = [
  { id: 'active', label: '진행중' },
  { id: 'paused', label: '일시중지' },
  { id: 'ended', label: '종료' },
  { id: 'draft', label: '초안' },
];

export const STATUS_CONFIG: Record<AdStatus, { label: string; cls: string; dot: string }> = {
  active: { label: '진행중', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  paused: { label: '일시중지', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  ended: { label: '종료', cls: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
  draft: { label: '초안', cls: 'bg-slate-50 text-slate-500 border-slate-200', dot: 'bg-slate-300' },
};

// 게재 위치 (Meta placements)
export const PLACEMENTS: { id: string; label: string }[] = [
  { id: 'feed', label: '피드' },
  { id: 'stories', label: '스토리' },
  { id: 'reels', label: '릴스' },
  { id: 'explore', label: '탐색' },
  { id: 'search', label: '검색' },
  { id: 'audience_network', label: '오디언스 네트워크' },
];

// 시장별 추천 타겟 지역 프리셋 (광고 지역 — 시장 언어와 직교).
// 클릭 시 Meta 지역 검색 쿼리로 들어가므로 Meta가 인식하는 지명으로 둔다(영문 권장).
export const GEO_PRESETS: Record<string, string[]> = {
  ko: ['서울', '경기', '부산'],
  en: ['Los Angeles', 'New York', 'Atlanta', 'Seattle'],
  th: ['Bangkok', 'Chiang Mai', 'Phuket'],
  vi: ['Ho Chi Minh City', 'Hanoi', 'Da Nang'],
};

// Meta 관심사 검색 쿼리 시드(관심사 객체는 Meta가 영문으로 색인하므로 영문 시드).
export const INTEREST_PRESETS = [
  'Parenting', 'Child health', 'Education', 'Motherhood', 'Nutrition', 'Pediatrics',
];

export const CREATIVE_KIND_LABEL: Record<CreativeKind, string> = {
  cardnews: '카드뉴스',
  reels: '릴스',
  image: '이미지',
  custom: '직접',
};

// ── 포맷 ──────────────────────────────────────────────────────────
export function fmtNumber(n: number): string {
  const v = n || 0;
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}억`;
  if (v >= 1e4) return `${(v / 1e4).toFixed(1)}만`;
  return v.toLocaleString('ko-KR');
}
export function fmtCurrency(n: number, currency = 'KRW'): string {
  const sym = currency === 'KRW' ? '₩' : currency === 'USD' ? '$' : currency === 'THB' ? '฿' : currency === 'VND' ? '₫' : '';
  return `${sym}${fmtNumber(n)}`;
}
