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

export function buildSitemap({ activeLangs, blogSlugs = {} }) {
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

  for (const [lang, slugs] of Object.entries(blogSlugs)) {
    for (const slug of slugs) {
      const altPaths = {};
      for (const [otherLang, otherSlugs] of Object.entries(blogSlugs)) {
        if (otherSlugs.includes(slug)) altPaths[otherLang] = `/blog/${slug}/`;
      }
      entries.push(urlEntry(`${ORIGIN}${PATH_PREFIX}/${lang}/blog/${slug}/`, altPaths));
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap-0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
  ].join('\n');
}
