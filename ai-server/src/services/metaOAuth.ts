// Meta OAuth — dialog URL(순수) + 토큰 교환 + 계정 묶음 조회. graph v21.0.
import type { MetaBundle, MetaPage } from './metaConnectionStore.js';

const GRAPH = 'https://graph.facebook.com/v21.0';

export const META_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'pages_manage_metadata',
  'instagram_basic',
  'instagram_content_publish',
  // ⚠️ threads_basic / threads_content_publish 는 Facebook 로그인 다이얼로그에서 Invalid Scope
  // (Threads API 는 별도 OAuth — graph.threads.net). 여기 넣으면 다이얼로그 전체가 막힘. 추후 별도 연동.
];

export function buildAuthUrl(opts: { appId: string; redirectUri: string; state: string }): string {
  const scope = META_SCOPES.join(',');
  return (
    `https://www.facebook.com/v21.0/dialog/oauth?client_id=${opts.appId}` +
    `&redirect_uri=${encodeURIComponent(opts.redirectUri)}` +
    `&scope=${scope}&response_type=code&auth_type=rerequest` +
    `&state=${encodeURIComponent(opts.state)}`
  );
}

export async function exchangeCodeForToken(opts: {
  appId: string; appSecret: string; redirectUri: string; code: string;
}): Promise<{ token: string; expiresInSec: number }> {
  const shortRes = await fetch(
    `${GRAPH}/oauth/access_token?client_id=${opts.appId}&redirect_uri=${encodeURIComponent(opts.redirectUri)}&client_secret=${opts.appSecret}&code=${opts.code}`,
  );
  const short = await shortRes.json() as Record<string, unknown>;
  if (short['error']) throw new Error(String((short['error'] as Record<string, unknown>)['message'] ?? 'short token error'));
  const longRes = await fetch(
    `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${opts.appId}&client_secret=${opts.appSecret}&fb_exchange_token=${String(short['access_token'] ?? '')}`,
  );
  const long = await longRes.json() as Record<string, unknown>;
  return {
    token: String(long['access_token'] || short['access_token'] || ''),
    expiresInSec: Number(long['expires_in']) || 60 * 24 * 3600,
  };
}

export async function fetchAccounts(token: string): Promise<MetaBundle> {
  const [userRes, pagesRes] = await Promise.all([
    fetch(`${GRAPH}/me?fields=id,name&access_token=${token}`),
    fetch(`${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account%7Bid,username%7D&access_token=${token}`),
  ]);
  const user = await userRes.json() as Record<string, unknown>;
  const pages = await pagesRes.json() as Record<string, unknown>;
  const pagesData: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string; username: string } }> =
    (pages['data'] as Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string; username: string } }>) || [];
  const mapped: MetaPage[] = pagesData.map((p) => ({
    id: p.id,
    name: p.name,
    pageAccessToken: p.access_token,
    instagram: p.instagram_business_account
      ? { id: p.instagram_business_account.id, username: p.instagram_business_account.username }
      : null,
    threadsId: p.id,
  }));
  return {
    userToken: token,
    userId: String(user['id'] ?? ''),
    userName: String(user['name'] ?? ''),
    pages: mapped,
    connectedAt: new Date().toISOString(),
  };
}
