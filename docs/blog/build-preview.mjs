// Build review artifacts from the workflow result.
//   input : docs/blog/_out/result.json  (the Workflow return: { keywords:{ko,en,th,vi}, pilot:[...] })
//   output: docs/blog/keywords/*.json + keyword-map.md   (machine + human keyword foundation)
//           docs/blog/pilot/{n}-{lang}.json              (per-article)
//           docs/blog/preview.html                       (visual review w/ copy buttons)
// Run: node docs/blog/build-preview.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scoreArticle, findCannibalization } from './lib/seo-check.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '_out');
const KWDIR = join(__dirname, 'keywords');
const PILOTDIR = join(__dirname, 'pilot');
for (const d of [KWDIR, PILOTDIR]) mkdirSync(d, { recursive: true });

const resPath = join(OUT, 'result.json');
if (!existsSync(resPath)) { console.error('MISSING', resPath, '— save the workflow return there first.'); process.exit(1); }
const result = JSON.parse(readFileSync(resPath, 'utf8'));
const topics = JSON.parse(readFileSync(join(__dirname, '_src', 'topics.json'), 'utf8'));
const titleOf = Object.fromEntries(topics.map((t) => [t.n, t.title]));
const catOf = Object.fromEntries(topics.map((t) => [t.n, t.cat]));

const LANGS = ['ko', 'en', 'th', 'vi'];
const LANG_LABEL = { ko: '🇰🇷 한국어', en: '🇺🇸 English', th: '🇹🇭 ไทย', vi: '🇻🇳 Tiếng Việt' };
const keywords = result.keywords || {};
const pilot = result.pilot || [];

// ── 1) keyword files ──────────────────────────────────────────────────────────
const pillars = {};
const mappingByLang = {};
for (const L of LANGS) {
  pillars[L] = keywords[L]?.pillars || [];
  mappingByLang[L] = Object.fromEntries((keywords[L]?.mappings || []).map((m) => [m.n, m]));
}
writeFileSync(join(KWDIR, 'pillars.json'), JSON.stringify(pillars, null, 2), 'utf8');
for (const L of LANGS) writeFileSync(join(KWDIR, `map-${L}.json`), JSON.stringify(keywords[L]?.mappings || [], null, 2), 'utf8');
const cannib = findCannibalization(Object.fromEntries(LANGS.map((L) => [L, keywords[L]?.mappings || []])));

// combined per-topic map: [{n,title,cat, ko:{...}, en:{...}, th:{...}, vi:{...}}]
const combined = topics.map((t) => {
  const row = { n: t.n, title: t.title, cat: t.cat };
  for (const L of LANGS) row[L] = mappingByLang[L][t.n] || null;
  return row;
});
writeFileSync(join(KWDIR, 'mapping.json'), JSON.stringify(combined, null, 2), 'utf8');

// human-readable markdown
let md = '# 블로그 SEO 키워드 파운데이션\n\n';
for (const L of LANGS) {
  md += `## ${LANG_LABEL[L]} — Pillars (${pillars[L].length})\n\n`;
  md += '| Pillar | Head keyword | Intent |\n|---|---|---|\n';
  for (const p of pillars[L]) md += `| ${p.name} | \`${p.headKeyword}\` | ${p.intent || ''} |\n`;
  md += '\n';
}
md += '## 토픽별 Primary / Secondary 키워드 (62)\n\n';
for (const L of LANGS) {
  md += `\n### ${LANG_LABEL[L]}\n\n`;
  md += '| # | KO 제목 | Primary | Secondary | Pillar |\n|---|---|---|---|---|\n';
  for (const t of topics) {
    const m = mappingByLang[L][t.n];
    if (!m) { md += `| ${t.n} | ${t.title} | — | — | — |\n`; continue; }
    md += `| ${t.n} | ${t.title} | \`${m.primaryKeyword}\` | ${(m.secondaryKeywords || []).join(', ')} | ${m.pillar || ''} |\n`;
  }
}
writeFileSync(join(KWDIR, 'keyword-map.md'), md, 'utf8');

// ── 2) pilot article files ────────────────────────────────────────────────────
for (const a of pilot) writeFileSync(join(PILOTDIR, `${a.n}-${a.language}.json`), JSON.stringify(a, null, 2), 'utf8');

// ── 3) preview.html ───────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const COPY = {}; let cid = 0;
const copyBtn = (text, label = '복사') => { const id = 'c' + cid++; COPY[id] = text; return `<button class="cp" data-c="${id}">${label}</button>`; };

const pilotByLang = {};
for (const L of LANGS) pilotByLang[L] = pilot.filter((a) => a.language === L).sort((a, b) => a.n - b.n);

function articleHtml(a) {
  const fullText = [
    'SEO Title: ' + a.seoTitle, 'Slug: ' + a.slug, 'Meta: ' + a.metaDescription,
    'Primary: ' + a.primaryKeyword, 'Secondary: ' + (a.secondaryKeywords || []).join(', '), '',
    '# ' + a.h1, '',
    ...(a.sections || []).map((s) => '## ' + s.heading + '\n' + s.html + '\n[IMG] ' + s.imagePrompt),
    '', ...(a.faq || []).map((f) => 'Q: ' + f.q + '\nA: ' + f.a),
  ].join('\n');
  const sc = scoreArticle(a, a.language);
  const scCls = sc.grade === 'A' || sc.grade === 'B' ? 'g-good' : sc.grade === 'C' || sc.grade === 'D' ? 'g-warn' : 'g-bad';
  const issues = sc.details.filter((x) => x.status !== 'good').length;
  let h = `<article class="art"><div class="art-h"><span class="badge">#${a.n} · ${catOf[a.n] || ''}</span><span class="seo ${scCls}">SEO ${sc.score}/${sc.max} · ${sc.grade}</span><span class="grow"></span> ${copyBtn(fullText, '📋 글 전체 복사')}</div>`;
  h += `<details class="seod"${issues ? '' : ''}><summary>🔎 SEO 점검 — ${issues ? issues + '개 개선점' : '전 항목 통과'}</summary><table class="seot">` +
    sc.details.map((x) => `<tr class="st-${x.status}"><td class="ic">${x.status === 'good' ? '✓' : x.status === 'warn' ? '⚠' : '✗'}</td><td>${esc(x.label)}</td><td class="pt">${x.score}/${x.max}</td><td>${esc(x.msg)}</td></tr>`).join('') +
    '</table></details>';
  h += `<table class="meta"><tr><td>SEO Title</td><td>${esc(a.seoTitle)} ${copyBtn(a.seoTitle)}</td></tr>`;
  h += `<tr><td>Slug</td><td><code>${esc(a.slug)}</code> ${copyBtn(a.slug)}</td></tr>`;
  h += `<tr><td>Meta</td><td>${esc(a.metaDescription)} <span class="len">(${(a.metaDescription || '').length})</span> ${copyBtn(a.metaDescription)}</td></tr>`;
  h += `<tr><td>Primary</td><td><b>${esc(a.primaryKeyword)}</b></td></tr>`;
  h += `<tr><td>Secondary</td><td>${esc((a.secondaryKeywords || []).join(', '))}</td></tr></table>`;
  h += `<h1 class="art-title">${esc(a.h1)}</h1>`;
  for (const s of a.sections || []) {
    h += `<section class="sec"><h2>${esc(s.heading)}</h2><div class="body">${s.html || ''}</div>`;
    h += `<div class="imgp"><span class="imgp-l">🎨 이미지 프롬프트 (16:9)</span> ${copyBtn(s.imagePrompt)}<p>${esc(s.imagePrompt)}</p></div></section>`;
  }
  if (a.faq?.length) {
    h += '<section class="faq"><h2>FAQ</h2>';
    for (const f of a.faq) h += `<p class="q">Q. ${esc(f.q)}</p><p class="a">${esc(f.a)}</p>`;
    h += '</section>';
  }
  return h + '</article>';
}

function langPanel(L) {
  let h = `<div class="panel" data-lang="${L}" ${L === 'ko' ? '' : 'hidden'}>`;
  // pillars
  h += `<h2 class="sect">🏛️ Pillars (${pillars[L].length})</h2><div class="pillars">`;
  for (const p of pillars[L]) h += `<div class="pill"><b>${esc(p.name)}</b><code>${esc(p.headKeyword)}</code><span class="intent">${esc(p.intent || '')}</span>${p.note ? `<small>${esc(p.note)}</small>` : ''}</div>`;
  h += '</div>';
  // keyword table
  h += '<h2 class="sect">🔑 토픽별 키워드 (62)</h2><table class="kw"><thead><tr><th>#</th><th>KO 제목</th><th>Primary</th><th>Secondary</th><th>Pillar</th></tr></thead><tbody>';
  for (const t of topics) {
    const m = mappingByLang[L][t.n];
    h += `<tr><td>${t.n}</td><td class="kt">${esc(t.title)}</td>`;
    if (m) h += `<td><b>${esc(m.primaryKeyword)}</b> ${copyBtn(m.primaryKeyword)}</td><td>${esc((m.secondaryKeywords || []).join(', '))}</td><td><span class="pl">${esc(m.pillar || '')}</span></td></tr>`;
    else h += '<td colspan="3" class="muted">— 매핑 없음 —</td></tr>';
  }
  h += '</tbody></table>';
  // cannibalization
  const can = cannib[L] || [];
  h += `<div class="cann ${can.length ? 'bad' : 'ok'}">${can.length
    ? '⚠ 키워드 중복(카니발라이제이션) ' + can.length + '건 — ' + can.map((c) => `<b>${esc(c.keyword)}</b> (#${c.topics.join(', #')})`).join(' · ')
    : '✓ 카니발라이제이션 없음 — 62개 토픽 primary 키워드 전부 고유'}</div>`;
  // pilots
  const avg = pilotByLang[L].length ? Math.round(pilotByLang[L].reduce((s, a) => s + scoreArticle(a, L).score, 0) / pilotByLang[L].length) : 0;
  h += `<h2 class="sect">📝 파일럿 아티클 (${pilotByLang[L].length}) <span class="avg">평균 SEO ${avg}/100</span></h2>`;
  for (const a of pilotByLang[L]) h += articleHtml(a);
  return h + '</div>';
}

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>블로그 SEO 미리보기</title><style>
*{box-sizing:border-box}body{font-family:'Noto Sans KR',system-ui,sans-serif;margin:0;background:#f6f7f9;color:#1f2430;line-height:1.6}
header{position:sticky;top:0;background:#fff;border-bottom:1px solid #e5e7eb;padding:10px 16px;z-index:10;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
header h1{font-size:15px;margin:0 12px 0 0}
.tab{border:1px solid #d1d5db;background:#fff;padding:6px 14px;border-radius:999px;cursor:pointer;font-size:14px}
.tab.on{background:#667eea;color:#fff;border-color:#667eea}
main{max-width:900px;margin:0 auto;padding:20px 16px 80px}
.sect{font-size:18px;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid #667eea}
.pillars{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.pill{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:4px}
.pill code{background:#eef2ff;color:#4338ca;padding:2px 6px;border-radius:5px;font-size:13px;width:fit-content}
.pill .intent{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.3px}
.pill small{color:#6b7280;font-size:12px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;font-size:13px}
.kw th,.kw td{border:1px solid #eef0f3;padding:7px 9px;text-align:left;vertical-align:top}
.kw th{background:#f3f4f6;position:sticky}
.kw .kt{max-width:230px;color:#374151}
.kw .pl{background:#f0fdfa;color:#0f766e;padding:2px 7px;border-radius:5px;font-size:12px}
.muted{color:#9ca3af}
.art{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin:16px 0;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.art-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.badge{background:#667eea;color:#fff;padding:3px 10px;border-radius:999px;font-size:12px}
.meta{font-size:13px;margin-bottom:12px}.meta td{border:1px solid #eef0f3;padding:6px 9px}.meta td:first-child{background:#f9fafb;width:90px;color:#6b7280;font-weight:600}
.len{color:#9ca3af;font-size:11px}
.art-title{font-size:22px;margin:6px 0 14px}
.sec{border-top:1px dashed #e5e7eb;padding-top:12px;margin-top:12px}
.sec h2{font-size:17px;margin:0 0 6px;color:#764ba2}
.body{font-size:15px}.body ul,.body ol{padding-left:20px}
.imgp{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:8px 10px;margin-top:8px}
.imgp-l{font-size:12px;color:#475569;font-weight:600}
.imgp p{margin:6px 0 0;font-size:13px;color:#334155;white-space:pre-wrap}
.faq{border-top:1px dashed #e5e7eb;padding-top:12px;margin-top:12px}.faq h2{font-size:16px;color:#764ba2}
.faq .q{font-weight:600;margin:8px 0 2px}.faq .a{margin:0 0 6px;color:#374151}
.cp{border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;margin-left:4px}
.cp:hover{background:#e0e7ff}.cp.done{background:#dcfce7;border-color:#86efac;color:#166534}
.art-h .grow{flex:1}
.seo{font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px}
.g-good{background:#dcfce7;color:#166534}.g-warn{background:#fef9c3;color:#854d0e}.g-bad{background:#fee2e2;color:#991b1b}
.seod{margin:8px 0 12px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
.seod summary{cursor:pointer;padding:7px 10px;background:#f8fafc;font-size:13px;font-weight:600;color:#475569}
.seot{width:100%;font-size:12px;border:0}
.seot td{border:1px solid #f1f5f9;padding:4px 8px}
.seot .ic{width:24px;text-align:center}.seot .pt{width:48px;color:#64748b;text-align:right}
.st-good .ic{color:#16a34a}.st-warn{background:#fffbeb}.st-warn .ic{color:#d97706}.st-bad{background:#fef2f2}.st-bad .ic{color:#dc2626}
.cann{margin:8px 0;padding:8px 12px;border-radius:8px;font-size:13px}
.cann.ok{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}
.cann.bad{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
.avg{font-size:13px;font-weight:600;color:#667eea;margin-left:8px}
</style></head><body>
<header><h1>📰 블로그 SEO 미리보기</h1>${LANGS.map((L) => `<button class="tab${L === 'ko' ? ' on' : ''}" data-t="${L}">${LANG_LABEL[L]}</button>`).join('')}</header>
<main>${LANGS.map(langPanel).join('')}</main>
<script>
const COPY=${JSON.stringify(COPY)};
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.panel').forEach(p=>p.hidden=p.dataset.lang!==b.dataset.t);
  window.scrollTo(0,0);
});
document.addEventListener('click',e=>{const b=e.target.closest('.cp');if(!b)return;
  navigator.clipboard.writeText(COPY[b.dataset.c]||'').then(()=>{const t=b.textContent;b.textContent='✓ 복사됨';b.classList.add('done');setTimeout(()=>{b.textContent=t;b.classList.remove('done')},1200);});
});
</script></body></html>`;

writeFileSync(join(__dirname, 'preview.html'), html, 'utf8');
console.log('Wrote keywords/{pillars,mapping}.json + keyword-map.md');
console.log('Wrote', pilot.length, 'pilot article files');
console.log('Wrote preview.html');
console.log('Pillars per lang:', LANGS.map((L) => `${L}:${pillars[L].length}`).join(' '));
console.log('Mappings per lang:', LANGS.map((L) => `${L}:${Object.keys(mappingByLang[L]).length}`).join(' '));
