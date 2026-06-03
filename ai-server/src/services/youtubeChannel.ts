// ai-server/src/services/youtubeChannel.ts
// YouTube Data API v3 채널 통계 조회 (GATED on YOUTUBE_API_KEY).
// ContentFlow youtube-channel/route.ts 의 채널 조회 로직 이식: 핸들/채널ID →
// channels?part=statistics,snippet → 요약 통계. 키 없으면 throw → 라우트가 안내 반환.

export interface YoutubeChannelStats {
  title: string;
  subscribers: number;
  viewCount: number;
  videoCount: number;
  avgViews: number;
  thumbnail: string;
}

export interface YoutubeChannelQuery {
  handle?: string;
  channelId?: string;
}

const API_BASE = 'https://www.googleapis.com/youtube/v3';

// 핸들(@name 또는 name)로 채널 ID 검색. search.list 1회 호출.
async function resolveChannelId(handle: string, key: string): Promise<string> {
  const q = handle.replace(/^@/, '').trim();
  const url = `${API_BASE}/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(q)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`YouTube search 실패 (${res.status}): ${errText}`);
  }
  const json = (await res.json()) as {
    items?: Array<{ snippet?: { channelId?: string } }>;
  };
  const id = json.items?.[0]?.snippet?.channelId;
  if (!id) throw new Error(`채널을 찾을 수 없습니다: ${handle}`);
  return id;
}

export async function fetchYoutubeChannelStats(
  query: YoutubeChannelQuery,
): Promise<YoutubeChannelStats> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY 미설정');

  let channelId = query.channelId?.trim();
  if (!channelId) {
    if (!query.handle || !query.handle.trim()) {
      throw new Error('handle 또는 channelId 가 필요합니다');
    }
    channelId = await resolveChannelId(query.handle, key);
  }

  const url = `${API_BASE}/channels?part=statistics,snippet&id=${encodeURIComponent(channelId)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`YouTube channels 실패 (${res.status}): ${errText}`);
  }
  const json = (await res.json()) as {
    items?: Array<{
      snippet?: { title?: string; thumbnails?: { default?: { url?: string }; medium?: { url?: string } } };
      statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string };
    }>;
  };
  const item = json.items?.[0];
  if (!item) throw new Error('채널 통계를 가져올 수 없습니다');

  const subscribers = Number(item.statistics?.subscriberCount ?? 0);
  const viewCount = Number(item.statistics?.viewCount ?? 0);
  const videoCount = Number(item.statistics?.videoCount ?? 0);
  const avgViews = videoCount > 0 ? Math.round(viewCount / videoCount) : 0;
  const thumbnail =
    item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? '';

  return {
    title: item.snippet?.title ?? '',
    subscribers,
    viewCount,
    videoCount,
    avgViews,
    thumbnail,
  };
}
