// 성장호르몬 신규 2토픽(A/B)의 다국어 블로그를 marketing_articles.blog 에 병합 후
// blog_published 로 발행. 번역 파일은 scratchpad/gh-blog/{A,B}-{lang}.json (워크플로우 산출).
//
// 언어 매핑: 사이트 코드 → blog 콘텐츠 코드(zh-hant→ch·zh-hans→cn, 나머지 동일).
// ko 는 이미 DB blog.ko 에 있으므로 파일 병합 대상에서 제외(발행만).
//
// 사용: node --import tsx scripts/publish-gh-blog.mjs [--dry]

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';
import { buildPublishedBlog } from '../src/features/marketing/utils/blogPublish.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['../ai-server/.env', '.env.production', '.env.local']) {
  try { process.loadEnvFile(join(ROOT, f)); } catch { /* optional */ }
}

const DRY = process.argv.includes('--dry');
const GH = 'C:/Users/101024/AppData/Local/Temp/claude/C--projects-dflo-0-1--claude-worktrees-priceless-hertz-e129ef/048e3c89-7040-44b8-826d-fea23db7920a/scratchpad/gh-blog';
const IDS = JSON.parse(fs.readFileSync(join(GH, 'ids.json'), 'utf8')); // [{id,sort_order,slug}]
const TOPIC_BY_SORT = { 909: 'A', 910: 'B' };

// site lang → { code: blog 키, file: 파일 접미사(없으면 파일 병합 스킵) }
const LANGS = [
  { site: 'ko', code: 'ko', file: null },
  { site: 'th', code: 'th', file: 'th' },
  { site: 'vi', code: 'vi', file: 'vi' },
  { site: 'en', code: 'en', file: 'en' },
  { site: 'zh-hant', code: 'ch', file: 'zh-hant' },
  { site: 'zh-hans', code: 'cn', file: 'zh-hans' },
  { site: 'ar', code: 'ar', file: 'ar' },
];

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !svc || !anon) { console.error('env 부족 (SUPABASE_URL/SERVICE_ROLE/ANON)'); process.exit(1); }
const admin = createClient(url, svc);   // marketing_articles 쓰기
const pub = createClient(url, anon);    // blog_published 쓰기(anon 정책 존재)

let merged = 0, published = 0, failed = 0;

for (const meta of IDS) {
  const topic = TOPIC_BY_SORT[meta.sort_order];
  // 1) 번역 파일 → blog[code] 병합
  const { data: rows } = await admin.from('marketing_articles').select('id,title,blog,blog_references,translations').eq('id', meta.id);
  const row = rows?.[0];
  if (!row) { console.warn('article 없음', meta.id); continue; }
  const blog = { ...(row.blog || {}) };
  for (const L of LANGS) {
    if (!L.file) continue;
    const p = join(GH, `${topic}-${L.file}.json`);
    if (!fs.existsSync(p)) { console.warn(`  파일없음 ${topic}-${L.file}`); continue; }
    blog[L.code] = JSON.parse(fs.readFileSync(p, 'utf8'));
    merged++;
  }
  if (!DRY) await admin.from('marketing_articles').update({ blog }).eq('id', meta.id);

  // 2) 발행
  const article = { id: row.id, title: row.title, blog, blogReferences: row.blog_references ?? [], translations: row.translations ?? {} };
  for (const L of LANGS) {
    const seo = blog[L.code];
    if (!seo || !((seo.sections?.length ?? 0) > 0 || seo.h1)) { continue; }
    let draft;
    try { draft = buildPublishedBlog(article, L.code); }
    catch (e) { failed++; console.warn(`  [skip] ${topic} ${L.site}: ${e.message}`); continue; }
    if (DRY) { published++; continue; }
    const now = new Date().toISOString();
    const { error } = await pub.from('blog_published').upsert({
      article_id: row.id, language: L.site, slug: draft.slug,
      seo_title: draft.seoTitle, meta_description: draft.metaDescription, html_body: draft.htmlBody,
      status: 'published', published_at: now, updated_at: now,
    }, { onConflict: 'article_id,language' });
    if (error) { failed++; console.warn(`  [fail] ${topic} ${L.site}: ${error.message}`); continue; }
    published++;
  }
}

console.log(`\n${DRY ? '[DRY] ' : ''}병합 ${merged} · 발행 ${published} · 실패 ${failed}`);
