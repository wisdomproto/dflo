// Meta OAuth 라우트(공개). SPA가 /api/auth/meta로 top-level redirect → FB → /callback → SPA 복귀.
import { Router } from 'express';
import { buildAuthUrl, exchangeCodeForToken, fetchAccounts } from '../services/metaOAuth.js';
import { saveConnection, getRegisteredPageIds } from '../services/metaConnectionStore.js';

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
