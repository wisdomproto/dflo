// 영어 3편(#903~905)을 blog_published 에 published 로 넣는다.
//   node scripts/publish-en-clinic-posts.mjs [--dry]
//
// 본문 조립 규칙은 v4 `src/features/marketing/utils/blogHtml.ts` 의 순수 함수와 같아야 한다
// (미리보기·발행·정적 렌더 마크업이 어긋나면 안 됨). 참고문헌은 이 3편에 없다.
//
// article_id 는 marketing_articles 를 가리키는 외래키다(임의 UUID 불가). 정적 빌드는 이걸
// hreflang 클러스터 키로도 쓴다 — 같은 콘텐츠의 언어별 글이 한 id 를 공유한다. 이 3편은
// 영어만 있으므로 자기 자신만 가리키는 클러스터가 된다(번역이 생기면 같은 id 로 붙이면 됨).
import { rest } from './lib/reelDb.mjs';

const DRY = process.argv.includes('--dry');

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function buildHtmlBody(en) {
  const sections = (en.sections ?? []).map((s) => {
    const h = s.heading ? `<h2>${esc(s.heading)}</h2>` : '';
    const img = s.imageUrl ? `<img src="${esc(s.imageUrl)}" alt="${esc(s.heading)}" loading="lazy">` : '';
    const body = s.html && s.html.trim() ? s.html : '<p class="post-empty">(본문 비어 있음)</p>';
    return `${h}${img}${body}`;
  }).join('\n');
  const faqItems = (en.faq ?? []).filter((f) => f.q?.trim());
  const faq = faqItems.length
    ? `<section class="post-faq"><h2>FAQ</h2>${faqItems.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>`
    : '';
  return (sections || '<p class="post-empty">아직 본문이 없습니다.</p>') + faq;
}

// 범위 지정: node scripts/publish-en-clinic-posts.mjs 906-908 (기본 903-905)
const [from, to] = (process.argv.find((a) => /^\d+-\d+$/.test(a)) ?? '903-905').split('-');
const arts = await (await rest(`marketing_articles?kind=eq.regular&sort_order=gte.${from}&sort_order=lte.${to}&select=id,sort_order,blog&order=sort_order`)).json();
if (!arts.length) { console.error(`#${from}~${to} 정규 글 없음`); process.exit(1); }

for (const a of arts) {
  const en = a.blog?.en;
  if (!en) { console.error(`#${a.sort_order} blog.en 없음`); process.exit(1); }
  const missing = (en.sections ?? []).filter((s) => !s.imageUrl).length;
  if (missing) { console.error(`#${a.sort_order} 이미지 없는 섹션 ${missing}개 — 발행 중단`); process.exit(1); }

  const html = buildHtmlBody(en);
  // 이미 있으면 갱신(재실행 안전). 없으면 새 article_id 로 생성.
  const found = await (await rest(`blog_published?language=eq.en&slug=eq.${encodeURIComponent(en.slug)}&select=id,article_id`)).json();
  const now = new Date().toISOString();
  const row = {
    language: 'en',
    slug: en.slug,
    seo_title: en.seoTitle,
    meta_description: en.metaDescription ?? '',
    html_body: html,
    status: 'published',
    published_at: now,
    updated_at: now,
  };

  if (DRY) {
    console.log(`${found.length ? '갱신' : '신규'} — ${en.slug}`);
    console.log(`   본문 ${html.length}자 · h2 ${(html.match(/<h2>/g) || []).length} · img ${(html.match(/<img/g) || []).length}`);
    continue;
  }

  if (found.length) {
    await rest(`blog_published?id=eq.${found[0].id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row),
    });
    console.log(`갱신 — ${en.slug}`);
  } else {
    await rest('blog_published', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...row, article_id: a.id, created_at: now }),
    });
    console.log(`발행 — ${en.slug}`);
  }
}

const total = await (await rest('blog_published?language=eq.en&status=eq.published&select=slug')).json();
console.log(`\n영어 발행본 ${total.length}편. 다음 배포에 /en/blog/{slug}/ 로 나간다.`);
