// 발행 큐 행 빌더(순수) — 채널/상태 타입의 원천 소스(import 부작용 없음 → 단위 테스트 가능).
export type PublishStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
export type PublishChannel = 'instagram' | 'facebook' | 'threads' | 'website';
export type ContentKind = 'blog' | 'cardnews' | 'post';

export interface QueueTarget {
  channelId: string | null;
  channel: PublishChannel;
}
export interface BuildQueueInput {
  articleId: string;
  language: string;
  contentKind: ContentKind;
  targets: QueueTarget[];
}
export interface NewQueueRow {
  article_id: string;
  channel: PublishChannel;
  channel_id: string | null;
  language: string;
  content_kind: ContentKind;
  status: PublishStatus;
}

export function buildQueueRows(input: BuildQueueInput): NewQueueRow[] {
  return input.targets.map((t) => ({
    article_id: input.articleId,
    channel: t.channel,
    channel_id: t.channelId,
    language: input.language || 'ko',
    content_kind: input.contentKind,
    status: 'draft' as const,
  }));
}
