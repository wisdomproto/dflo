// Print SEO scores for pilot articles + cannibalization across the 62-topic keyword map.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scoreArticle, findCannibalization } from './lib/seo-check.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const r = JSON.parse(readFileSync(join(__dirname, '_out', 'result.json'), 'utf8'));
const LANGS = ['ko', 'en', 'th', 'vi'];

console.log('=== PILOT SEO SCORES ===');
for (const L of LANGS) {
  const arts = (r.pilot || []).filter((a) => a.language === L).sort((a, b) => a.n - b.n);
  const scored = arts.map((a) => ({ a, sc: scoreArticle(a, L) }));
  const avg = scored.length ? Math.round(scored.reduce((s, x) => s + x.sc.score, 0) / scored.length) : 0;
  console.log(`\n[${L}] 평균 ${avg}/100`);
  for (const { a, sc } of scored) {
    const issues = sc.details.filter((x) => x.status !== 'good');
    console.log(`  #${a.n} ${sc.score}/100 (${sc.grade})  title=${(a.seoTitle || '').length}자 meta=${(a.metaDescription || '').length}자  ${issues.length ? '⚠ ' + issues.map((x) => x.label + '(' + x.msg + ')').join('; ') : '전항목 통과'}`);
  }
}

console.log('\n=== CANNIBALIZATION (62 topics × lang) ===');
const cannib = findCannibalization(Object.fromEntries(LANGS.map((L) => [L, r.keywords?.[L]?.mappings || []])));
for (const L of LANGS) {
  const c = cannib[L] || [];
  console.log(`[${L}] ${c.length ? c.length + '건 중복: ' + c.map((x) => x.keyword + '(#' + x.topics.join(',#') + ')').join(' | ') : '✓ 중복 없음 (62 primary 전부 고유)'}`);
}
