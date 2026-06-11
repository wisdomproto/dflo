// 진단용: 저장된 Meta 토큰이 살아있는지·왜 죽었는지·언제 만료되는지 출력.
//   node scripts/diagnose-meta-token.mjs
// debug_token(앱 토큰으로 introspection) + user/page 토큰 라이브 호출로 실제 사유 확인.
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs';

function loadEnv(p) {
  const e = {};
  for (const l of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) e[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return e;
}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//, ''));

function decrypt(payload, keyB64) {
  const key = Buffer.from(keyB64, 'base64');
  const [iv, tag, d] = payload.split('.');
  const dc = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  dc.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([dc.update(Buffer.from(d, 'base64')), dc.final()]).toString('utf8');
}

const GRAPH = 'https://graph.facebook.com/v21.0';
const ts = (sec) => (!sec ? '(없음/무기한)' : sec < 0 ? '(만료 안 함)' : new Date(sec * 1000).toISOString());
const mask = (t) => (t ? `${t.slice(0, 8)}…${t.slice(-6)} (len ${t.length})` : '(없음)');

async function getJson(url) {
  try {
    const r = await fetch(url);
    return await r.json();
  } catch (e) {
    return { _fetchError: String(e) };
  }
}

// app 토큰으로 임의 토큰 introspection
async function debugToken(token, appToken) {
  const j = await getJson(`${GRAPH}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(appToken)}`);
  return j.data || j;
}

async function main() {
  const appId = env.META_APP_ID;
  const appSecret = env.META_APP_SECRET;
  if (!appId || !appSecret) {
    console.error('❌ META_APP_ID / META_APP_SECRET 가 .env 에 없습니다.');
    process.exit(1);
  }
  const appToken = `${appId}|${appSecret}`;
  console.log(`앱: ${appId}\n`);

  const sb = createClient(
    env.SUPABASE_URL || env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const { data, error } = await sb
    .from('marketing_meta_connection')
    .select('meta_user_id, meta_user_name, expires_at, updated_at, enc_payload')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) { console.error('❌ DB 조회 실패:', error.message); process.exit(1); }
  if (!data || data.length === 0) { console.error('❌ 저장된 Meta 연결이 없습니다 (재연결 필요).'); process.exit(1); }

  const row = data[0];
  console.log('━━━ 저장된 연결(DB) ━━━');
  console.log('  유저       :', row.meta_user_name, `(${row.meta_user_id})`);
  console.log('  DB expires :', row.expires_at || '(없음)');
  console.log('  최근 갱신  :', row.updated_at);

  let bundle;
  try {
    bundle = JSON.parse(decrypt(row.enc_payload, env.META_TOKEN_ENC_KEY));
  } catch (e) {
    console.error('\n❌ 토큰 복호화 실패 — META_TOKEN_ENC_KEY 가 저장 당시와 다릅니다. 재연결 필요.\n  ', String(e));
    process.exit(1);
  }
  console.log('  연결 시각  :', bundle.connectedAt);
  console.log('  user token :', mask(bundle.userToken));
  console.log('  페이지 수  :', bundle.pages.length);

  // ── user 토큰 introspection ──
  console.log('\n━━━ USER 토큰 (debug_token) ━━━');
  const ud = await debugToken(bundle.userToken, appToken);
  console.log('  is_valid             :', ud.is_valid);
  console.log('  app_id               :', ud.app_id, ud.app_id && ud.app_id !== appId ? '⚠️ 현재 앱과 불일치!' : '');
  console.log('  type                 :', ud.type);
  console.log('  expires_at           :', ts(ud.expires_at));
  console.log('  data_access_expires  :', ts(ud.data_access_expires_at));
  console.log('  scopes               :', (ud.scopes || []).join(', ') || '(없음)');
  if (ud.error) console.log('  ⚠️ error             :', `[${ud.error.code}/${ud.error.subcode ?? '-'}] ${ud.error.message}`);

  // ── user 토큰 라이브 호출 ──
  console.log('\n━━━ USER 토큰 라이브 호출 /me ━━━');
  const me = await getJson(`${GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(bundle.userToken)}`);
  if (me.error) {
    console.log(`  ❌ [${me.error.code}/${me.error.error_subcode ?? '-'}] ${me.error.message}`);
    if (me.error.error_user_title || me.error.error_user_msg) console.log('     →', me.error.error_user_title, me.error.error_user_msg);
  } else {
    console.log('  ✅ OK:', me.name, `(${me.id})`);
  }

  // ── 페이지별 ──
  console.log('\n━━━ 페이지 토큰별 검사 ━━━');
  for (const p of bundle.pages) {
    console.log(`\n• ${p.name} (page ${p.id})`);
    const pd = await debugToken(p.pageAccessToken, appToken);
    console.log('    is_valid   :', pd.is_valid, '| expires:', ts(pd.expires_at));
    if (pd.error) console.log(`    ⚠️ debug error: [${pd.error.code}/${pd.error.subcode ?? '-'}] ${pd.error.message}`);
    const live = await getJson(`${GRAPH}/${p.id}?fields=name&access_token=${encodeURIComponent(p.pageAccessToken)}`);
    if (live.error) {
      console.log(`    ❌ 라이브 호출: [${live.error.code}/${live.error.error_subcode ?? '-'}] ${live.error.message}`);
    } else {
      console.log('    ✅ 라이브 호출 OK:', live.name);
    }
    if (p.instagram) {
      const ig = await getJson(`${GRAPH}/${p.instagram.id}?fields=username&access_token=${encodeURIComponent(p.pageAccessToken)}`);
      console.log('    IG     :', ig.error ? `❌ [${ig.error.code}] ${ig.error.message}` : `✅ @${ig.username}`);
    }
  }

  console.log('\n━━━ 해석 ━━━');
  console.log('  • USER /me 가 OK면 토큰 자체는 살아있음 → 발행 실패는 다른 권한/스코프 문제.');
  console.log('  • USER /me 에서 code 190 (subcode 460=비번변경/463=만료/467=무효) → 토큰 죽음, 재연결 필요.');
  console.log('  • "Cannot call API on behalf of user" 류 → 계정 체크포인트/제한 → master 계정 facebook.com 재로그인으로 해제 후 재연결.');
  console.log('  • debug_token 의 app_id 가 현재 앱과 다르면 → 다른 앱으로 발급된 토큰(앱 재구성 전 잔재) → 재연결.');
}

main().catch((e) => { console.error('진단 중 오류:', e); process.exit(1); });
