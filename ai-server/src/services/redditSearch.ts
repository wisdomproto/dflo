// Reddit 발굴 (읽기 전용) — 앱 전용 OAuth(client_credentials)로 공개 글 검색.
// 목적: 모니터링/댓글 트래커에 "답하면 좋을" 스레드를 후보로 수집. **읽기만** — 자동 게시는 안 함.
//
// 인증: script/web app 타입(secret 보유) → grant_type=client_credentials 로 유저 로그인 없이
//       공개 데이터 읽기 토큰 발급. 키 미설정이면 명확히 throw(라우트가 501 안내로 변환).
//
// env: REDDIT_CLIENT_ID · REDDIT_CLIENT_SECRET · REDDIT_USER_AGENT(권장, Reddit 정책상 식별 UA).

const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const API_BASE = 'https://oauth.reddit.com';

const CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const USER_AGENT = process.env.REDDIT_USER_AGENT || '187growup-monitor/1.0';

export interface RedditThread {
  id: string;
  title: string;
  url: string;          // reddit permalink (절대 URL)
  body: string;         // selftext 발췌
  author: string;
  subreddit: string;    // 'r/xxx'
  score: number;
  numComments: number;
  createdUtc: number;   // epoch seconds
}

export function redditConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

// 앱 전용 토큰 캐시(만료 60초 전 갱신).
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET 미설정 — ai-server/.env 에 추가 필요');
  }
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.token;

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Reddit 토큰 발급 실패 (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error('Reddit 토큰 응답에 access_token 없음');
  cachedToken = { token: data.access_token, expiresAt: now + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

function mapChild(c: { data?: Record<string, unknown> }): RedditThread | null {
  const d = c?.data;
  if (!d) return null;
  const permalink = typeof d.permalink === 'string' ? d.permalink : '';
  const selftext = typeof d.selftext === 'string' ? d.selftext : '';
  return {
    id: String(d.id ?? ''),
    title: typeof d.title === 'string' ? d.title : '',
    url: permalink ? `https://www.reddit.com${permalink}` : String(d.url ?? ''),
    body: selftext.slice(0, 1200),
    author: typeof d.author === 'string' ? d.author : '',
    subreddit: d.subreddit ? `r/${d.subreddit}` : '',
    score: Number(d.score ?? 0),
    numComments: Number(d.num_comments ?? 0),
    createdUtc: Number(d.created_utc ?? 0),
  };
}

async function apiGet(path: string, token: string): Promise<RedditThread[]> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Reddit 검색 실패 (${res.status}): ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: { children?: Array<{ data?: Record<string, unknown> }> } };
  const children = json?.data?.children ?? [];
  return children.map(mapChild).filter((t): t is RedditThread => !!t && (!!t.title || !!t.body));
}

export interface DiscoverOpts {
  queries: string[];
  subreddits?: string[];     // 비우면 전체 검색(sr 제한 없음)
  limit?: number;            // 쿼리(·서브레딧)당
  sort?: 'relevance' | 'new' | 'top' | 'comments';
  time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
}

// 여러 쿼리 × (선택)서브레딧을 돌려 permalink 로 중복 제거해 반환. 최신·관련 상위 위주.
export async function discoverThreads(opts: DiscoverOpts): Promise<RedditThread[]> {
  const token = await getAppToken();
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 25);
  const sort = opts.sort ?? 'relevance';
  const time = opts.time ?? 'year';
  const subs = opts.subreddits?.filter(Boolean) ?? [];

  const paths: string[] = [];
  for (const q of opts.queries.filter(Boolean)) {
    const qs = `q=${encodeURIComponent(q)}&sort=${sort}&t=${time}&limit=${limit}&raw_json=1&type=link`;
    if (subs.length === 0) {
      paths.push(`/search?${qs}`);
    } else {
      for (const sr of subs) {
        const s = sr.replace(/^r\//i, '');
        paths.push(`/r/${encodeURIComponent(s)}/search?${qs}&restrict_sr=1`);
      }
    }
  }

  const seen = new Set<string>();
  const out: RedditThread[] = [];
  // 순차 실행(무료 티어 rate limit 존중). 실패한 path 는 건너뜀.
  for (const p of paths) {
    try {
      const rows = await apiGet(p, token);
      for (const r of rows) {
        const key = r.url || r.id;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(r);
      }
    } catch (e) {
      console.warn('[reddit] search path failed:', p, e instanceof Error ? e.message : e);
    }
  }
  // 관련도 후 참여도(코멘트) 정렬 — 답할 가치 있는 활발한 스레드 우선.
  out.sort((a, b) => b.numComments - a.numComments);
  return out;
}
