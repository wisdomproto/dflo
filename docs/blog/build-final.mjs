// Build the full-corpus review page from docs/blog/articles/{n}-{lang}.json
//   → docs/blog/blog-final.html  (language tabs · per-lang score table · 248 collapsible articles · copy buttons)
// Run: node docs/blog/build-final.mjs
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scoreArticle, findCannibalization } from './lib/seo-check.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ART = join(__dirname, 'articles');
const KWDIR = join(__dirname, 'keywords');
const LANGS = ['ko', 'en', 'th', 'vi'];
const LANG_LABEL = { ko: '🇰🇷 한국어', en: '🇺🇸 English', th: '🇹🇭 ไทย', vi: '🇻🇳 Tiếng Việt' };

const topics = JSON.parse(readFileSync(join(__dirname, '_src', 'topics.json'), 'utf8'));
const titleOf = Object.fromEntries(topics.map((t) => [t.n, t.title]));
const catOf = Object.fromEntries(topics.map((t) => [t.n, t.cat]));
const mappingCombined = existsSync(join(KWDIR, 'mapping.json')) ? JSON.parse(readFileSync(join(KWDIR, 'mapping.json'), 'utf8')) : [];

if (!existsSync(ART)) { console.error('no articles dir — run process-bulk.mjs first'); process.exit(1); }
const files = readdirSync(ART).filter((f) => f.endsWith('.json'));
const articles = files.map((f) => JSON.parse(readFileSync(join(ART, f), 'utf8')));
const byLang = {};
for (const L of LANGS) byLang[L] = articles.filter((a) => a.language === L).sort((a, b) => a.n - b.n);

const cannib = findCannibalization(Object.fromEntries(LANGS.map((L) => [L, byLang[L].map((a) => ({ n: a.n, primaryKeyword: a.primaryKeyword }))])));

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const COPY = {}; let cid = 0;
const copyBtn = (text, label = '복사') => { const id = 'c' + cid++; COPY[id] = text; return `<button class="cp" data-c="${id}">${label}</button>`; };
const gcls = (g) => (g === 'A' || g === 'B' ? 'g-good' : g === 'C' || g === 'D' ? 'g-warn' : 'g-bad');

function fullText(a) {
  return [
    'SEO Title: ' + a.seoTitle, 'Slug: ' + a.slug, 'Meta: ' + a.metaDescription,
    'Primary: ' + a.primaryKeyword, 'Secondary: ' + (a.secondaryKeywords || []).join(', '), '',
    '# ' + a.h1, '',
    ...(a.sections || []).map((s) => '## ' + s.heading + '\n' + s.html + '\n[IMG] ' + s.imagePrompt),
    '', ...(a.faq || []).map((f) => 'Q: ' + f.q + '\nA: ' + f.a),
  ].join('\n');
}

function articleBlock(a) {
  const sc = scoreArticle(a, a.language);
  let h = `<details class="art" id="a-${a.language}-${a.n}"><summary><span class="badge">#${a.n} · ${catOf[a.n] || ''}</span> <span class="atitle">${esc(a.seoTitle)}</span> <span class="seo ${gcls(sc.grade)}">${sc.score} ${sc.grade}</span></summary>`;
  h += `<div class="art-b"><div class="row">${copyBtn(fullText(a), '📋 글 전체 복사')}</div>`;
  h += `<table class="meta"><tr><td>SEO Title</td><td>${esc(a.seoTitle)} <span class="len">(${(a.seoTitle || '').length})</span> ${copyBtn(a.seoTitle)}</td></tr>`;
  h += `<tr><td>Slug</td><td><code>${esc(a.slug)}</code> ${copyBtn(a.slug)}</td></tr>`;
  h += `<tr><td>Meta</td><td>${esc(a.metaDescription)} <span class="len">(${(a.metaDescription || '').length})</span> ${copyBtn(a.metaDescription)}</td></tr>`;
  h += `<tr><td>Primary</td><td><b>${esc(a.primaryKeyword)}</b></td></tr>`;
  h += `<tr><td>Secondary</td><td>${esc((a.secondaryKeywords || []).join(', '))}</td></tr></table>`;
  // SEO detail
  h += `<details class="seod"><summary>🔎 SEO ${sc.score}/100 — ${sc.details.filter((x) => x.status !== 'good').length}개 개선점</summary><table class="seot">` +
    sc.details.map((x) => `<tr class="st-${x.status}"><td class="ic">${x.status === 'good' ? '✓' : x.status === 'warn' ? '⚠' : '✗'}</td><td>${esc(x.label)}</td><td class="pt">${x.score}/${x.max}</td><td>${esc(x.msg)}</td></tr>`).join('') + '</table></details>';
  h += `<h1 class="art-title">${esc(a.h1)}</h1>`;
  for (const s of a.sections || []) {
    h += `<section class="sec"><h2>${esc(s.heading)}</h2><div class="body">${s.html || ''}</div>`;
    h += `<div class="imgp"><span class="imgp-l">🎨 16:9 이미지 프롬프트</span> ${copyBtn(s.imagePrompt)}<p>${esc(s.imagePrompt)}</p></div></section>`;
  }
  if (a.faq?.length) { h += '<section class="faq"><h2>FAQ</h2>'; for (const f of a.faq) h += `<p class="q">Q. ${esc(f.q)}</p><p class="a">${esc(f.a)}</p>`; h += '</section>'; }
  return h + '</div></details>';
}

function panel(L) {
  const arts = byLang[L];
  const scored = arts.map((a) => ({ a, sc: scoreArticle(a, L) }));
  const avg = scored.length ? Math.round(scored.reduce((s, x) => s + x.sc.score, 0) / scored.length) : 0;
  const pass = scored.filter((x) => x.sc.score >= 85).length;
  const can = cannib[L] || [];
  let h = `<div class="panel" data-lang="${L}" ${L === 'ko' ? '' : 'hidden'}>`;
  h += `<div class="stat">${arts.length}편 · 평균 SEO <b>${avg}</b> · 합격(≥85) <b>${pass}/${arts.length}</b></div>`;
  h += `<div class="cann ${can.length ? 'bad' : 'ok'}">${can.length ? '⚠ 키워드 중복 ' + can.length + '건: ' + can.map((c) => esc(c.keyword) + '(#' + c.topics.join(',#') + ')').join(' · ') : '✓ 카니발라이제이션 없음'}</div>`;
  // score table
  h += '<table class="idx"><thead><tr><th>#</th><th>KO 제목</th><th>SEO</th><th>제목(자)</th></tr></thead><tbody>';
  for (const { a, sc } of scored) h += `<tr><td>${a.n}</td><td class="kt"><a href="#a-${L}-${a.n}">${esc(titleOf[a.n] || a.seoTitle)}</a></td><td><span class="seo ${gcls(sc.grade)}">${sc.score} ${sc.grade}</span></td><td>${(a.seoTitle || '').length}</td></tr>`;
  h += '</tbody></table>';
  h += '<h2 class="sect">📝 글 (펼쳐서 확인)</h2>';
  for (const { a } of scored) h += articleBlock(a);
  return h + '</div>';
}

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>블로그 248편 — SEO 검토</title><style>
*{box-sizing:border-box}body{font-family:'Noto Sans KR',system-ui,sans-serif;margin:0;background:#f6f7f9;color:#1f2430;line-height:1.6}
header{position:sticky;top:0;background:#fff;border-bottom:1px solid #e5e7eb;padding:10px 16px;z-index:10;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
header h1{font-size:15px;margin:0 12px 0 0}
.tab{border:1px solid #d1d5db;background:#fff;padding:6px 14px;border-radius:999px;cursor:pointer;font-size:14px}.tab.on{background:#667eea;color:#fff;border-color:#667eea}
main{max-width:920px;margin:0 auto;padding:18px 16px 80px}
.stat{font-size:15px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px;margin-bottom:8px}
.sect{font-size:18px;margin:22px 0 10px;padding-bottom:6px;border-bottom:2px solid #667eea}
.idx{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;font-size:13px;margin-bottom:10px}
.idx th,.idx td{border:1px solid #eef0f3;padding:6px 9px;text-align:left}.idx th{background:#f3f4f6}.idx .kt{max-width:520px}.idx a{color:#4338ca;text-decoration:none}
.seo{font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;white-space:nowrap}
.g-good{background:#dcfce7;color:#166534}.g-warn{background:#fef9c3;color:#854d0e}.g-bad{background:#fee2e2;color:#991b1b}
.cann{margin:0 0 10px;padding:8px 12px;border-radius:8px;font-size:13px}.cann.ok{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}.cann.bad{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
.art{background:#fff;border:1px solid #e5e7eb;border-radius:10px;margin:8px 0}
.art>summary{cursor:pointer;padding:11px 14px;display:flex;gap:8px;align-items:center;list-style:none}
.art>summary::-webkit-details-marker{display:none}
.atitle{flex:1;font-weight:600;font-size:14px}
.badge{background:#667eea;color:#fff;padding:3px 9px;border-radius:999px;font-size:12px;white-space:nowrap}
.art-b{padding:0 16px 16px;border-top:1px solid #f1f5f9}
.row{margin:10px 0}
.meta{font-size:13px;margin:8px 0;width:100%}.meta td{border:1px solid #eef0f3;padding:6px 9px}.meta td:first-child{background:#f9fafb;width:90px;color:#6b7280;font-weight:600}
.len{color:#9ca3af;font-size:11px}
.seod{margin:8px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}.seod summary{cursor:pointer;padding:7px 10px;background:#f8fafc;font-size:13px;font-weight:600;color:#475569}
.seot{width:100%;font-size:12px}.seot td{border:1px solid #f1f5f9;padding:4px 8px}.seot .ic{width:24px;text-align:center}.seot .pt{width:48px;color:#64748b;text-align:right}
.st-good .ic{color:#16a34a}.st-warn{background:#fffbeb}.st-warn .ic{color:#d97706}.st-bad{background:#fef2f2}.st-bad .ic{color:#dc2626}
.art-title{font-size:21px;margin:8px 0 12px}
.sec{border-top:1px dashed #e5e7eb;padding-top:12px;margin-top:12px}.sec h2{font-size:16px;margin:0 0 6px;color:#764ba2}
.body{font-size:15px}.body ul,.body ol{padding-left:20px}
.imgp{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:8px 10px;margin-top:8px}.imgp-l{font-size:12px;color:#475569;font-weight:600}.imgp p{margin:6px 0 0;font-size:13px;color:#334155;white-space:pre-wrap}
.faq{border-top:1px dashed #e5e7eb;padding-top:12px;margin-top:12px}.faq h2{font-size:15px;color:#764ba2}.faq .q{font-weight:600;margin:8px 0 2px}.faq .a{margin:0 0 6px;color:#374151}
.cp{border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;margin-left:4px}.cp:hover{background:#e0e7ff}.cp.done{background:#dcfce7;border-color:#86efac;color:#166534}
</style></head><body>
<header><h1>📰 블로그 248편 — SEO 검토</h1>${LANGS.map((L) => `<button class="tab${L === 'ko' ? ' on' : ''}" data-t="${L}">${LANG_LABEL[L]} (${byLang[L].length})</button>`).join('')}</header>
<main>${LANGS.map(panel).join('')}</main>
<script>
const COPY=${JSON.stringify(COPY)};
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('.panel').forEach(p=>p.hidden=p.dataset.lang!==b.dataset.t);window.scrollTo(0,0);});
document.addEventListener('click',e=>{const b=e.target.closest('.cp');if(!b)return;e.preventDefault();navigator.clipboard.writeText(COPY[b.dataset.c]||'').then(()=>{const t=b.textContent;b.textContent='✓';b.classList.add('done');setTimeout(()=>{b.textContent=t;b.classList.remove('done')},1000);});});
</script></body></html>`;

writeFileSync(join(__dirname, 'blog-final.html'), html, 'utf8');
console.log('Wrote blog-final.html  ·', articles.length, 'articles');
for (const L of LANGS) console.log(`  ${L}: ${byLang[L].length}편`);
