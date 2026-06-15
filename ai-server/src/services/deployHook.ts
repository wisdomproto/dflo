// 블로그(자체 사이트) 발행 후 v4 정적 사이트 재배포 트리거.
// 1순위: Railway GraphQL serviceInstanceRedeploy (RAILWAY_API_TOKEN + V4_SERVICE_ID + V4_ENVIRONMENT_ID).
// 2순위(폴백): RAILWAY_DEPLOY_HOOK_URL 단순 POST. 둘 다 없으면 no-op(경고).
const RAILWAY_GRAPHQL = 'https://backboard.railway.com/graphql/v2';

export interface RedeployRequest {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string;
}

// 순수: Railway 재배포 GraphQL 요청 빌더.
export function buildRedeployRequest(token: string, serviceId: string, environmentId: string): RedeployRequest {
  const query =
    'mutation Redeploy($serviceId: String!, $environmentId: String!) { serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId) }';
  return {
    url: RAILWAY_GRAPHQL,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables: { serviceId, environmentId } }),
  };
}

export async function triggerDeploy(): Promise<void> {
  const token = process.env.RAILWAY_API_TOKEN;
  const serviceId = process.env.RAILWAY_V4_SERVICE_ID;
  const environmentId = process.env.RAILWAY_V4_ENVIRONMENT_ID;

  if (token && serviceId && environmentId) {
    try {
      const req = buildRedeployRequest(token, serviceId, environmentId);
      const res = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
      const json = (await res.json().catch(() => null)) as { errors?: unknown } | null;
      if (!res.ok || json?.errors) {
        console.warn('[deploy] Railway redeploy 실패:', res.status, JSON.stringify(json?.errors ?? ''));
      } else {
        console.log('[deploy] Railway v4 재배포 트리거됨');
      }
    } catch (e) {
      console.warn('[deploy] redeploy 오류:', e instanceof Error ? e.message : String(e));
    }
    return;
  }

  // 폴백: 단순 POST 훅
  const url = process.env.RAILWAY_DEPLOY_HOOK_URL;
  if (!url) {
    console.warn('[deploy] RAILWAY_API_TOKEN/V4_SERVICE_ID/V4_ENVIRONMENT_ID 또는 RAILWAY_DEPLOY_HOOK_URL 미설정 — 배포 트리거 skip');
    return;
  }
  try {
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) console.warn(`[deploy] hook 실패: ${res.status}`);
    else console.log('[deploy] 배포 훅 트리거됨');
  } catch (e) {
    console.warn('[deploy] hook 오류:', e instanceof Error ? e.message : String(e));
  }
}
