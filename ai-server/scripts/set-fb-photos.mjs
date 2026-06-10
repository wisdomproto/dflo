// ai-server/scripts/set-fb-photos.mjs
// FB 페이지 커버/프로필 사진 업로드. set-fb-about 과 동일 토큰 경로:
//   marketing_meta_connection(enc_payload) → AES-256-GCM 복호화 → bundle.pages 토큰.
// 태국 페이지만(이미지 파일 보유). 한국은 이미지 준비 후 PAGES 에 추가.
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
  const [ivB64, tagB64, dataB64] = payload.split('.');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  d.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([d.update(Buffer.from(dataB64, 'base64')), d.final()]).toString('utf8');
}

const GRAPH = 'https://graph.facebook.com/v21.0';
const PAGE_ID = '1065006963373288'; // 187growup Thailand
const COVER = new URL('../../docs/social/thailand/187_fb_cover.png', import.meta.url).pathname.replace(/^\//, '');
const PROFILE = new URL('../../docs/social/thailand/187_fb_profile.png', import.meta.url).pathname.replace(/^\//, '');

const sb = createClient(
  env.SUPABASE_URL || env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);
const { data, error } = await sb
  .from('marketing_meta_connection')
  .select('enc_payload')
  .order('updated_at', { ascending: false })
  .limit(1);
if (error) throw new Error(error.message);
if (!data?.length) throw new Error('연결 없음 — 재연결 필요');
const bundle = JSON.parse(decrypt(data[0].enc_payload, env.META_TOKEN_ENC_KEY));
const page = bundle.pages?.find((p) => p.id === PAGE_ID);
if (!page) throw new Error(`페이지 ${PAGE_ID} 없음`);
const token = page.pageAccessToken;
console.log(`▶ 대상 페이지: ${page.name} (${page.id})`);

// 1) 프로필 사진 — /{page}/picture 멀티파트 (메타가 페이지에 막아둘 수 있음)
try {
  const form = new FormData();
  form.append('source', new Blob([fs.readFileSync(PROFILE)]), 'profile.png');
  form.append('access_token', token);
  const r = await fetch(`${GRAPH}/${PAGE_ID}/picture`, { method: 'POST', body: form });
  console.log('프로필 사진:', r.status, JSON.stringify(await r.json().catch(() => ({}))));
} catch (e) {
  console.log('프로필 사진 실패:', e.message);
}

// 2) 커버 — photos 업로드(published=false) → cover_photo 설정
try {
  const form = new FormData();
  form.append('source', new Blob([fs.readFileSync(COVER)]), 'cover.png');
  form.append('published', 'false');
  form.append('access_token', token);
  const up = await (await fetch(`${GRAPH}/${PAGE_ID}/photos`, { method: 'POST', body: form })).json();
  console.log('커버 업로드:', JSON.stringify(up));
  if (up.id) {
    const set = await fetch(`${GRAPH}/${PAGE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_photo: up.id, access_token: token }),
    });
    console.log('커버 설정:', set.status, JSON.stringify(await set.json()));
  }
} catch (e) {
  console.log('커버 실패:', e.message);
}
