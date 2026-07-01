// docs/cardnews/치료사례/build-preview.mjs
// case-*.json → preview-ko.html (자립형, 한국어 슬라이드 미리보기)
// 실행: node docs/cardnews/치료사례/build-preview.mjs
import fs from 'fs';
import path from 'path';

const DIR = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const FILES = ['case-3-성조숙증비만.json', 'case-4-부모키작음.json', 'case-6-여아성조숙.json', 'case-7-성장느림.json'];

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// case-6(여아)=핑크 테마, 그 외=민트 테마
const accentOf = (f) => (f.includes('여아') ? '#ec4d8b' : '#33D6B5');

const cases = FILES.map((f) => ({ f, d: JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) }));

const cardHtml = (s, accent) => {
  const isCta = !!s.isCTA;
  return `
  <div class="card ${isCta ? 'cta' : ''}">
    <span class="role">${esc(s.role)}${isCta ? ' · CTA' : ''}</span>
    <div class="illus" style="--a:${accent}">
      <span class="illus-tag">일러스트</span>
      <p class="illus-prompt">${esc(s.illustration)}</p>
    </div>
    <div class="txt">
      <h3 style="--a:${accent}">${esc(s.headline_ko)}</h3>
      ${s.subtext_ko ? `<p>${esc(s.subtext_ko)}</p>` : ''}
    </div>
    <span class="n">${s.n}/${7}</span>
  </div>`;
};

const deckHtml = ({ f, d }) => {
  const accent = accentOf(f);
  return `
  <section class="deck">
    <h2>${esc(d.title)}</h2>
    <p class="src">${esc(d.sourceCase || '')}${d.youtubeSlot ? ' · 🎬 ' + esc(d.youtubeSlot) : ''}</p>
    <div class="rail">
      ${d.slides.map((s) => cardHtml(s, accent)).join('')}
    </div>
    <details class="cap">
      <summary>캡션 · 해시태그</summary>
      <pre>${esc(d.caption_ko)}</pre>
      <p class="tags">${esc(d.hashtags_ko)}</p>
    </details>
  </section>`;
};

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>치료사례 카드뉴스 미리보기 (한국어)</title>
<style>
:root{font-family:'Pretendard','Noto Sans KR',system-ui,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:#f4f4f7;color:#1f2430;padding:20px 16px 60px}
h1{font-size:20px;margin:0 0 4px}
.lead{color:#6b7280;font-size:13px;margin:0 0 24px}
.deck{margin:0 0 40px;background:#fff;border-radius:16px;padding:18px 16px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.deck h2{font-size:16px;margin:0 0 2px}
.src{color:#8a8f9c;font-size:12px;margin:0 0 12px}
.rail{display:flex;gap:14px;overflow-x:auto;padding-bottom:10px;scroll-snap-type:x mandatory}
.card{flex:0 0 240px;aspect-ratio:2/3;border-radius:18px;position:relative;scroll-snap-align:start;
  background:linear-gradient(160deg,#667eea 0%,#764ba2 100%);color:#fff;padding:16px;display:flex;flex-direction:column;overflow:hidden}
.card.cta{background:linear-gradient(160deg,#764ba2 0%,#4c2c78 100%);box-shadow:inset 0 0 0 2px rgba(255,255,255,.4)}
.role{position:absolute;top:10px;left:12px;font-size:10px;background:rgba(255,255,255,.22);padding:2px 8px;border-radius:20px}
.n{position:absolute;bottom:10px;right:12px;font-size:10px;opacity:.7}
.illus{margin-top:26px;flex:1;border:1px dashed rgba(255,255,255,.45);border-radius:12px;padding:10px;
  display:flex;flex-direction:column;gap:6px;min-height:0;background:rgba(255,255,255,.06)}
.illus-tag{font-size:9px;color:var(--a);font-weight:700;letter-spacing:.5px}
.illus-prompt{font-size:9.5px;line-height:1.5;margin:0;opacity:.85;overflow:auto}
.txt{padding-top:12px}
.txt h3{font-size:18px;line-height:1.3;margin:0 0 6px;word-break:keep-all}
.txt h3::after{content:"";display:block;width:26px;height:3px;background:var(--a);border-radius:2px;margin-top:8px}
.txt p{font-size:12.5px;line-height:1.5;margin:0;opacity:.92;word-break:keep-all}
.cap{margin-top:14px;border-top:1px solid #eee;padding-top:10px}
.cap summary{cursor:pointer;font-size:13px;color:#667eea;font-weight:600}
.cap pre{white-space:pre-wrap;font-family:inherit;font-size:12.5px;line-height:1.7;background:#fafafe;border-radius:10px;padding:12px;margin:10px 0}
.tags{color:#8a63d2;font-size:12px;margin:0;word-break:break-all}
</style></head><body>
<h1>치료사례 카드뉴스 미리보기 · 한국어</h1>
<p class="lead">홈페이지 공개 4개 케이스 · 카드는 좌우로 스와이프하세요. 일러스트 영역은 GPT 이미지 생성용 프롬프트입니다(실제 이미지는 별도 생성).</p>
${cases.map(deckHtml).join('')}
</body></html>`;

fs.writeFileSync(path.join(DIR, 'preview-ko.html'), html);
console.log('wrote preview-ko.html (' + cases.length + ' decks)');
