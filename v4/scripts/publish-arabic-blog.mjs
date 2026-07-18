// marketing_articles.blog.ar → blog_published(ar, published).
//
// 아랍어는 콘텐츠 코드(ar)와 사이트 로케일 코드(ar)가 같아 매핑이 필요 없다
// (중국어만 ch→zh-hant·cn→zh-hans 매핑이 있었다 — publish-chinese-blog.mjs 참조).
//
// 본문 조립은 사이트 발행이 쓰는 실제 순수 함수 buildPublishedBlog 를 그대로 재사용한다
// (재구현하면 정적 렌더와 조용히 어긋난다). blogHtml.ts 의 FAQ/참고문헌 헤딩에 'ar'
// (الأسئلة الشائعة / المراجع)가 있어야 아랍어로 나온다.
//
// 스키마 보증: blog_published 는 unique(article_id, language) 이고 slug 전역 유니크·language
// CHECK 가 없다(039) → 아랍어 slug(=en slug 재사용)가 다른 언어 slug 와 같아도 (article,language)
// 가 다르므로 충돌 없음.
//
// 사용: node --import tsx scripts/publish-arabic-blog.mjs [--dry]

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
const LANG = 'ar';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) { console.error('VITE_SUPABASE_URL/ANON_KEY 없음 (.env.production/.env.local 확인)'); process.exit(1); }
const sb = createClient(url, key);

const { data: articles, error } = await sb
  .from('marketing_articles')
  .select('id, title, blog, blog_references, translations');
if (error) { console.error('marketing_articles 조회 실패:', error.message); process.exit(1); }

let planned = 0, done = 0, skipped = 0, failed = 0;
const samples = [];

for (const row of articles ?? []) {
  const article = {
    id: row.id, title: row.title,
    blog: row.blog ?? {}, blogReferences: row.blog_references ?? [], translations: row.translations ?? {},
  };
  const seo = article.blog?.[LANG];
  // 사이트 발행 게이트와 동일 — 섹션이나 h1 이 있어야 SEO 본문으로 친다.
  if (!seo || !((seo.sections?.length ?? 0) > 0 || seo.h1)) { skipped++; continue; }
  let draft;
  try { draft = buildPublishedBlog(article, LANG); }
  catch (e) { failed++; console.warn(`  [skip] ${article.id}: ${e.message}`); continue; }
  planned++;
  if (samples.length < 4) samples.push(`${draft.slug}  «${draft.seoTitle.slice(0, 30)}»  ${draft.htmlBody.length}자`);
  if (DRY) continue;
  const now = new Date().toISOString();
  const { error: upErr } = await sb.from('blog_published').upsert({
    article_id: article.id, language: LANG, slug: draft.slug,
    seo_title: draft.seoTitle, meta_description: draft.metaDescription, html_body: draft.htmlBody,
    status: 'published', published_at: now, updated_at: now,
  }, { onConflict: 'article_id,language' });
  if (upErr) { failed++; console.warn(`  [fail] ${article.id}: ${upErr.message}`); continue; }
  done++;
}

console.log(`\n샘플:\n  ${samples.join('\n  ')}`);
console.log(`\n${DRY ? '[DRY] 발행 예정' : '발행 완료'}: ${DRY ? planned : done}건 · 스킵 ${skipped} · 실패 ${failed}`);
