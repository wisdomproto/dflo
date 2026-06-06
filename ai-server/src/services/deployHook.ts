// Railway 배포 훅 트리거. 블로그(자체 사이트) 발행 후 정적 재빌드용. 미설정 시 no-op.
export async function triggerDeploy(): Promise<void> {
  const url = process.env.RAILWAY_DEPLOY_HOOK_URL;
  if (!url) {
    console.warn('[deploy] RAILWAY_DEPLOY_HOOK_URL 미설정 — 배포 트리거 skip');
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
