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
const igMap = {}; // n -> [{ ig, scene, title, motion, emojis, prompt, labels }] (인포그래픽 이미지 업로드 슬롯용)
for (const f of files) {
  const spec = JSON.parse(readFileSync(join(SPECS, f), 'utf8'));
  writeFileSync(join(OUT, `${spec.n}.html`), renderStoryboard(spec));
  ns.push(spec.n);
  igMap[spec.n] = (spec.infographics || []).map((g) => ({
    ig: g.ig, scene: g.scene, title: g.title, motion: g.motion,
    emojis: g.emojis || [], prompt: g.prompt || '', labels: g.labels || [],
  }));
  console.log(`✓ ${spec.n}.html — ${spec.topicTitle || spec.title} (인포 ${igMap[spec.n].length})`);
}
ns.sort((a, b) => a - b);
writeFileSync(join(OUT, 'index.json'), JSON.stringify(ns));
writeFileSync(join(OUT, 'infographics.json'), JSON.stringify(igMap));
console.log(`\n📄 manifest [${ns.join(', ')}] — ${ns.length} storyboards + infographics.json`);
