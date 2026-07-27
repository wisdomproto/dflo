// 리플렛 v2 빌드 — docs/Leaflet/v2/content/{lang}.yml + template.html
//                   → v4/public/leaflet/v2/{lang}/index.html
//
// 홈페이지와 같은 미니 렌더러(lib/render.mjs)를 쓴다: {{key}} + {{#each}} 만.
// 키가 빠지면 throw 하므로 번역이 덜 된 언어는 빌드가 조용히 통과하지 않는다.
// (옛 리플렛은 절대좌표 + auto-fit 이라 번역이 길면 폰트를 줄여 넘겼다 — 그 구조를 버린 것이 이 빌드다.)
//
// 사용: cd v4 && npm run build:leaflet
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { render } from './lib/render.mjs';

const V4 = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(V4, '..', 'docs', 'Leaflet', 'v2');
const OUT = join(V4, 'public', 'leaflet', 'v2');

// 치료 사례 그래프 — 표와 같은 rows 에서 SVG 를 굽는다(런타임 JS 0, 인쇄에서 안 깨짐).
// 나이는 로케일 문자열("만 11.4" / "age 11.4y")이라 첫 숫자만 뽑는다.
const num = (s) => parseFloat(String(s).replace(/[^\d.]+/g, ' ').trim().split(' ')[0]);

function caseChart(rows, legend) {
  const pts = rows.map((r) => ({ x: num(r.a), h: num(r.h), p: num(r.p) }));
  const W = 340, H = 176, L = 34, R = 8, T = 14, B = 22;
  const xs = pts.map((p) => p.x);
  const x0 = Math.min(...xs) - 0.2, x1 = Math.max(...xs) + 0.2;
  const vals = pts.flatMap((p) => [p.h, p.p]);
  const y0 = Math.floor((Math.min(...vals) - 4) / 5) * 5, y1 = Math.ceil((Math.max(...vals) + 4) / 5) * 5;
  const X = (v) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const path = (k) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p[k]).toFixed(1)}`).join('');
  const dots = (k, cls) => pts.map((p) => `<circle class="${cls}" cx="${X(p.x).toFixed(1)}" cy="${Y(p[k]).toFixed(1)}" r="2.6"/>`).join('');
  const grid = [y0, Math.round((y0 + y1) / 2), y1].map((v) =>
    `<line class="g" x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/>` +
    `<text class="ax" x="${L - 5}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end">${v}</text>`).join('');
  const end = (k, cls) => {
    const p = pts[pts.length - 1];
    return `<text class="v ${cls}" x="${(X(p.x) - 4).toFixed(1)}" y="${(Y(p[k]) - 7).toFixed(1)}" text-anchor="end">${p[k]}</text>`;
  };
  const age = (i) => `<text class="ax" x="${X(pts[i].x).toFixed(1)}" y="${H - 6}" text-anchor="middle">${pts[i].x}</text>`;
  return `<figure class="chart">
<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${legend.h} / ${legend.p}">
${grid}
<path class="ln p" d="${path('p')}"/><path class="ln h" d="${path('h')}"/>
${dots('p', 'p')}${dots('h', 'h')}
${end('p', 'p')}${end('h', 'h')}
${age(0)}${age(pts.length - 1)}
</svg>
<figcaption><span class="lg h">${legend.h}</span><span class="lg p">${legend.p}</span><span class="unit">${legend.unit}</span></figcaption>
</figure>`;
}

// Railway 는 v4/ 만 빌드 컨텍스트로 올린다 — docs/ 가 이미지에 없다.
// 산출물(public/leaflet/v2)은 커밋돼 있으므로 그걸 그대로 서빙하면 된다.
// (sync-reel-vendor.mjs 가 ../remotion 에 대해 쓰는 것과 같은 처리)
if (!existsSync(join(SRC, 'template.html'))) {
  console.log('[leaflet v2] docs/Leaflet/v2 없음 — 커밋된 산출물 사용 (Railway 빌드 컨텍스트).');
  process.exit(0);
}

const template = readFileSync(join(SRC, 'template.html'), 'utf8');
const langs = readdirSync(join(SRC, 'content'))
  .filter((f) => f.endsWith('.yml'))
  .map((f) => f.replace(/\.yml$/, ''));

mkdirSync(OUT, { recursive: true });
copyFileSync(join(SRC, 'leaflet.css'), join(OUT, 'leaflet.css'));

for (const lang of langs) {
  const data = yaml.load(readFileSync(join(SRC, 'content', `${lang}.yml`), 'utf8'));
  if (data.meta.lang !== lang) throw new Error(`${lang}.yml 의 meta.lang 이 ${data.meta.lang}`);

  for (const c of ['c1', 'c2', 'c3', 'c4']) {
    data.ch10[c].chart = caseChart(data.ch10[c].rows, data.ch10.legend);
  }

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
