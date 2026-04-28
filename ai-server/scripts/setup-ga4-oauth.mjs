// 일회성 GA4 OAuth refresh token 발급 스크립트.
//
// 사용법:
//   1. Cloud Console 에서 OAuth 클라이언트 ID 만들기 (유형: Desktop app, 또는 Web app 도 OK)
//      - Web app 인 경우 승인된 리디렉션 URI 에 http://localhost:53682/callback 추가
//   2. .env 에 GA4_OAUTH_CLIENT_ID + GA4_OAUTH_CLIENT_SECRET 추가
//   3. cd ai-server && node scripts/setup-ga4-oauth.mjs
//   4. 출력된 URL 을 브라우저에 붙여넣고 GA 권한 있는 Google 계정으로 로그인 + 허용
//   5. 스크립트가 refresh_token 출력 → .env 의 GA4_OAUTH_REFRESH_TOKEN 에 붙여넣기
//   6. ai-server 재시작
//
// 한 번 받은 refresh_token 은 사용자가 명시적으로 권한을 취소하지 않는 한 영구 유효.

import 'dotenv/config';
import http from 'node:http';
import { URL } from 'node:url';
import { OAuth2Client } from 'google-auth-library';
import open from 'open';

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

const CLIENT_ID = process.env.GA4_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GA4_OAUTH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ GA4_OAUTH_CLIENT_ID / GA4_OAUTH_CLIENT_SECRET 환경변수가 필요합니다.');
  console.error('   ai-server/.env 에 추가한 다음 다시 실행하세요.');
  process.exit(1);
}

const oauth = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth.generateAuthUrl({
  access_type: 'offline',  // refresh_token 받으려면 필수
  prompt: 'consent',       // 이미 승인했어도 강제 동의 → refresh_token 재발급
  scope: SCOPE,
});

console.log('\n🔗 다음 URL 을 브라우저에서 열어 Google 계정으로 로그인 + 허용:\n');
console.log(authUrl);
console.log('\n(브라우저가 자동으로 열립니다)\n');

// 브라우저 자동 오픈 (실패해도 무시 — 위 URL 직접 사용 가능)
try {
  await open(authUrl);
} catch {
  // ignore
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/callback') {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>에러: ${error}</h1><p>스크립트를 다시 실행하세요.</p>`);
    console.error('❌ Google OAuth 에러:', error);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.writeHead(400).end('No code');
    return;
  }

  try {
    const { tokens } = await oauth.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!doctype html>
      <html><head><meta charset="utf-8"><title>GA4 OAuth 완료</title></head>
      <body style="font-family: system-ui; padding: 40px; max-width: 600px;">
        <h1>✅ 완료</h1>
        <p>이 창을 닫고 터미널로 돌아가세요. 콘솔에 출력된 refresh_token 을 <code>.env</code> 에 추가하세요.</p>
      </body></html>
    `);

    console.log('\n✅ 발급 완료. 아래 값을 ai-server/.env 에 추가하세요:\n');
    console.log('─'.repeat(70));
    console.log(`GA4_OAUTH_REFRESH_TOKEN=${tokens.refresh_token ?? '(없음)'}`);
    console.log('─'.repeat(70));
    if (!tokens.refresh_token) {
      console.error('\n⚠️  refresh_token 이 비어있어요. 이미 동의한 적 있으면');
      console.error('    https://myaccount.google.com/permissions 에서 이 OAuth 앱의');
      console.error('    액세스를 제거 후 다시 실행하세요.');
    }
    console.log('\nai-server 재시작 후 /banner-admin/analytics 에서 동작 확인.\n');

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500).end('Token exchange failed');
    console.error('❌ 토큰 교환 실패:', err);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`🟢 callback 서버: http://localhost:${PORT}/callback (대기 중)`);
});
