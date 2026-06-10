// 진단용: FB 페이지 about/description 의 비-BMP(이모지) 코드포인트 + U+FFFD(깨짐) 여부 확인.
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs';
function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
function decrypt(payload,keyB64){const key=Buffer.from(keyB64,'base64');const[iv,tag,d]=payload.split('.');const dc=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64'));dc.setAuthTag(Buffer.from(tag,'base64'));return Buffer.concat([dc.update(Buffer.from(d,'base64')),dc.final()]).toString('utf8');}
const sb = createClient(env.SUPABASE_URL||env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY||env.VITE_SUPABASE_ANON_KEY, {auth:{persistSession:false}});
const { data } = await sb.from('marketing_meta_connection').select('enc_payload').order('updated_at',{ascending:false}).limit(1);
const bundle = JSON.parse(decrypt(data[0].enc_payload, env.META_TOKEN_ENC_KEY));
const page = bundle.pages.find((p)=>p.id==='1162825793580038');
const r = await (await fetch(`https://graph.facebook.com/v21.0/1162825793580038?fields=about,description&access_token=${page.pageAccessToken}`)).json();
for (const f of ['about','description']) {
  const s = r[f] || '';
  const hasFFFD = s.includes('�');
  const astral = [...s].filter((c)=>c.codePointAt(0) > 0xFFFF).map((c)=>'U+'+c.codePointAt(0).toString(16).toUpperCase());
  console.log(`[${f}] U+FFFD(깨짐):`, hasFFFD, '| 이모지 코드포인트:', astral.length ? astral.join(',') : '(없음)');
}
