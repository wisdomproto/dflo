import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthUrl, META_SCOPES } from '../metaOAuth.js';

test('buildAuthUrl: dialog URL + 스코프 + redirect_uri + state 포함', () => {
  const url = buildAuthUrl({ appId: 'APP123', redirectUri: 'https://x.com/api/auth/meta/callback', state: 'https://spa/marketing/channels' });
  assert.ok(url.startsWith('https://www.facebook.com/v21.0/dialog/oauth?'));
  assert.ok(url.includes('client_id=APP123'));
  assert.ok(url.includes('response_type=code'));
  assert.ok(url.includes(encodeURIComponent('https://x.com/api/auth/meta/callback')));
  assert.ok(url.includes(encodeURIComponent('https://spa/marketing/channels')));
  for (const s of ['pages_manage_posts', 'instagram_content_publish']) assert.ok(META_SCOPES.includes(s));
});
