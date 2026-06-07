// Read bulk workflow output → write docs/blog/articles/{n}-{lang}.json + print SEO summary.
// Run: node docs/blog/process-bulk.mjs <workflow-output-file>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scoreArticle } from './lib/seo-check.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTFILE = process.argv[2];
if (!OUTFILE) { console.error('usage: node process-bulk.mjs <output-file>'); process.exit(1); }

let raw = readFileSync(OUTFILE, 'utf8').replace(/^﻿/, '');
let parsed;
try { parsed = JSON.parse(raw); }
catch {
  const i = raw.indexOf('{"summary"');
  parsed = JSON.parse(raw.slice(i >= 0 ? i : raw.indexOf('{')));
}
if (Array.isArray(parsed.logs)) console.log('LOGS:', parsed.logs.join(' | '));
const data = parsed.result || parsed;
const articles = data.articles || [];
const ART = join(__dirname, 'articles');
mkdirSync(ART, { recursive: true });
for (const a of articles) writeFileSync(join(ART, `${a.n}-${a.language}.json`), JSON.stringify(a, null, 2), 'utf8');
console.log('wrote', articles.length, 'article files to docs/blog/articles/');

const LANGS = ['ko', 'en', 'th', 'vi'];
let grand = 0, grandN = 0;
for (const L of LANGS) {
  const arts = articles.filter((a) => a.language === L);
  const scored = arts.map((a) => ({ a, sc: scoreArticle(a, L) }));
  const avg = scored.length ? Math.round(scored.reduce((s, x) => s + x.sc.score, 0) / scored.length) : 0;
  const low = scored.filter((x) => x.sc.score < 85).sort((p, q) => p.sc.score - q.sc.score);
  grand += scored.reduce((s, x) => s + x.sc.score, 0); grandN += scored.length;
  console.log(`\n[${L}] ${arts.length}편 · 평균 ${avg} · <85: ${low.length}편`);
  for (const { a, sc } of low) console.log(`   #${a.n} ${sc.score}(${sc.grade})  ${sc.details.filter((d) => d.status !== 'good').map((d) => d.label).join(', ')}`);
}
console.log(`\nTOTAL ${grandN}편 · 전체 평균 ${grandN ? Math.round(grand / grandN) : 0}`);
const missing = [];
for (let n = 1; n <= 62; n++) for (const L of LANGS) if (!articles.find((a) => a.n === n && a.language === L)) missing.push(`${n}-${L}`);
if (missing.length) console.log('MISSING:', missing.join(', '));
