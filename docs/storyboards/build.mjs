// docs/storyboards/build.mjs — specs/*.json → v4/public/storyboards/{n}.html + index.json 매니페스트.
//   node docs/storyboards/build.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderStoryboard } from './render.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPECS = join(__dirname, 'specs');
const OUT = join(__dirname, '..', '..', 'v4', 'public', 'storyboards');
mkdirSync(OUT, { recursive: true });

const files = readdirSync(SPECS).filter((f) => f.endsWith('.json'));
const ns = [];
for (const f of files) {
  const spec = JSON.parse(readFileSync(join(SPECS, f), 'utf8'));
  writeFileSync(join(OUT, `${spec.n}.html`), renderStoryboard(spec));
  ns.push(spec.n);
  console.log(`✓ ${spec.n}.html — ${spec.topicTitle || spec.title}`);
}
ns.sort((a, b) => a - b);
writeFileSync(join(OUT, 'index.json'), JSON.stringify(ns));
console.log(`\n📄 manifest [${ns.join(', ')}] — ${ns.length} storyboards`);
