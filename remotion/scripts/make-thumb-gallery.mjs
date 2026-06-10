// 렌더된 372장 커버를 한눈에 검토하는 갤러리 HTML 생성.
// 출력: remotion/out/marketing/thumbs/gallery.html  (같은 폴더의 {n}-{lang}.png 참조)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = join(root, "out", "marketing", "thumbs");
const src = JSON.parse(readFileSync(join(root, "..", "docs", "storyboards", "_thumb-source.json"), "utf8"));

const LANGS = [["ko", "🇰🇷 한국어"], ["th", "🇹🇭 태국"], ["vi", "🇻🇳 베트남"], ["en", "🇺🇸 영어"], ["cn", "🇨🇳 간체"], ["ch", "🇹🇼 번체"]];
const byCat = {};
for (const it of src) (byCat[it.category] ||= []).push(it);

let cards = "";
for (const cat of Object.keys(byCat).sort()) {
  cards += `<h2>${cat}</h2>`;
  for (const it of byCat[cat]) {
    const cols = LANGS.map(([l, label]) => {
      const f = `${it.n}-${l}.png`;
      const has = existsSync(join(outDir, f));
      return `<figure><img loading="lazy" src="./${f}" alt="${it.n}-${l}"${has ? "" : ' style="opacity:.25"'}/><figcaption>${label}${has ? "" : " ⚠"}</figcaption></figure>`;
    }).join("");
    cards += `<section class="card"><div class="ttl"><b>#${it.n}</b> ${it.title}</div><div class="row">${cols}</div></section>`;
  }
}

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>릴스 커버 갤러리 — 62×6</title>
<style>
  body{margin:0;background:#0f1014;color:#e8e8ee;font-family:'Noto Sans KR',system-ui,sans-serif;padding:24px}
  h1{font-size:22px;margin:0 0 4px}
  .sub{color:#9aa;font-size:13px;margin-bottom:20px}
  h2{margin:28px 0 10px;font-size:16px;color:#8fd;border-bottom:1px solid #2a2c36;padding-bottom:6px}
  .card{background:#181a22;border:1px solid #262833;border-radius:12px;padding:12px 14px;margin-bottom:14px}
  .ttl{font-size:14px;margin-bottom:10px;color:#dfe3ee}
  .ttl b{color:#ffd54a;margin-right:6px}
  .row{display:flex;gap:10px;flex-wrap:wrap}
  figure{margin:0;width:150px}
  img{width:150px;height:267px;object-fit:cover;border-radius:8px;background:#000;display:block;cursor:zoom-in}
  figcaption{font-size:11px;color:#9aa;text-align:center;margin-top:4px}
  dialog{border:none;background:transparent;padding:0}
  dialog img{width:auto;height:90vh;cursor:zoom-out}
  dialog::backdrop{background:rgba(0,0,0,.85)}
</style></head><body>
<h1>릴스 커버 갤러리 — 62 콘텐츠 × 6 언어 = 372장</h1>
<div class="sub">이미지 클릭 = 확대 · ⚠ = 렌더 누락</div>
${cards}
<dialog id="z"><img id="zi" src=""/></dialog>
<script>
  const z=document.getElementById('z'),zi=document.getElementById('zi');
  document.querySelectorAll('.row img').forEach(im=>im.addEventListener('click',()=>{zi.src=im.src;z.showModal();}));
  z.addEventListener('click',()=>z.close());
</script>
</body></html>`;

writeFileSync(join(outDir, "gallery.html"), html, "utf8");
console.log(`gallery → ${join(outDir, "gallery.html")}`);
