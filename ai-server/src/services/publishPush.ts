// ai-server/src/services/publishPush.ts
// 실제 채널 자동 발행 (GATED). Meta(Instagram/Facebook/Threads)·YouTube push.
// 현재는 META_ACCESS_TOKEN / YOUTUBE_OAUTH_* 키 부재로 키 가드에서 throw 한다.
// 키가 생기면 각 채널 분기 안의 실제 push 로직을 채워 활성화한다.
// (gemini 모듈은 import 하지 않는다 — 소셜 발행이며 import 시점 throw 회피)

export interface PublishPushInput {
  queueItemId: string;
  channel: string;
  /** 발행할 본문/제목 등은 호출부에서 article을 조회해 주입 (현재 미사용, 키 활성화 시 사용) */
  title?: string;
  body?: string;
}

export interface PublishPushResult {
  publishedUrl: string;
}

// 채널별 필요한 환경변수 가드. 키가 없으면 안내 메시지와 함께 throw.
function assertChannelKeys(channel: string): void {
  switch (channel) {
    case 'instagram':
    case 'facebook':
    case 'threads': {
      if (!process.env.META_ACCESS_TOKEN || !process.env.META_PAGE_ID) {
        throw new Error('META_ACCESS_TOKEN / META_PAGE_ID 미설정 — Meta 자동 발행 비활성');
      }
      return;
    }
    case 'youtube': {
      if (!process.env.YOUTUBE_OAUTH_REFRESH_TOKEN) {
        throw new Error('YOUTUBE_OAUTH_* 미설정 — YouTube 자동 발행 비활성');
      }
      return;
    }
    default:
      // wordpress / naver_blog 등은 자동 발행 미지원 → 수동 표시 유도
      throw new Error(`'${channel}' 채널은 자동 발행을 지원하지 않습니다. 발행 후 URL을 수동으로 표시해주세요.`);
  }
}

/**
 * 실제 채널 push. 키 가드 통과 시(=키 존재) 채널별 발행을 수행해 published_url 을 반환.
 * 키가 없으면 assertChannelKeys 가 throw → 라우트에서 {success:false,error}로 graceful.
 */
export async function pushToChannel(input: PublishPushInput): Promise<PublishPushResult> {
  const { channel } = input;
  assertChannelKeys(channel);

  // 키 활성화 시 채널별 실제 발행 구현 위치 (현재 도달 불가 — 위 가드가 먼저 throw).
  switch (channel) {
    case 'instagram':
    case 'facebook':
    case 'threads':
      // TODO: Meta Graph API media publish → permalink 반환
      throw new Error('Meta 자동 발행 구현 대기');
    case 'youtube':
      // TODO: YouTube Data API videos.insert → watch URL 반환
      throw new Error('YouTube 자동 발행 구현 대기');
    default:
      throw new Error(`'${channel}' 채널 자동 발행 미지원`);
  }
}
