// 빌드 산출물의 hreflang(HTML) + sitemap alternate 를 전수 검사한다.
// ★우리 호스팅은 없는 경로를 404 가 아니라 200 + 한국어 SPA 셸로 준다(soft-404) →
//   브라우저로 열어 "되네" 하면 절대 못 잡는다. 파일 존재로만 판정한다.
import fs from 'node:fs';
import path from 'node:path';
import { ACTIVE_LANGS, ORIGIN, PATH_PREFIX } from './lib/seo.mjs';

const PUB = 'public';
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : (e.name.endsWith('.html') ? [path.join(d, e.name)] : [])) : [];

const toFile = (urlPath) => {
  const p = path.join(PUB, urlPath.replace(PATH_PREFIX, ''));
  return p.endsWith('/') ? p + 'index.html' : p;
};

let total = 0, undef = 0, dangling = 0;
const check = (src, hreflang, href) => {
  total++;
  if (!hreflang || hreflang === 'undefined') { undef++; console.log('undefined:', src); return; }
  const target = toFile(href.replace(ORIGIN, ''));
  if (!fs.existsSync(target)) { dangling++; if (dangling < 5) console.log('허공:', src, '->', href); }
};

// 1) HTML 의 <link rel="alternate">
for (const f of ACTIVE_LANGS.flatMap((l) => walk(path.join(PUB, l)))) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/hreflang="([^"]*)"\s+href="([^"]+)"/g)) check(f, m[1], m[2]);
}
// 2) sitemap.xml 의 <xhtml:link rel="alternate"> — 여기가 ~1300개다. HTML 만 보면 통째로 놓친다.
const sm = fs.readFileSync(path.join(PUB, 'sitemap.xml'), 'utf8');
for (const m of sm.matchAll(/hreflang="([^"]*)"\s+href="([^"]+)"/g)) check('sitemap.xml', m[1], m[2]);

const locs = (sm.match(/<loc>/g) || []).length;
console.log(`hreflang 총 ${total} | undefined ${undef} | 허공 ${dangling} | sitemap <loc> ${locs}`);

// ★검사가 아무것도 못 찾고 "0 0 0" 으로 통과하는 게 최악이다 — 바닥을 깐다.
if (total < 1000) throw new Error(`검사 대상이 ${total}개뿐 — 정규식이나 경로가 깨졌다(정상은 1300+)`);
if (undef || dangling) throw new Error(`undefined ${undef} · 허공 ${dangling}`);
console.log('OK');
