// blog_published.html_body 를 전 로케일 재조립(re-bake) — 참고문헌 헤딩을 "References" 로
// 통일한 뒤, baked html_body 를 현재 코드(buildPublishedBlog)로 다시 굽는다.
// build-i18n 이 저장된 html_body 를 그대로 쓰므로(재조립 안 함) 이 재-bake 없이는 반영 안 됨.
//
// language(사이트 코드) → content 코드: zh-hant→ch·zh-hans→cn, 나머지는 동일.
// 사용: node --import tsx scripts/rebake-blog-references.mjs [--dry]

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildPublishedBlog } from '../src/features/marketing/utils/blogPublish.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
if (typeof process.loadEnvFile === 'function') {
  for (const f of ['.env.production', '.env.local']) {
    try { process.loadEnvFile(join(ROOT, f)); } catch { /* optional */ }
  }
}

const DRY = process.argv.includes('--dry');
const CODE = { 'zh-hant': 'ch', 'zh-hans': 'cn' }; // else identity

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) { console.error('VITE_SUPABASE_URL/ANON_KEY 없음'); process.exit(1); }
const sb = createClient(url, key);

const { data: pubs, error } = await sb
  .from('blog_published')
  .select('article_id, language')
  .eq('status', 'published');
if (error) { console.error('blog_published 조회 실패:', error.message); process.exit(1); }

const { data: arts, error: aerr } = await sb
  .from('marketing_articles')
  .select('id, title, blog, blog_references, translations');
if (aerr) { console.error('marketing_articles 조회 실패:', aerr.message); process.exit(1); }
const byId = new Map((arts ?? []).map((r) => [r.id, r]));

let done = 0, skipped = 0, failed = 0;
const perLang = {};

for (const p of pubs ?? []) {
  const row = byId.get(p.article_id);
  if (!row) { skipped++; continue; }
  const article = { id: row.id, title: row.title, blog: row.blog ?? {}, blogReferences: row.blog_references ?? [], translations: row.translations ?? {} };
  const code = CODE[p.language] ?? p.language;
  let draft;
  try { draft = buildPublishedBlog(article, code); }
  catch (e) { failed++; console.warn(`  [skip] ${p.article_id} ${p.language}: ${e.message}`); continue; }
  if (DRY) { done++; perLang[p.language] = (perLang[p.language] ?? 0) + 1; continue; }
  const { error: upErr } = await sb.from('blog_published')
    .update({ html_body: draft.htmlBody, updated_at: new Date().toISOString() })
    .eq('article_id', p.article_id).eq('language', p.language);
  if (upErr) { failed++; console.warn(`  [fail] ${p.article_id} ${p.language}: ${upErr.message}`); continue; }
  done++; perLang[p.language] = (perLang[p.language] ?? 0) + 1;
}

console.log(`\n${DRY ? '[DRY] 재-bake 예정' : '재-bake 완료'}: ${done} · 스킵 ${skipped} · 실패 ${failed}`);
console.log('  언어별:', JSON.stringify(perLang));
