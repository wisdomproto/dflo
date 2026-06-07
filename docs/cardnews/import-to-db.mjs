// docs/cardnews/import-to-db.mjs
// data/*.json → marketing_cardnews + marketing_cardnews_slides (txirmof)
// 전제: migration 044 적용됨 + 캡션 워크플로우 완료(caption_*/hashtags_* 채워짐)
// 실행: node docs/cardnews/import-to-db.mjs
import fs from 'fs';
import path from 'path';

const URL = 'https://txirmofdvuljkrjkpzdg.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4aXJtb2ZkdnVsamtyamtwemRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI1MTQyMywiZXhwIjoyMDkxODI3NDIzfQ.xEWMlbJY6s_sARJ4mPFEC00CJcAD6bJnfjF3MWZ5fTY';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const DATA = 'docs/cardnews/data';
const LANGS = ['ko', 'en', 'th', 'vi', 'ch'];

async function rest(method, pathq, body) {
  const r = await fetch(URL + '/rest/v1/' + pathq, {
    method,
    headers: { ...H, Prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${pathq} → ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
}

async function main() {
  let done = 0;
  const skip = [];
  for (let n = 1; n <= 62; n++) {
    const f = path.join(DATA, n + '.json');
    if (!fs.existsSync(f)) { skip.push(n); continue; }
    let d;
    try { d = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')); }
    catch (e) { console.error('parse fail #' + n, e.message); skip.push(n); continue; }

    // 1) content_id (marketing_articles)
    const arts = await rest('GET', `marketing_articles?select=id&sort_order=eq.${n}&language=eq.ko`);
    if (!arts || !arts.length) { console.error('no article #' + n); skip.push(n); continue; }
    const contentId = arts[0].id;

    // 2) 기존 cardnews 제거(멱등) — slides는 FK cascade
    await rest('DELETE', `marketing_cardnews?content_id=eq.${contentId}`);

    // 3) cardnews (언어별 캡션/해시태그)
    const captions = {}, tags = {};
    for (const l of LANGS) { captions[l] = d['caption_' + l] || ''; tags[l] = d['hashtags_' + l] || ''; }
    const cn = await rest('POST', 'marketing_cardnews', {
      content_id: contentId,
      captions,
      hashtags_i18n: tags,
      caption: captions.ko || '',   // 하위호환(단일 컬럼)
      hashtags: [],
    });
    const cardnewsId = cn[0].id;

    // 4) slides (언어공통 일러스트 + 언어별 텍스트)
    const slides = (d.slides || []).map((s, i) => {
      const texts = {};
      for (const l of LANGS) texts[l] = { headline: s['headline_' + l] || '', subtext: s['subtext_' + l] || '' };
      return {
        cardnews_id: cardnewsId,
        illustration: s.illustration || '',
        texts,
        role: s.role || '',
        is_cta: !!s.isCTA,
        sort_order: s.n ?? i + 1,
        canvas: {},
        image_prompt: '',
      };
    });
    if (slides.length) await rest('POST', 'marketing_cardnews_slides', slides);
    done++;
    console.log(`imported #${n} (${slides.length} slides)`);
  }
  console.log('DONE:', done, '| skipped:', skip.length ? skip.join(',') : 'none');
}
main().catch((e) => { console.error(e); process.exit(1); });
