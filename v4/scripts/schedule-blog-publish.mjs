// 준비된 SEO 블로그 토픽을 하루 1개(ko+th 동시)로 예약하는 스크립트.
// 실행: cd v4 && node --import tsx scripts/schedule-blog-publish.mjs [--dry-run] [--start YYYY-MM-DD] [--time HH:mm] [--langs ko,th] [--limit N] [--only 1,2,3]
//
// 동작: marketing_articles(kind='regular') 조회 → 준비 토픽 선별 → 이미 예약/발행된 토픽 skip
//   → 남은 토픽을 시작일부터 하루 1개씩 → 각 토픽 × 언어: blog_published(draft) upsert + marketing_publish_queue(scheduled) insert.
import { createClient } from '@supabase/supabase-js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectReadyTopics, planSchedule } from './lib/blog-schedule.mjs';
import { buildPublishedBlog } from '../src/features/marketing/utils/blogPublish.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
if (typeof process.loadEnvFile === 'function') {
  for (const f of ['.env.local', '.env.production']) {
    try { process.loadEnvFile(join(ROOT, f)); } catch { /* optional */ }
  }
}

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
}
const DRY = process.argv.includes('--dry-run');
const LANGS = arg('langs', 'ko,th').split(',').map((s) => s.trim()).filter(Boolean);
const TIME = arg('time', '09:00');
const LIMIT = arg('limit', null);
const ONLY = arg('only', null);
// 시작일 기본 = 내일(KST). process.argv 로만 결정(결정성). 미지정 시 today+1 (UTC 기준 날짜).
const START = arg('start', null);

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) { console.error('SUPABASE URL/KEY 없음 (.env.local 확인)'); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

function rowToArticle(r) {
  return {
    id: r.id, title: r.title ?? '', body: r.body ?? '',
    translations: r.translations ?? {}, blog: r.blog ?? {},
    blogReferences: r.blog_references ?? [], sortOrder: r.sort_order ?? 0,
  };
}

function defaultStart() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const startDate = START || defaultStart();
  // 1) articles
  const { data: rows, error } = await sb
    .from('marketing_articles')
    .select('id, title, body, translations, blog, blog_references, sort_order, kind')
    .eq('kind', 'regular')
    .order('sort_order', { ascending: true });
  if (error) { console.error('articles 조회 실패:', error.message); process.exit(1); }
  let articles = (rows ?? []).map(rowToArticle);
  if (ONLY) {
    const set = new Set(ONLY.split(',').map((s) => Number(s.trim())));
    articles = articles.filter((a) => set.has(a.sortOrder));
  }

  // 2) 준비 토픽
  let ready = selectReadyTopics(articles, LANGS);

  // 3) 이미 예약/발행된 토픽 skip (website 큐에 scheduled/publishing/published 가 있는 article)
  const { data: q } = await sb
    .from('marketing_publish_queue')
    .select('article_id, status')
    .eq('channel', 'website').eq('content_kind', 'blog')
    .in('status', ['scheduled', 'publishing', 'published']);
  const skip = new Set((q ?? []).map((x) => x.article_id));

  // 4) slug 충돌 검사 (대상 토픽 간, 언어별)
  const slugSeen = {};
  for (const a of ready) {
    if (skip.has(a.id)) continue;
    for (const l of LANGS) {
      try {
        const slug = buildPublishedBlog(a, l).slug;
        const k = `${l}:${slug}`;
        if (slugSeen[k]) { console.warn(`⚠ slug 충돌: ${k} (#${a.sortOrder} & #${slugSeen[k]})`); }
        else slugSeen[k] = a.sortOrder;
      } catch (e) { console.warn(`⚠ #${a.sortOrder} ${l} 빌드 실패: ${e.message}`); }
    }
  }

  // 5) 스케줄 배정
  let plan = planSchedule(ready, { startDate, time: TIME, skipArticleIds: skip });
  if (LIMIT) plan = plan.slice(0, Number(LIMIT));

  // 요약
  console.log(`\n시작일 ${startDate}, 매일 ${TIME} KST, 언어 [${LANGS.join(', ')}]`);
  console.log(`준비 토픽 ${ready.length} / 이미 처리 skip ${skip.size} / 예약 대상 ${plan.length}`);
  const byId = new Map(ready.map((a) => [a.id, a]));
  for (const p of plan) console.log(`  #${p.sortOrder} → ${p.scheduledAtIso}`);
  const notReady = articles.filter((a) => !ready.find((r) => r.id === a.id) && !skip.has(a.id));
  if (notReady.length) console.log(`  (이미지/본문 미완 ${notReady.length}: ${notReady.map((a) => '#' + a.sortOrder).join(', ')})`);

  if (DRY) { console.log('\n[dry-run] 쓰기 없음.'); return; }

  // 6) 실제 쓰기: 토픽 × 언어 → blog_published(draft) upsert + queue(scheduled) insert
  const now = new Date().toISOString();
  let okCount = 0;
  for (const p of plan) {
    const a = byId.get(p.articleId);
    for (const lang of LANGS) {
      let draft;
      try { draft = buildPublishedBlog(a, lang); }
      catch (e) { console.warn(`  skip #${p.sortOrder} ${lang}: ${e.message}`); continue; }
      const { error: e1 } = await sb.from('blog_published').upsert({
        article_id: a.id, language: lang, slug: draft.slug, seo_title: draft.seoTitle,
        meta_description: draft.metaDescription, html_body: draft.htmlBody, status: 'draft', updated_at: now,
      }, { onConflict: 'article_id,language' });
      if (e1) { console.warn(`  blog_published 실패 #${p.sortOrder} ${lang}: ${e1.message}`); continue; }
      const { error: e2 } = await sb.from('marketing_publish_queue').insert({
        article_id: a.id, channel: 'website', channel_id: null, language: lang,
        content_kind: 'blog', status: 'scheduled', scheduled_at: p.scheduledAtIso, updated_at: now,
      });
      if (e2) { console.warn(`  queue 실패 #${p.sortOrder} ${lang}: ${e2.message}`); continue; }
      okCount++;
    }
  }
  console.log(`\n완료: ${okCount}건 예약 (토픽 ${plan.length} × 언어 ${LANGS.length}).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
