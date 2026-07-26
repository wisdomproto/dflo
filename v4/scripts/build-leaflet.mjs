// 리플렛 v2 빌드 — docs/Leaflet/v2/content/{lang}.yml + template.html
//                   → v4/public/leaflet/v2/{lang}/index.html
//
// 홈페이지와 같은 미니 렌더러(lib/render.mjs)를 쓴다: {{key}} + {{#each}} 만.
// 키가 빠지면 throw 하므로 번역이 덜 된 언어는 빌드가 조용히 통과하지 않는다.
// (옛 리플렛은 절대좌표 + auto-fit 이라 번역이 길면 폰트를 줄여 넘겼다 — 그 구조를 버린 것이 이 빌드다.)
//
// 사용: cd v4 && npm run build:leaflet
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { render } from './lib/render.mjs';

const V4 = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(V4, '..', 'docs', 'Leaflet', 'v2');
const OUT = join(V4, 'public', 'leaflet', 'v2');

const template = readFileSync(join(SRC, 'template.html'), 'utf8');
const langs = readdirSync(join(SRC, 'content'))
  .filter((f) => f.endsWith('.yml'))
  .map((f) => f.replace(/\.yml$/, ''));

mkdirSync(OUT, { recursive: true });
copyFileSync(join(SRC, 'leaflet.css'), join(OUT, 'leaflet.css'));

for (const lang of langs) {
  const data = yaml.load(readFileSync(join(SRC, 'content', `${lang}.yml`), 'utf8'));
  if (data.meta.lang !== lang) throw new Error(`${lang}.yml 의 meta.lang 이 ${data.meta.lang}`);

  const html = render(template, data);
  // 렌더러가 빠진 키는 throw 하지만, 오타로 남은 자리표시자까지 잡는다.
  const left = html.match(/\{\{[^}]*\}\}/g);
  if (left) throw new Error(`${lang}: 치환 안 된 자리표시자 ${left.slice(0, 3).join(', ')}`);

  const dir = join(OUT, lang);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html, 'utf8');
  console.log(`  ${lang} — 시트 ${(html.match(/class="sheet/g) || []).length}장`);
}
console.log(`[leaflet v2] ${langs.length}개 언어 → public/leaflet/v2/`);
