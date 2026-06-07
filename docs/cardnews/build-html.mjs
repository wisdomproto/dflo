// docs/cardnews/build-html.mjs
// data/*.json (워크플로우 산출물) → 단일 인터랙티브 HTML(index.html)
// 실행: node docs/cardnews/build-html.mjs
import fs from 'fs';
import path from 'path';

const DATA_DIR = 'docs/cardnews/data';
const OUT = 'docs/cardnews/index.html';

const LANGS = [
  { code: 'ko', label: '🇰🇷 한국어', domain: 'www.dr187growup.com' },
  { code: 'en', label: '🇬🇧 English', domain: 'www.dr187growup.com/en' },
  { code: 'th', label: '🇹🇭 ไทย', domain: 'www.dr187growup.com/th' },
  { code: 'vi', label: '🇻🇳 Tiếng Việt', domain: 'www.dr187growup.com/vi' },
  { code: 'ch', label: '🇹🇼 中文(繁)', domain: 'www.dr187growup.com/ch' },
];

const COMMON_STYLE = [
  '· 비율: 세로 2:3 (1024×1536)',
  '· 아트 스타일: 플랫 2D 벡터 일러스트. 굵고 둥근 형태, 단색 면(그라데이션 없음)에 옅은 드롭섀도우만. 사진·3D 아님.',
  '· 배경: 부드러운 보라색 세로 그라데이션 (#667eea 위 → #764ba2 아래), 넓은 여백.',
  '· 캐릭터: 모든 장에 같은 7~9세 한국 어린이(밝은 표정, 파스텔 옷). 장마다 동일 인물 유지.',
  '· 색: 텍스트는 흰색, 포인트 색은 민트(#33D6B5) 절제 사용.',
  '· 텍스트: 굵은 둥근 고딕(Noto Sans 느낌), 또렷하게, 잘림·오타 없이. 지정된 문구만 넣고 다른 글자 추가 금지.',
  '· 피할 것: 사실적 사진, 무섭거나 우울한 분위기, 복잡한 배경, 잘린 글자, 깨진 글자, 워터마크.',
].join('\n');

const articles = [];
let missing = [];
for (let i = 1; i <= 62; i++) {
  const f = path.join(DATA_DIR, i + '.json');
  if (fs.existsSync(f)) {
    try { articles.push(JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''))); }
    catch (e) { console.error('parse fail #' + i, e.message); missing.push(i); }
  } else { missing.push(i); }
}
articles.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

const payload = { articles, langs: LANGS, commonStyle: COMMON_STYLE };

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>187 카드뉴스 프롬프트 — 전체 ${articles.length}개</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:'Noto Sans KR',system-ui,sans-serif;background:#f4f4f8;color:#1a1a2e}
.app{display:flex;height:100vh}
.side{width:310px;flex-shrink:0;background:#fff;border-right:1px solid #e4e4ee;overflow-y:auto;padding:12px}
.side h1{font-size:15px;margin:8px 6px 4px;color:#667eea}
.side .sub{font-size:11px;color:#aaa;margin:0 6px 12px}
.cat{font-size:11px;font-weight:700;color:#999;margin:14px 6px 6px}
.item{padding:8px 10px;border-radius:8px;cursor:pointer;font-size:13px;line-height:1.4}
.item:hover{background:#f0f0fa}.item.active{background:#667eea;color:#fff}
.item .num{opacity:.6;font-size:11px;margin-right:6px}
.main{flex:1;overflow-y:auto;padding:24px 32px}
.main h2{margin:0 0 4px;font-size:22px}.main .meta{color:#888;font-size:13px;margin-bottom:18px}
.langs{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap;align-items:center;position:sticky;top:0;background:#f4f4f8;padding:8px 0;z-index:5}
.langs button{padding:7px 14px;border:1px solid #d0d0e0;background:#fff;border-radius:20px;cursor:pointer;font-size:13px}
.langs button.active{background:#667eea;color:#fff;border-color:#667eea}
.langs .copyall{margin-left:auto;background:#16a974;color:#fff;border-color:#16a974;font-weight:700}
.langs .copyall:hover{filter:brightness(1.08)}
.common{background:#1a1a2e;color:#cfcfe6;padding:14px 16px;border-radius:10px;font-size:12px;white-space:pre-wrap;line-height:1.6;margin-bottom:20px}
.common .h{color:#9a9aff;font-weight:700;margin-bottom:6px;display:block}
.slide{background:#fff;border:1px solid #e4e4ee;border-radius:12px;padding:18px;margin-bottom:16px;overflow:hidden}
.slide .role{display:inline-block;background:#eef0ff;color:#667eea;font-size:12px;font-weight:700;padding:3px 10px;border-radius:6px;margin-bottom:10px}
.slide .ill{background:#f7f7fb;border:1px dashed #d0d0e0;border-radius:8px;padding:12px;font-size:13px;white-space:pre-wrap;line-height:1.6;color:#444}
.slide .txt{margin-top:12px}.slide .hl{font-size:20px;font-weight:800;margin:6px 0}
.slide .sub2{font-size:14px;color:#555}.slide .dom{margin-top:8px;font-size:13px;color:#667eea;font-weight:600}
.copy{float:right;background:#667eea;color:#fff;border:0;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px}
.copy:hover{filter:brightness(1.1)}.empty{color:#aaa;text-align:center;margin-top:80px}
</style></head><body>
<div class="app">
  <div class="side"><h1>187 카드뉴스 프롬프트</h1><div class="sub">전체 ${articles.length}개 · 5개 언어 · 1024×1536</div><div id="list"></div></div>
  <div class="main" id="main"><div class="empty">← 왼쪽에서 글을 선택하세요</div></div>
</div>
<script>
const D = ${JSON.stringify(payload)};
let cur=null, lang='ko';
const $=(s,e=document)=>e.querySelector(s);
function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function renderList(){
  const byCat={}; D.articles.forEach(a=>{(byCat[a.category]=byCat[a.category]||[]).push(a)});
  const el=$('#list'); el.innerHTML='';
  Object.keys(byCat).sort().forEach(cat=>{
    const c=document.createElement('div');c.className='cat';c.textContent=cat;el.appendChild(c);
    byCat[cat].forEach(a=>{
      const d=document.createElement('div');d.className='item';
      d.innerHTML='<span class="num">#'+a.sortOrder+'</span>'+esc(a.title);
      d.onclick=()=>{cur=a;[...el.querySelectorAll('.item')].forEach(x=>x.classList.remove('active'));d.classList.add('active');renderMain()};
      el.appendChild(d);
    });
  });
}
function slidePrompt(s){
  const L=D.langs.find(x=>x.code===lang);
  let p='[일러스트]\\n'+s.illustration;
  const hl=s['headline_'+lang], sub=s['subtext_'+lang];
  if(hl)p+='\\n[헤드라인·정확히] 「'+hl+'」';
  if(sub)p+='\\n[보조문구] 「'+sub+'」';
  if(s.isCTA){p+='\\n[로고] 상단 중앙에 첨부한 로고 이미지를 배치할 것';p+='\\n[도메인·하단] 「'+L.domain+'」';}
  return p;
}
function fullPrompt(s){return '[공통 스타일]\\n'+D.commonStyle+'\\n\\n'+slidePrompt(s);}
function fullAll(){
  let p='[공통 스타일 — 아래 모든 장에 동일 적용]\\n'+D.commonStyle+'\\n';
  cur.slides.forEach(s=>{ p+='\\n\\n=== '+s.n+'. '+s.role+' ===\\n'+slidePrompt(s); });
  return p;
}
function renderMain(){
  const m=$('#main'); if(!cur){m.innerHTML='<div class="empty">← 왼쪽에서 글을 선택하세요</div>';return;}
  const L=D.langs.find(x=>x.code===lang);
  let h='<h2>#'+cur.sortOrder+' '+esc(cur.title)+'</h2><div class="meta">'+esc(cur.category)+' · '+cur.slides.length+'장 · 1024×1536</div>';
  h+='<div class="langs">'+D.langs.map(x=>'<button class="'+(x.code===lang?'active':'')+'" onclick="setLang(\\''+x.code+'\\')">'+x.label+'</button>').join('');
  h+='<button class="copyall" onclick="copyAll()">📋 이 언어 전체 복사 (공통+'+cur.slides.length+'장)</button></div>';
  h+='<div class="common"><span class="h">[공통 스타일 — 모든 카드 동일]</span>'+esc(D.commonStyle)+'</div>';
  cur.slides.forEach(s=>{
    const hl=esc(s['headline_'+lang]), sub=esc(s['subtext_'+lang]);
    h+='<div class="slide"><button class="copy" onclick="copyP('+s.n+')">📋 이 장 복사</button>';
    h+='<span class="role">'+s.n+'. '+esc(s.role)+'</span>';
    h+='<div class="ill">'+esc(s.illustration)+'</div>';
    h+='<div class="txt"><div class="hl">「'+hl+'」</div>'+(sub?'<div class="sub2">「'+sub+'」</div>':'');
    if(s.isCTA)h+='<div class="dom">🔗 '+esc(L.domain)+'  +  로고 첨부</div>';
    h+='</div></div>';
  });
  m.innerHTML=h; m.scrollTop=0;
}
function setLang(c){lang=c;renderMain()}
function flash(btn,txt){const t=btn.textContent;btn.textContent=txt;setTimeout(()=>btn.textContent=t,1300)}
function copyP(n){const s=cur.slides.find(x=>x.n===n);navigator.clipboard.writeText(fullPrompt(s)).then(()=>flash(event.target,'✅ 복사됨'))}
function copyAll(){navigator.clipboard.writeText(fullAll()).then(()=>flash(event.target,'✅ 전체 복사됨!'))}
renderList();
</script></body></html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log('built:', OUT, '| articles:', articles.length, '| missing:', missing.length ? missing.join(',') : 'none');
