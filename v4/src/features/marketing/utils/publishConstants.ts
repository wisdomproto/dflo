// src/features/marketing/utils/publishConstants.ts
// 발행 큐 보드 공용 상수 — 컴포넌트 파일 밖에 둬 react-refresh fast-refresh 호환 유지.
// (PublishQueueList / PublishCalendar / PublishQueuePage / AddToQueueModal 공용)
import type { PublishChannel, PublishStatus } from '../services/marketingPublishService';

export const STATUS_LABELS: Record<PublishStatus, string> = {
  draft: '초안',
  scheduled: '예약됨',
  publishing: '발행 중',
  published: '발행됨',
  failed: '실패',
};

export const STATUS_COLORS: Record<PublishStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-indigo-100 text-indigo-700',
  publishing: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

export interface ChannelMeta {
  id: PublishChannel;
  label: string;
  badge: string; // tailwind bg+text for the channel pill
  dot: string; // hex for calendar chips
}

// 발행 보드 컬럼 순서: 블로그(자체 사이트) → 인스타 → 페북. (Threads 제거)
export const CHANNELS: ChannelMeta[] = [
  { id: 'website', label: '블로그', badge: 'bg-emerald-600 text-white', dot: '#059669' },
  { id: 'instagram', label: 'Instagram', badge: 'bg-pink-500 text-white', dot: '#e1306c' },
  { id: 'facebook', label: 'Facebook', badge: 'bg-[#1877f2] text-white', dot: '#1877f2' },
];

export function channelMeta(ch: PublishChannel): ChannelMeta {
  return CHANNELS.find((c) => c.id === ch) ?? { id: ch, label: ch, badge: 'bg-gray-200 text-gray-700', dot: '#9ca3af' };
}
