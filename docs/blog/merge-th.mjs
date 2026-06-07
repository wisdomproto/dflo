// Merge targeted-fix workflow output → overwrite docs/blog/articles/{n}-{lang}.json
// Run: node docs/blog/merge-th.mjs <workflow-output-file>
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scoreArticle } from './lib/seo-check.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTFILE = process.argv[2];
if (!OUTFILE) { console.error('usage: node merge-th.mjs <output-file>'); process.exit(1); }
let raw = readFileSync(OUTFILE, 'utf8').replace(/^﻿/, '');
let parsed; try { parsed = JSON.parse(raw); } catch { parsed = JSON.parse(raw.slice(raw.indexOf('{'))); }
if (Array.isArray(parsed.logs)) console.log('LOGS:', parsed.logs.join(' | '));
const arts = (parsed.result || parsed).articles || [];
for (const a of arts) {
  writeFileSync(join(__dirname, 'articles', `${a.n}-${a.language}.json`), JSON.stringify(a, null, 2), 'utf8');
  const sc = scoreArticle(a, a.language);
  console.log(`#${a.n}-${a.language} → ${sc.score}(${sc.grade})  title=${(a.seoTitle || '').length}자  primary="${a.primaryKeyword}"  ${sc.details.filter((d) => d.status !== 'good').map((d) => d.label).join(',') || '전항목 통과'}`);
}
console.log('merged', arts.length, 'articles');
