const ORIGIN = 'https://www.dr187growup.com';
const PATH_PREFIX = process.env.SITE_PATH_PREFIX ?? '';  // promoted to root in Phase 6 (override with /test for staging)
const HREFLANG_MAP = { ko: 'ko', th: 'th', vi: 'vi', en: 'en', ja: 'ja', 'zh-tw': 'zh-TW', id: 'id' };

function urlEntry(loc, allPaths) {
  const alternates = Object.entries(allPaths).map(([lang, path]) =>
    `    <xhtml:link rel="alternate" hreflang="${HREFLANG_MAP[lang]}" href="${ORIGIN}${PATH_PREFIX}/${lang}${path}"/>`
  );
  if (allPaths.ko) {
    alternates.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${PATH_PREFIX}/ko${allPaths.ko}"/>`);
  }
  return [`  <url>`, `    <loc>${loc}</loc>`, ...alternates, `  </url>`].join('\n');
}

// Static subpages built for every active lang (build-i18n.mjs SUBPAGES). They have unique
// indexable content (clinic = remote-consult, calculator = tool) so they belong in the sitemap.
const SUBPAGE_FILES = ['clinic.html', 'cases.html', 'calculator.html'];

export function buildSitemap({ activeLangs, blogSlugs = {}, blogAlts = {} }) {
  const entries = [];
  const homePaths = Object.fromEntries(activeLangs.map((l) => [l, '/']));
  for (const lang of activeLangs) {
    entries.push(urlEntry(`${ORIGIN}${PATH_PREFIX}/${lang}/`, homePaths));
  }

  for (const file of SUBPAGE_FILES) {
    const subPaths = Object.fromEntries(activeLangs.map((l) => [l, `/${file}`]));
    for (const lang of activeLangs) {
      entries.push(urlEntry(`${ORIGIN}${PATH_PREFIX}/${lang}/${file}`, subPaths));
    }
  }

  // Blog index only when that lang actually has built posts — an empty array means the
  // static blog was skipped (no ContentFlow env / nothing published), so /{lang}/blog/
  // falls through to the SPA shell and listing it would point Google at a soft-404.
  const blogLangs = activeLangs.filter((l) => blogSlugs[l]?.length);
  const blogListPaths = Object.fromEntries(blogLangs.map((l) => [l, '/blog/']));
  for (const lang of blogLangs) {
    entries.push(urlEntry(`${ORIGIN}${PATH_PREFIX}/${lang}/blog/`, blogListPaths));
  }

  // 언어별 번역은 article_id 로 묶인 클러스터(blogAlts)가 정본 — slug 가 언어마다 다르므로
  // "같은 slug 가 있으면 번역" 이라고 보면 안 된다(옛 방식은 그래서 자기 자신만 잡히거나
  // 우연히 같은 slug 를 오인했다). 클러스터가 없는 글(캐시 글 등)은 번역 없음 = 자기 자신만.
  for (const [lang, slugs] of Object.entries(blogSlugs)) {
    for (const slug of slugs) {
      const cluster = blogAlts[lang]?.[slug] ?? { [lang]: slug };
      const altPaths = {};
      for (const [otherLang, otherSlug] of Object.entries(cluster)) {
        // 실제로 빌드된 글만 — 미발행 언어를 넣으면 sitemap 이 없는 URL 을 가리킨다.
        if (blogSlugs[otherLang]?.includes(otherSlug)) altPaths[otherLang] = `/blog/${otherSlug}/`;
      }
      entries.push(urlEntry(`${ORIGIN}${PATH_PREFIX}/${lang}/blog/${slug}/`, altPaths));
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    // ★ 네임스페이스는 슬래시 — sitemaps.org 스펙 값은 `schemas/sitemap/0.9` 다.
    // `sitemap-0.9`(하이픈)은 XSD 파일명(.../sitemap/0.9/sitemap.xsd)에서 온 흔한 오기이고,
    // 이걸 쓰면 GSC 가 "네임스페이스가 잘못되었습니다"(인스턴스 1개 = 이 줄)로 오류를 낸다.
    // (구글은 관대해서 URL 260개는 읽어내지만 사이트맵이 오류 상태로 남는다.)
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
  ].join('\n');
}
