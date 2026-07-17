// marketing_articles.blog.ch/.cn → blog_published(zh-hant/zh-hans, published).
//
// ★마케팅 DB 의 중국어 콘텐츠 코드(ch=번체·cn=간체)를 사이트 로케일 코드(zh-hant·zh-hans)로
//   바꾸는 유일한 지점이 이 매핑이다. 다른 언어(ko/th/vi/en)는 코드가 같아 매핑이 없다.
//
// 본문 조립은 사이트 발행이 쓰는 실제 순수 함수 buildPublishedBlog 를 그대로 재사용한다
// (재구현하면 정적 렌더와 조용히 어긋난다). 콘텐츠 코드('ch'/'cn')로 호출해 FAQ·참고문헌
// 헤딩이 중국어로 나오게 하고, 저장 시 language 만 사이트 코드로 바꿔 넣는다.
//
// 스키마 보증: blog_published 는 unique(article_id, language) 이고 slug 전역 유니크·language
// CHECK 가 없다(039) → 중국어 slug 가 한국어 slug 와 같아도 (article,language) 가 다르므로 충돌 없음.
//
// 사용: node --import tsx scripts/publish-chinese-blog.mjs [--dry]

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
// [콘텐츠 코드, 사이트 로케일] — 이 배열이 유일한 매핑.
const MAP = [['ch', 'zh-hant'], ['cn', 'zh-hans']];

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) { console.error('VITE_SUPABASE_URL/ANON_KEY 없음 (.env.production/.env.local 확인)'); process.exit(1); }
const sb = createClient(url, key);

const { data: articles, error } = await sb
  .from('marketing_articles')
  .select('id, title, blog, blog_references, translations');
if (error) { console.error('marketing_articles 조회 실패:', error.message); process.exit(1); }

let planned = 0, done = 0, skipped = 0, failed = 0;
const perLang = { 'zh-hant': 0, 'zh-hans': 0 };
const samples = [];

for (const row of articles ?? []) {
  const article = {
    id: row.id, title: row.title,
    blog: row.blog ?? {}, blogReferences: row.blog_references ?? [], translations: row.translations ?? {},
  };
  for (const [code, lang] of MAP) {
    const seo = article.blog?.[code];
    // 사이트 발행 게이트와 동일 — 섹션이나 h1 이 있어야 SEO 본문으로 친다.
    if (!seo || !((seo.sections?.length ?? 0) > 0 || seo.h1)) { skipped++; continue; }
    let draft;
    try { draft = buildPublishedBlog(article, code); }
    catch (e) { failed++; console.warn(`  [skip] ${article.id} ${code}: ${e.message}`); continue; }
    planned++;
    if (samples.length < 4) samples.push(`${lang}  ${draft.slug}  «${draft.seoTitle.slice(0, 30)}»  ${draft.htmlBody.length}자`);
    if (DRY) continue;
    const now = new Date().toISOString();
    const { error: upErr } = await sb.from('blog_published').upsert({
      article_id: article.id, language: lang, slug: draft.slug,
      seo_title: draft.seoTitle, meta_description: draft.metaDescription, html_body: draft.htmlBody,
      status: 'published', published_at: now, updated_at: now,
    }, { onConflict: 'article_id,language' });
    if (upErr) { failed++; console.warn(`  [fail] ${article.id} ${lang}: ${upErr.message}`); continue; }
    done++; perLang[lang]++;
  }
}

console.log(`\n샘플:\n  ${samples.join('\n  ')}`);
console.log(`\n${DRY ? '[DRY] 발행 예정' : '발행 완료'}: ${DRY ? planned : done}건 · 스킵 ${skipped} · 실패 ${failed}`);
if (!DRY) console.log(`  zh-hant ${perLang['zh-hant']} · zh-hans ${perLang['zh-hans']}`);
