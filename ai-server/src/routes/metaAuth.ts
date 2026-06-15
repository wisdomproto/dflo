// Meta OAuth 라우트(공개). SPA가 /api/auth/meta로 top-level redirect → FB → /callback → SPA 복귀.
import express, { Router } from 'express';
import { buildAuthUrl, exchangeCodeForToken, fetchAccounts } from '../services/metaOAuth.js';
import { saveConnection, getRegisteredPageIds, deleteConnection } from '../services/metaConnectionStore.js';
import { parseSignedRequest, deletionConfirmationCode } from '../services/metaDataDeletion.js';

export const metaAuthRouter = Router();

function redirectBase(): string {
  return (process.env.META_REDIRECT_BASE || '').replace(/\/$/, '');
}

metaAuthRouter.get('/', (req, res) => {
  const appId = process.env.META_APP_ID;
  if (!appId) return res.status(500).send('META_APP_ID 미설정');
  const ret = String(req.query['return'] || '');
  const redirectUri = `${redirectBase()}/api/auth/meta/callback`;
  res.redirect(buildAuthUrl({ appId, redirectUri, state: ret }));
});

metaAuthRouter.get('/callback', async (req, res) => {
  const spa = String(req.query['state'] || process.env.CORS_ORIGIN || '');
  const fail = (msg: string) => {
    console.error('[meta/callback] FAIL:', msg);
    return res.redirect(`${spa}?meta_error=${encodeURIComponent(msg)}`);
  };
  const code = req.query['code'] ? String(req.query['code']) : '';
  if (!code) return fail(String(req.query['error'] || 'no_code'));
  try {
    const { token, expiresInSec } = await exchangeCodeForToken({
      appId: process.env.META_APP_ID || '',
      appSecret: process.env.META_APP_SECRET || '',
      redirectUri: `${redirectBase()}/api/auth/meta/callback`,
      code,
    });
    const extraPageIds = await getRegisteredPageIds();
    const bundle = await fetchAccounts(token, extraPageIds);
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();
    await saveConnection(bundle, expiresAt);
    res.redirect(`${spa}?meta_connected=1`);
  } catch (e) {
    fail(e instanceof Error ? e.message : 'oauth_failed');
  }
});

// POST /data-deletion — Facebook 데이터 삭제 콜백(앱 검수/라이브 요건).
// FB 가 form-urlencoded 로 signed_request 전송 → 검증 후 저장된 연동(토큰) 삭제 + 확인 URL/코드 반환.
metaAuthRouter.post('/data-deletion', express.urlencoded({ extended: false }), async (req, res) => {
  const signed = String((req.body ?? {}).signed_request || '');
  const payload = parseSignedRequest(signed, process.env.META_APP_SECRET || '');
  if (!payload) return res.status(400).json({ error: 'invalid signed_request' });
  const userId = String(payload.user_id || 'unknown');
  // 본 앱은 병원 자체 자산만 연결 — 저장된 연동(토큰)을 삭제(best-effort).
  try {
    await deleteConnection();
  } catch {
    /* noop — 이미 없거나 일시 오류여도 삭제 응답은 반환 */
  }
  const code = deletionConfirmationCode(userId, process.env.META_APP_SECRET || 'salt');
  const siteBase = (process.env.CORS_ORIGIN || 'https://www.dr187growup.com').replace(/\/$/, '');
  res.json({ url: `${siteBase}/data-deletion.html?code=${code}`, confirmation_code: code });
});
