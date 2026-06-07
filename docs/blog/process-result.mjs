// Read the workflow output file → normalize → docs/blog/_out/result.json. Print counts.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTFILE = process.argv[2];
if (!OUTFILE) { console.error('usage: node process-result.mjs <workflow-output-file>'); process.exit(1); }

let raw = readFileSync(OUTFILE, 'utf8').replace(/^﻿/, '');
let parsed;
try { parsed = JSON.parse(raw); }
catch {
  const i = raw.indexOf('{"keywords"');
  const j = raw.lastIndexOf('}');
  if (i < 0 || j < 0) { console.error('Could not locate JSON in output file'); process.exit(1); }
  parsed = JSON.parse(raw.slice(i, j + 1));
}
// Workflow output is wrapped: { summary, agentCount, logs, result:{keywords,pilot} }
const json = parsed.result || parsed;
if (Array.isArray(parsed.logs)) console.log('LOGS:', parsed.logs.join(' | '));

mkdirSync(join(__dirname, '_out'), { recursive: true });
writeFileSync(join(__dirname, '_out', 'result.json'), JSON.stringify(json), 'utf8');

const kw = json.keywords || {};
console.log('keywords langs:', Object.keys(kw).join(', '));
for (const L of Object.keys(kw)) console.log(`  ${L}: pillars ${kw[L].pillars?.length ?? 0}, mappings ${kw[L].mappings?.length ?? 0}`);
const pilot = json.pilot || [];
console.log('pilot articles:', pilot.length);
const byLang = pilot.reduce((m, a) => { (m[a.language] = m[a.language] || []).push(a.n); return m; }, {});
for (const L of Object.keys(byLang)) console.log(`  ${L}: n=[${byLang[L].sort((a, b) => a - b).join(',')}]  sections=[${pilot.filter((a) => a.language === L).map((a) => a.sections?.length).join(',')}]`);
console.log('Saved docs/blog/_out/result.json');
