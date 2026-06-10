// docs/storyboards/render.mjs
// 스토리보드 spec(JSON) → 강화 템플릿 HTML (성장타이밍4 포맷).
// 섹션: 썸네일 / 핵심컨셉 / 내러티브아크 / 씬표(✨모션) / 모션가이드 / 인포그래픽4 / 이모지 / 6언어탭 / 제작노트.
// CSS·레이아웃은 고정, 콘텐츠만 spec에서 채움 → 전 콘텐츠 일관 + 템플릿 1곳 수정.

const LANGS = [
  { k: 'ko', label: '🇰🇷 한글', cls: '' },
  { k: 'th', label: '🇹🇭 태국어', cls: 'thai' },
  { k: 'vi', label: '🇻🇳 베트남어', cls: '' },
  { k: 'en', label: '🇺🇸 영어', cls: '' },
  { k: 'cn', label: '🇨🇳 中文 간체', cls: 'cjk' },
  { k: 'ch', label: '🇹🇼 中文 번체', cls: 'cjk-tc' },
];

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// hl 단어를 노랑 하이라이트로 감쌈 (첫 등장). 텍스트는 escape, 래퍼만 HTML.
function hlw(t = '', hl = '') {
  t = String(t);
  if (hl && t.includes(hl)) {
    const i = t.indexOf(hl);
    return esc(t.slice(0, i)) + '<span class="y">' + esc(hl) + '</span>' + esc(t.slice(i + hl.length));
  }
  return esc(t);
}

const CSS = `
  :root{
    --purple:#667eea; --purple2:#764ba2; --mint:#2dd4bf; --pink:#E0568A;
    --dark:#0c0d0f; --ink:#1f2430; --muted:#6b7280; --line:#e7e9f2; --bg:#f6f7fb;
    --yellow:#ffe36e; --gold:#ffc83d; --red:#ff5a5a;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:'Noto Sans KR',system-ui,sans-serif;color:var(--ink);background:var(--bg);line-height:1.65;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1080px;margin:0 auto;padding:0 20px 80px}
  .hero{background:linear-gradient(135deg,var(--purple),var(--purple2));color:#fff;padding:44px 36px;border-radius:0 0 28px 28px;margin-bottom:30px;box-shadow:0 18px 50px -22px rgba(102,126,234,.6)}
  .hero .kept{display:inline-block;font-size:13px;font-weight:700;letter-spacing:.5px;background:rgba(255,255,255,.18);padding:5px 12px;border-radius:99px;margin-bottom:14px}
  .hero h1{margin:0 0 6px;font-size:33px;font-weight:900;letter-spacing:-.5px}
  .hero .sub{font-size:16px;opacity:.92;margin-bottom:20px}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{font-size:13px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);padding:6px 12px;border-radius:10px}
  .chip b{font-weight:700}
  section{margin:32px 0}
  h2{font-size:21px;font-weight:900;margin:0 0 4px;display:flex;align-items:center;gap:9px}
  h2 .no{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:8px;background:var(--purple);color:#fff;font-size:15px;font-weight:800}
  h2.newtag .no{background:var(--pink)}
  .newpill{font-size:11px;font-weight:800;color:#fff;background:var(--pink);padding:2px 9px;border-radius:99px;margin-left:6px;vertical-align:middle}
  .lead{color:var(--muted);font-size:14.5px;margin:0 0 16px}
  .card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px 22px;box-shadow:0 8px 26px -20px rgba(31,36,48,.4)}
  .concept{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .cc{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px}
  .cc .t{font-size:13px;font-weight:700;color:var(--purple);margin-bottom:6px}
  .cc.hookbox{grid-column:1/-1;background:linear-gradient(135deg,#fff,#f3f0fc);border-color:#e3dcf7}
  .cc .big{font-size:19px;font-weight:800}
  .hl{background:linear-gradient(transparent 55%,var(--yellow) 55%);font-weight:800;padding:0 2px}
  .thumbwrap{display:grid;grid-template-columns:300px 1fr;gap:26px;align-items:start}
  .thumb{width:300px;aspect-ratio:9/16;border-radius:22px;overflow:hidden;position:relative;box-shadow:0 22px 54px -16px rgba(0,0,0,.5);background:linear-gradient(160deg,#3b2a78,#1a1340 60%,#2a1d55)}
  .thumb .glowcurve{position:absolute;left:-5%;right:-5%;top:34%;height:46%;background:
    radial-gradient(120px 80px at 80% 40%,rgba(45,212,191,.5),transparent 70%),
    radial-gradient(140px 90px at 20% 75%,rgba(102,126,234,.5),transparent 70%)}
  .thumb .dots{position:absolute;left:8%;right:8%;top:52%;display:flex;justify-content:space-between}
  .thumb .dots i{width:14px;height:14px;border-radius:50%;background:var(--mint);box-shadow:0 0 14px var(--mint);display:block;opacity:.7}
  .thumb .dots i:last-child{opacity:1;width:18px;height:18px}
  .thumb .kicker{position:absolute;top:6%;left:0;right:0;text-align:center;color:#fff;font-size:14px;font-weight:800}
  .thumb .kicker b{background:var(--red);padding:3px 10px;border-radius:7px}
  .thumb .subj{position:absolute;top:15.5%;left:0;right:0;text-align:center;color:#fff;font-size:20px;font-weight:900;text-shadow:0 2px 8px rgba(0,0,0,.55)}
  .thumb .big4{position:absolute;top:25%;left:0;right:0;text-align:center;line-height:.86}
  .thumb .big4 .n{font-size:132px;font-weight:900;color:var(--gold);text-shadow:0 6px 0 rgba(184,134,0,.25),0 0 30px rgba(255,200,61,.55)}
  .thumb .big4 .lab{font-size:31px;font-weight:900;color:#fff}
  .thumb .logo{position:absolute;bottom:6.5%;left:0;right:0;text-align:center;color:#fff;font-size:28px;font-weight:900;letter-spacing:1px;text-shadow:0 2px 12px rgba(0,0,0,.55)}
  .thumbwrap ul{margin:0;padding-left:18px}
  .thumbwrap li{margin:7px 0;font-size:14px}
  .ig-prompt{background:#0c0d0f;color:#e6e8ee;border-radius:10px;padding:12px 14px;font-size:12px;line-height:1.55;font-family:ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;margin:10px 0 4px}
  .arc{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
  .act{background:#fff;border:1px solid var(--line);border-radius:14px;padding:13px;text-align:center;position:relative}
  .act .n{font-size:12px;font-weight:800;color:#fff;background:var(--purple);display:inline-block;padding:2px 9px;border-radius:99px;margin-bottom:7px}
  .act h4{margin:0 0 4px;font-size:13.5px;font-weight:800}
  .act p{margin:0;font-size:12px;color:var(--muted)}
  .act:not(:last-child)::after{content:"→";position:absolute;right:-10px;top:50%;transform:translateY(-50%);color:var(--purple);font-weight:900;z-index:2}
  .fmt{display:grid;grid-template-columns:280px 1fr;gap:24px;align-items:start}
  .phone{width:260px;aspect-ratio:9/16;background:var(--dark);border-radius:24px;overflow:hidden;border:6px solid #1c1d22;box-shadow:0 20px 50px -18px rgba(0,0,0,.55);margin:0 auto;position:relative;display:flex;flex-direction:column}
  .ph-head{height:16%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#fff;padding-top:6px}
  .ph-head .t1{font-size:11px;opacity:.85}
  .ph-head .mark{font-size:15px;font-weight:900;background:var(--pink);padding:3px 10px;border-radius:8px}
  .ph-video{aspect-ratio:1/1;margin:0 12px;border-radius:14px;background:radial-gradient(circle at 50% 40%,#3a2c1e,#1a1410);display:grid;place-items:center;font-size:48px;position:relative}
  .ph-video .acc{position:absolute;top:10px;right:12px;font-size:22px}
  .ph-cap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;gap:2px}
  .ph-cap .l{font-size:14px;font-weight:800}
  .ph-cap .l .y2{color:#111;background:var(--yellow);padding:0 4px;border-radius:3px}
  .ph-logo{height:9%;display:grid;place-items:center;color:#cfd3dc;font-size:10px;font-weight:800;letter-spacing:1px}
  table{width:100%;border-collapse:collapse;font-size:13px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid var(--line)}
  th,td{padding:10px 11px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}
  th{background:#f0f2fb;font-size:12px;font-weight:800;color:#43485a}
  tr:last-child td{border-bottom:none}
  .c-id{font-weight:800;color:var(--purple);white-space:nowrap}
  .c-time{color:var(--muted);font-size:11px;white-space:nowrap}
  .scr{font-size:11px;font-weight:800;padding:3px 7px;border-radius:6px;white-space:nowrap}
  .scr.doc{background:#eef1fe;color:var(--purple)}
  .scr.ig{background:#e7faf6;color:#0d9488}
  .narr{font-weight:600}
  .cap2{font-size:11.5px;color:#33384a;background:#fafbff;border:1px dashed #d8dcee;border-radius:8px;padding:4px 7px;display:inline-block}
  .y{background:var(--yellow);padding:0 3px;border-radius:3px;font-weight:800}
  .mo{font-size:12px;color:#7a5cc7;font-weight:600}
  .mgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  .mg{background:#fff;border:1px solid var(--line);border-radius:12px;padding:13px 15px}
  .mg .h{font-weight:800;font-size:14px;margin-bottom:3px;display:flex;align-items:center;gap:7px}
  .mg .h b{font-size:20px}
  .mg p{margin:0;font-size:12.5px;color:#3a3f50}
  .mg code{background:#eef0f7;padding:1px 5px;border-radius:5px;font-size:11.5px}
  .igrid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  .igc{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 8px 26px -20px rgba(31,36,48,.4)}
  .igc .hd{padding:13px 17px;background:linear-gradient(135deg,#f3f0fc,#eafaf7);border-bottom:1px solid var(--line)}
  .igc .hd .role{font-size:11.5px;font-weight:800;color:#0d9488}
  .igc .hd h3{margin:3px 0 0;font-size:15.5px;font-weight:900}
  .igc .body{padding:15px 17px}
  .sketch{aspect-ratio:16/9;border-radius:14px;background:linear-gradient(160deg,#fff,#f3f0fc);border:1px solid #e3dcf7;display:flex;align-items:center;justify-content:center;gap:14px;font-size:42px;margin-bottom:12px}
  .lbl{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:11px 0 5px}
  table.ov-t{font-size:12px}
  table.ov-t th,table.ov-t td{padding:6px 9px}
  .thai{font-family:'Noto Sans Thai','Noto Sans KR',sans-serif}
  .emos{display:flex;flex-wrap:wrap;gap:9px}
  .emo{background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 12px;font-size:13px;display:flex;align-items:center;gap:6px}
  .emo b{font-size:17px}
  .tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
  .tabbtn{font-size:13px;font-weight:800;padding:8px 14px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--muted);cursor:pointer;font-family:inherit}
  .tabbtn.on{background:var(--purple);color:#fff;border-color:var(--purple)}
  .tabpanel{display:none}
  .tabpanel.on{display:block}
  .cjk{font-family:'Noto Sans SC','Microsoft YaHei','PingFang SC','Noto Sans KR',sans-serif}
  .cjk-tc{font-family:'Noto Sans TC','Microsoft JhengHei','PingFang TC','Noto Sans KR',sans-serif}
  table.cp{width:100%;border-collapse:collapse;font-size:13.5px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid var(--line)}
  table.cp td{padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
  table.cp tr:last-child td{border-bottom:none}
  .pipe{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  .pi{background:#fff;border:1px solid var(--line);border-radius:12px;padding:13px 15px}
  .pi .t{font-size:13px;font-weight:800;margin-bottom:4px}
  .pi p{margin:0;font-size:12.5px;color:#3a3f50}
  code{background:#eef0f7;padding:1px 6px;border-radius:5px;font-size:12px;font-family:ui-monospace,Consolas,monospace}
  .note{font-size:12.5px;color:var(--muted);margin-top:10px}
  @media(max-width:760px){.concept,.igrid,.pipe,.fmt,.thumbwrap,.mgrid{grid-template-columns:1fr}.arc{grid-template-columns:1fr 1fr}.act::after{display:none}}
`;

// 썸네일 큰 숫자 — 길이에 따라 폰트 자동 축소(긴 값도 한 줄에 들어가게).
const numFs = (s = '') => { const n = [...String(s)].length; return n <= 2 ? 132 : n <= 4 ? 98 : n <= 6 ? 66 : 50; };

function scrBadge(s) {
  if (s.kind === 'ig') return `<span class="scr ig">🖼 ${esc(s.igLabel || 'IG')}</span>`;
  if (s.kind === 'cta') return `<span class="scr doc">🎤 CTA</span>`;
  return `<span class="scr doc">🎤 원장</span>`;
}

export function renderStoryboard(spec) {
  const sc = spec.scenes || [];
  const igs = spec.infographics || [];
  const c1 = sc[0]?.copy?.ko || { cap: ['', ''], hl: '' };

  const heroChips = [
    '📐 포맷 <b>PresenterShort v2</b>',
    `⏱ ~${spec.duration || 35}초 / ${sc.length}씬`,
    '🌏 <b>6개 언어 탭</b>',
    '✨ <b>모션·이모지</b>',
    '📱 <b>썸네일</b>',
  ].map((c) => `<span class="chip">${c}</span>`).join('');

  // 썸네일
  const t = spec.thumb || {};
  const thumb = `
    <div class="thumb">
      <div class="glowcurve"></div>
      <div class="dots"><i></i><i></i><i></i><i></i></div>
      <div class="kicker"><b>${esc(t.kicker || '놓치면 끝!')}</b></div>
      <div class="subj">${esc(t.subject || '')}</div>
      <div class="big4"><div class="n" style="font-size:${numFs(t.number)}px">${esc(t.number || '?')}</div><div class="lab">${esc(t.numLabel || '')}</div></div>
      <div class="logo">187 GROWUP</div>
    </div>`;

  // 핵심 컨셉
  const concept = `
    <div class="concept">
      <div class="cc hookbox"><div class="t">🪝 HOOK</div><div class="big">"${esc(spec.hook || '')}"</div></div>
      <div class="cc"><div class="t">❌ 흔한 오해</div><div>${esc(spec.misconception || '')}</div></div>
      <div class="cc"><div class="t">✅ 진짜 메시지</div><div>${esc(spec.message || '')}</div></div>
      <div class="cc"><div class="t">🎯 톤 (브랜드 룰)</div><div>${esc(spec.tone || '협박 ❌ → 긍정 골든타임. "우리 아이 키" 보편')}</div></div>
      <div class="cc"><div class="t">📣 CTA</div><div>${esc(spec.cta || '')}</div></div>
    </div>`;

  // 아크
  const arc = `<div class="arc">${(spec.arc || []).map((a) => `<div class="act"><span class="n">${esc(a.act)}</span><h4>${esc(a.title)}</h4><p>${esc(a.scenes)}<br>${esc(a.desc)}</p></div>`).join('')}</div>`;

  // 포맷 미리보기
  const fmt = `
    <div class="fmt">
      <div class="phone">
        <div class="ph-head"><div class="t1">${esc(spec.headerTop || '우리 아이 키')}</div><div class="mark">${esc(spec.headerMark || '')}</div></div>
        <div class="ph-video">🧑‍⚕️<div class="acc">${esc(spec.accentEmoji || '✨')}</div></div>
        <div class="ph-cap"><div class="l">${esc(c1.cap?.[0] || '')}</div><div class="l"><span class="y2">${esc(c1.cap?.[1] || '')}</span></div></div>
        <div class="ph-logo">187 GROWUP</div>
      </div>
      <div>
        <ul style="margin:0;padding-left:18px;font-size:14px">
          <li><b>헤더</b> 핑크 마크 · <b>원장</b> 크림 정면 라운드 카드 · <b>자막</b> 흰+노랑 hl · <b>로고</b> 하단</li>
          <li><span class="scr ig">인포그래픽</span> ${igs.length}컷 = 언어중립 이미지 + <code>insertLabels</code></li>
          <li><span class="newpill">NEW</span> <b>모션 액센트</b>: 각 씬 등장 시 이모지/텍스트가 <b>살짝</b> 팝</li>
          <li><b>CTA</b>는 표준(로고 가운데 + 언어별 URL) — 변경 없음</li>
        </ul>
      </div>
    </div>`;

  // 씬 표
  const sceneRows = sc.map((s) => {
    const k = s.copy?.ko || {};
    const cap = `<span class="cap2">${hlw(k.cap?.[0] || '', k.hl)}<br>${hlw(k.cap?.[1] || '', k.hl)}</span>`;
    return `<tr><td class="c-id">${esc(s.id)}</td><td class="c-time">${esc(s.time || '')}</td><td>${scrBadge(s)}</td><td class="narr">${esc(k.narr || '')}</td><td>${cap}</td><td class="mo">${esc(s.motion || '')}</td></tr>`;
  }).join('');
  const sceneTable = `<table><thead><tr><th>#</th><th>⏱</th><th>화면</th><th>나레이션 (KO)</th><th>자막</th><th>✨ 모션</th></tr></thead><tbody>${sceneRows}</tbody></table>`;

  // 모션 가이드 (고정)
  const motionGuide = `
    <p class="lead">원칙: <b>"살짝씩"</b> — 한 씬에 액센트 1개, 0.4초 등장 후 잔잔히. 자막/원장 방해 X. <b>이모지는 유니코드 기본 문자라 별도 제작 X</b>(폰트만 로드).</p>
    <div class="mgrid">
      <div class="mg"><div class="h"><b>🎤</b> 원장 컷 액센트</div><p>우상단/키워드 옆에 <b>이모지 1개 + 짧은 텍스트</b> 팝. 원장 얼굴·입은 안 가림.</p></div>
      <div class="mg"><div class="h"><b>🖼</b> 인서트 등장 모션</div><p>요소가 <b>순차로</b> 들어옴 — 점등·<b>카운트업</b>·곡선 그리기, 핵심에 ✨/글로우 (<code>delay</code> 스태거).</p></div>
      <div class="mg"><div class="h"><b>🔢</b> 숫자 카운트업</div><p>핵심 수치는 <code>interpolate</code>로 0→목표 0.5초. 시선 집중.</p></div>
      <div class="mg"><div class="h"><b>⚡</b> 모션 타입(6종)</div><p><code>slam</code> · <code>bounce</code> · <code>shake</code>(경고) · <code>countup</code> · <code>glow</code> · <code>sparkle</code>. 씬별 1개.</p></div>
    </div>`;

  // 인포그래픽
  const igCards = igs.map((g) => {
    const labels = (g.labels || []).map((l) => `<tr><td>${esc(l.pos)}</td><td>${esc(l.ko)}</td><td>${esc(l.en)}</td><td class="thai">${esc(l.th)}</td></tr>`).join('');
    return `
      <div class="igc">
        <div class="hd"><div class="role">🖼 IG${esc(g.ig)} · ${esc(g.scene)} · 모션: ${esc(g.motion || '')}</div><h3>${esc(g.title || '')}</h3></div>
        <div class="body">
          <div class="sketch">${(g.emojis || []).map(esc).join(' ')}</div>
          <div class="lbl">AI 프롬프트 (텍스트 없이)</div>
          <div class="ig-prompt">${esc(g.prompt || '')}</div>
          <div class="lbl">오버레이 라벨</div>
          <table class="ov-t"><thead><tr><th>위치</th><th>KO</th><th>EN</th><th class="thai">TH</th></tr></thead><tbody>${labels}</tbody></table>
        </div>
      </div>`;
  }).join('');

  // 이모지 팔레트
  const emos = (spec.emojis || []).map((e) => `<span class="emo"><b>${esc(e.e)}</b> ${esc(e.label)}</span>`).join('');

  // 6언어 탭
  const tabBtns = LANGS.map((L, i) => `<button class="tabbtn${i === 0 ? ' on' : ''}" onclick="lt(this,'ln-${L.k}')">${L.label}</button>`).join('');
  const tabPanels = LANGS.map((L, i) => {
    const rows = sc.map((s) => {
      const c = s.copy?.[L.k] || {};
      const capLine = c.cap ? `${esc(c.cap[0] || '')} · ${hlw(c.cap[1] || '', c.hl)}` : '';
      return `<tr><td class="c-id">${esc(s.id)}</td><td>${esc(c.narr || '')}<br><span class="cap2">${capLine}</span></td></tr>`;
    }).join('');
    return `<div id="ln-${L.k}" class="tabpanel${i === 0 ? ' on' : ''} ${L.cls}"><table class="cp"><tbody>${rows}</tbody></table></div>`;
  }).join('\n');

  // 제작 노트
  const pipe = `
    <div class="pipe">
      <div class="pi"><div class="t">📁 폴더·ID</div><p><code>remotion/src/shorts/${esc(spec.slug)}/</code> · <code>${esc(spec.slug)}-{ko,th,vi,en,cn,ch}</code></p></div>
      <div class="pi"><div class="t">🎬 베이스·립싱크</div><p>MainClip 정면 클린 베이스 + 언어별 재립싱크(크림, RVM 없음). 中文은 만다린 1음성 + 자막만 간체/번체</p></div>
      <div class="pi"><div class="t">📣 CTA</div><p><b>표준 그대로</b>(로고 가운데 + 언어별 URL). 변경 없음</p></div>
      <div class="pi"><div class="t">✨ 모션</div><p>script.json <code>accent</code> + insertLabels <code>motion/delay</code> → PresenterShort spring (공용)</p></div>
      <div class="pi"><div class="t">📱 썸네일</div><p>Remotion <code>Thumbnail</code> — <b>주어 필수</b> · 하단 187 로고 크게 · 얼굴 없음</p></div>
      <div class="pi"><div class="t">🖼 인서트</div><p>${igs.length}종 언어중립 이미지 → 받으면 라벨 위치 미세조정</p></div>
    </div>`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>쇼츠 기획서 — ${esc(spec.topicTitle || spec.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Sans+Thai:wght@400;700;900&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="hero"><div class="wrap" style="padding:0">
  <span class="kept">🎬 YouTube Shorts 기획서 · 마케팅 콘텐츠 #${esc(spec.n)}</span>
  <h1>${esc(spec.title)}</h1>
  <div class="sub">${esc(spec.sub || '')}</div>
  <div class="chips">${heroChips}</div>
</div></div>
<div class="wrap">
  <section><h2 class="newtag"><span class="no">📱</span> 표지 / 썸네일 <span class="newpill">눈에 확 띄게</span></h2>
    <p class="lead">피드에서 손가락을 멈추게 하는 1순위. <b>거대 숫자 + 주어 + 고대비</b>. 주어 필수 · 하단 로고 크게 · 얼굴 없음.</p>
    <div class="thumbwrap">${thumb}
      <div><ul>
        <li><b>주어 필수</b> 🔑 — "<b>${esc(t.subject || '')}</b> ${esc(t.number || '')}${esc(t.numLabel || '')}"</li>
        <li><b>거대 숫자 "${esc(t.number || '')}"</b>(전기 노랑) — 0.5초 시선 자석</li>
        <li><b>하단 187 로고 크게</b> · <b>4점 성장곡선</b> · 딥퍼플→네이비 고대비</li>
      </ul>
      <div class="lbl">배경 AI 프롬프트 (텍스트·인물 없이)</div>
      <div class="ig-prompt">${esc(t.bgPrompt || 'Vertical 9:16 poster background, deep purple-to-navy gradient (#3b2a78→#1a1340), a glowing upward growth curve with luminous mint nodes, soft light bursts, premium and energetic. Clean negative space center + bottom for big text and a logo. NO text, NO people.')}</div>
      </div>
    </div>
  </section>
  <section><h2><span class="no">1</span> 핵심 컨셉</h2><p class="lead">출처: 마케팅 콘텐츠 #${esc(spec.n)} 「${esc(spec.topicTitle || '')}」 (${esc(spec.category || '')})</p>${concept}</section>
  <section><h2><span class="no">2</span> 내러티브 아크</h2>${arc}</section>
  <section><h2><span class="no">3</span> 포맷 미리보기 — PresenterShort v2</h2>${fmt}</section>
  <section><h2><span class="no">4</span> 씬별 스토리보드 (KO 마스터)</h2>${sceneTable}</section>
  <section><h2 class="newtag"><span class="no">✨</span> 모션 · 이모지 가이드 <span class="newpill">NEW</span></h2>${motionGuide}</section>
  <section><h2><span class="no">5</span> 인포그래픽 ${igs.length}종 — 이미지(텍스트 0) + insertLabels</h2>
    <p class="lead">AI 이미지는 <b>텍스트 없이 언어중립</b>, 숫자·라벨은 Remotion 오버레이(전 언어 1세트 재사용).</p>
    <div class="igrid">${igCards}</div></section>
  <section><h2><span class="no">6</span> 이모지 팔레트</h2><div class="emos">${emos}</div></section>
  <section><h2><span class="no">7</span> 다국어 카피 <span class="newpill">6개 언어 · 탭</span></h2>
    <p class="lead">🇰🇷 한글 · 🇹🇭 태국어 · 🇻🇳 베트남어 · 🇺🇸 영어 · 🇨🇳 中文(간체) · 🇹🇼 中文(번체). 탭 클릭 전환. (나레이션 / <span class="y">자막 하이라이트</span>)</p>
    <div class="tabs">${tabBtns}</div>
${tabPanels}
  </section>
  <section><h2><span class="no">8</span> 제작 노트</h2>${pipe}</section>
</div>
<script>
function lt(btn,id){
  document.querySelectorAll('.tabpanel').forEach(function(p){p.classList.remove('on');});
  document.querySelectorAll('.tabbtn').forEach(function(b){b.classList.remove('on');});
  document.getElementById(id).classList.add('on');
  btn.classList.add('on');
}
</script>
</body>
</html>`;
}
