// ai-server/scripts/set-fb-about.mjs
// FB 페이지 소개(about/description) 반영. 발행과 동일 토큰 경로 재사용:
//   marketing_meta_connection(enc_payload) → AES-256-GCM 복호화(META_TOKEN_ENC_KEY)
//   → bundle.pages 에서 pageId 매칭 → pageAccessToken → POST /{pageId} (pages_manage_metadata)
// 이모지/태국어는 JSON.stringify + UTF-8 fetch 본문이라 안전(셸 인코딩 깨짐 회피).
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
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

const GRAPH = 'https://graph.facebook.com/v21.0';
// 페이지별 소개. 태국 = 검증된 옛 카피 재사용(신규 페이지로 ID만 교체), 한국 = 한국어 신규.
// 주의: FB description 필드는 일부 이모지를 U+FFFD로 깨뜨림(검증됨) → description 은 이모지 없이 평문. about 은 이모지 OK.
const PAGES = [
  {
    id: '1065006963373288', // 187growup Thailand (신규 페이지)
    about: 'แบรนด์ผู้เชี่ยวชาญด้านการเพิ่มความสูงในเด็ก จาก Yonsei Saebom คลินิกฮอร์โมนแห่งเกาหลี 🌱',
    description:
      '187growup คือแบรนด์เฉพาะทางด้านการเติบโตในเด็กของ Yonsei Saebom Medical Clinic ' +
      'คลินิกผู้เชี่ยวชาญการรักษาด้วยฮอร์โมนจากกรุงโซล ประเทศเกาหลีใต้\n\n' +
      'เรานำความเชี่ยวชาญด้านการรักษาด้วยฮอร์โมนของ Yonsei Saebom มาเน้นที่การเพิ่มความสูงของเด็ก ' +
      'ตั้งแต่การประเมินอายุกระดูกอย่างละเอียด ไปจนถึงการดูแลเฉพาะบุคคลในแต่ละช่วงการเจริญเติบโต\n\n' +
      'ปรึกษาเรื่องความสูงของลูกได้ฟรีทาง LINE: @894qhqtu\n' +
      'เพิ่มเพื่อน: https://line.me/R/ti/p/@894qhqtu\n' +
      'เว็บไซต์: https://dr187growup.com/th',
    website: 'https://dr187growup.com/th',
  },
  {
    id: '1169557802909664', // 187growup Korea (신규 페이지)
    about: '연세새봄의원 187 성장클리닉 — 소아 키 성장 전문 브랜드 🌱',
    description:
      '187growup은 연세새봄의원의 소아 키 성장 전문 브랜드입니다. ' +
      '서울의 호르몬 치료 전문 클리닉으로, 정밀한 뼈나이 평가부터 성장 단계별 맞춤 관리까지 아이의 키 성장을 체계적으로 돕습니다.\n\n' +
      '우리 아이 키 성장이 궁금하다면 카카오톡으로 편하게 무료 상담하세요.\n' +
      '카카오톡 상담: https://pf.kakao.com/_ZxneSb\n' +
      '웹사이트: https://dr187growup.com',
    website: 'https://dr187growup.com',
  },
];

const SB_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const ENC = env.META_TOKEN_ENC_KEY;
if (!SB_URL || !SB_KEY) throw new Error('SUPABASE_URL / KEY 필요');
if (!ENC) throw new Error('META_TOKEN_ENC_KEY 필요');

const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

const { data, error } = await sb
  .from('marketing_meta_connection')
  .select('enc_payload')
  .order('updated_at', { ascending: false })
  .limit(1);
if (error) throw new Error(error.message);
if (!data?.length) throw new Error('연결 없음(marketing_meta_connection 비어있음) — 재연결 필요');

let bundle;
try {
  bundle = JSON.parse(decrypt(data[0].enc_payload, ENC));
} catch (e) {
  throw new Error('복호화 실패 — META_TOKEN_ENC_KEY 불일치일 수 있음(재연결 필요). ' + e.message);
}

for (const P of PAGES) {
  const page = bundle.pages?.find((p) => p.id === P.id);
  if (!page) {
    console.error(`✗ 페이지 ${P.id} 없음. 보유: ${(bundle.pages || []).map((p) => `${p.name}(${p.id})`).join(', ')}`);
    continue;
  }
  const token = page.pageAccessToken;
  console.log(`\n▶ 대상 페이지: ${page.name} (${page.id})`);

  // 반영
  const res = await fetch(`${GRAPH}/${P.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ about: P.about, description: P.description, website: P.website, access_token: token }),
  });
  const out = await res.json();
  if (out.error) {
    console.error('  [graph 오류]', JSON.stringify(out.error));
    continue;
  }

  // 검증
  const after = await (await fetch(`${GRAPH}/${P.id}?fields=about,description&access_token=${token}`)).json();
  console.log('  ✔ about       :', JSON.stringify(after.about ?? null));
  console.log('  ✔ description :', JSON.stringify(after.description ?? null));
}
