// Re-score all docs/blog/articles/*.json with current seo-check. Print avg + <85 list.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scoreArticle } from './lib/seo-check.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ART = join(__dirname, 'articles');
const arts = readdirSync(ART).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(ART, f), 'utf8')));
const LANGS = ['ko', 'en', 'th', 'vi'];
for (const L of LANGS) {
  const a = arts.filter((x) => x.language === L).map((x) => ({ x, sc: scoreArticle(x, L) }));
  const avg = Math.round(a.reduce((s, y) => s + y.sc.score, 0) / a.length);
  const low = a.filter((y) => y.sc.score < 85).sort((p, q) => p.sc.score - q.sc.score);
  console.log(`[${L}] ${a.length}편 · 평균 ${avg} · <85: ${low.length}편  ${low.map((y) => '#' + y.x.n + '(' + y.sc.score + ')').join(' ')}`);
  for (const { x, sc } of low) console.log(`   #${x.n}: ${sc.details.filter((d) => d.status !== 'good').map((d) => d.label + '[' + d.msg + ']').join(', ')}`);
}
