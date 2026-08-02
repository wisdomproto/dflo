// 영어 클리닉 글 6편(#903~908)의 번역을 marketing_articles.blog[lang] 에 넣고 발행한다.
//   node scripts/publish-clinic-translations.mjs th [--dry]
//   node scripts/publish-clinic-translations.mjs all
//
// 번역 원고는 `scripts/i18n-clinic/{lang}.mjs` 가 sort_order 를 키로 export 한다.
// ★섹션 이미지는 영어판 것을 그대로 쓴다 — 텍스트 없는 일러스트라 언어 공통이다
//   (블로그 섹션 이미지 정책. 카드뉴스와 반대).
// ★article_id 는 같은 marketing_articles 행을 가리키므로 언어별 글이 자동으로
//   hreflang 클러스터가 된다(slug 는 언어마다 달라도 된다).
import { rest } from './lib/reelDb.mjs';

// ko 제외 — 이 6편은 「해외에서 한국 클리닉 찾기」 각도라 국내 독자에겐 안 맞는다.
const LANGS = ['th', 'vi', 'ja', 'es', 'zh-hant', 'zh-hans', 'ar'];
// 마케팅 콘텐츠(marketing_articles.blog)는 중국어를 ch/cn 으로 부른다 — 사이트(blog_published)의
// zh-hant/zh-hans 와 별개 체계다. 나머지 언어는 양쪽이 같은 코드.
const MARKETING_KEY = { 'zh-hant': 'ch', 'zh-hans': 'cn' };
const DRY = process.argv.includes('--dry');
const arg = process.argv[2];
const targets = arg === 'all' ? LANGS : [arg];
if (!targets.every((l) => LANGS.includes(l))) {
  console.error(`언어: ${LANGS.join(' | ')} | all`);
  process.exit(1);
}

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// v4 `src/features/marketing/utils/blogHtml.ts` 와 같은 조립 규칙.
function buildHtmlBody(post) {
  const sections = (post.sections ?? []).map((s) => {
    const h = s.heading ? `<h2>${esc(s.heading)}</h2>` : '';
    const img = s.imageUrl ? `<img src="${esc(s.imageUrl)}" alt="${esc(s.heading)}" loading="lazy">` : '';
    return `${h}${img}${s.html}`;
  }).join('\n');
  const faqItems = (post.faq ?? []).filter((f) => f.q?.trim());
  const faq = faqItems.length
    ? `<section class="post-faq"><h2>FAQ</h2>${faqItems.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>`
    : '';
  return sections + faq;
}

const arts = await (await rest('marketing_articles?kind=eq.regular&sort_order=gte.903&sort_order=lte.908&select=id,sort_order,blog&order=sort_order')).json();

for (const lang of targets) {
  const { default: TR } = await import(`./i18n-clinic/${lang}.mjs`);
  console.log(`\n=== ${lang} ===`);

  for (const a of arts) {
    const t = TR[a.sort_order];
    if (!t) { console.error(`#${a.sort_order} ${lang} 원고 없음 — 건너뜀`); continue; }

    const enSections = a.blog?.en?.sections ?? [];
    if (t.sections.length !== enSections.length) {
      console.error(`#${a.sort_order} ${lang} 섹션 수 불일치 (${t.sections.length} ≠ ${enSections.length})`);
      process.exit(1);
    }
    // 이미지는 영어판에서 그대로 물려받는다.
    const post = {
      ...t,
      sections: t.sections.map((s, i) => ({
        ...s,
        imagePrompt: enSections[i].imagePrompt,
        imageUrl: enSections[i].imageUrl,
      })),
    };
    const missing = post.sections.filter((s) => !s.imageUrl).length;
    if (missing) { console.error(`#${a.sort_order} 영어판 이미지 ${missing}개 비어 있음 — 중단`); process.exit(1); }

    const html = buildHtmlBody(post);
    const now = new Date().toISOString();

    if (DRY) {
      console.log(`#${a.sort_order} ${post.slug} — ${html.length}자 · h2 ${(html.match(/<h2>/g) || []).length} · img ${(html.match(/<img/g) || []).length}`);
      continue;
    }

    // 🚨 a.blog 를 갱신해 가며 쓴다 — arts 는 루프 밖에서 한 번만 읽으므로,
    // 매번 원본 위에 자기 언어만 얹으면 마지막 언어를 뺀 전부가 덮여 사라진다(실제로 겪음).
    // ★마케팅 UI 는 중국어를 ch/cn 으로 부른다(blog_published 는 zh-hant/zh-hans). 셀렉터와 맞춘다.
    a.blog = { ...(a.blog ?? {}), [MARKETING_KEY[lang] ?? lang]: post };
    await rest(`marketing_articles?id=eq.${a.id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ blog: a.blog }),
    });

    const found = await (await rest(`blog_published?language=eq.${lang}&slug=eq.${encodeURIComponent(post.slug)}&select=id`)).json();
    const row = {
      language: lang, slug: post.slug, seo_title: post.seoTitle,
      meta_description: post.metaDescription ?? '', html_body: html,
      status: 'published', published_at: now, updated_at: now,
    };
    if (found.length) {
      await rest(`blog_published?id=eq.${found[0].id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
      console.log(`갱신 #${a.sort_order} — ${post.slug}`);
    } else {
      await rest('blog_published', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ...row, article_id: a.id, created_at: now }) });
      console.log(`발행 #${a.sort_order} — ${post.slug}`);
    }
  }
}

const pub = await (await rest('blog_published?status=eq.published&select=language')).json();
const c = {};
pub.forEach((r) => { c[r.language] = (c[r.language] || 0) + 1; });
console.log('\n발행본 언어별:', JSON.stringify(c));
