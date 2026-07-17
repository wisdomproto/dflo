/* ============================================
   shared shell JS (loaded by every /{lang}/ static page)
   - 첫 방문 예상키 팝업 모달 (React /calc-embed 를 iframe 으로 재사용 — 단일 소스)
   - Modal open/close
   - Active nav state
   ============================================ */

// 예상키 계산 로직(LMS)·차트·폼은 React HeightCalculator(/calc-embed)가 단일 소스.
// 과거 이 파일에 있던 vanilla 포팅(한국 LMS 하드코딩 + 자체 SVG 차트)은 태국 등
// 다국어에서 한국 데이터가 노출되는 문제가 있어 제거하고, 팝업도 iframe 으로 통일.

// ============== GA4 Consult Tracking ==============
// Locale + channel injected by build-i18n via window.__I18N__.
// channel 인자는 옵션 — 넘기면 그 채널로, 없으면 그 언어의 대표 채널(i18n.channel).
// 상담 채널 시트(th/vi/en)는 한 페이지에서 WhatsApp/LINE/카카오가 모두 클릭 가능하므로
// 대표 채널로 뭉뚱그리면 어느 채널이 먹히는지 알 수 없다 → 클릭된 채널을 그대로 보낸다.
window.trackConsultClick = function (source, channel) {
  var i18n = window.__I18N__ || {};
  var ch = channel || i18n.channel || 'unknown';
  if (typeof gtag !== 'undefined') {
    gtag('event', 'consult_click', {
      channel: ch,
      locale: i18n.locale || 'unknown',
      source: source || 'unspecified',
      page_type: i18n.page_type || 'home',
    });
  }
  // Meta Pixel 핵심 전환 — 상담 문의 = Lead.
  if (typeof fbq !== 'undefined') {
    fbq('track', 'Lead', {
      source: source || 'unspecified',
      channel: ch,
      locale: i18n.locale || 'unknown',
    });
  }
};

document.addEventListener('DOMContentLoaded', function () {
  var anchors = document.querySelectorAll('a[data-source]');
  anchors.forEach(function (a) {
    a.addEventListener('click', function () {
      // data-channel 은 이전엔 장식이었고(대표 채널과 같은 값) 이제 시트가 채널별로 채운다.
      window.trackConsultClick(a.getAttribute('data-source'), a.getAttribute('data-channel'));
    });
  });
});

// 예측키 패널 열람(calc_open) / 측정 완료(height_calc_complete) — iframe(/calc-embed) 자식이 보낸
// postMessage 를 받아 GA4 발사. 부모 경로(/th/ 등)에서 발사되므로 pagePath 로 국가·진입 페이지 자동 구분.
// 열람→완료 두 이벤트로 "패널 봤지만 측정 안 끝낸" 이탈 퍼널을 사이트 분석에서 볼 수 있다.
window.addEventListener('message', function (e) {
  var d = e && e.data;
  if (!d || (d.type !== 'calc_open' && d.type !== 'height_calc_complete')) return;
  var i18n = window.__I18N__ || {};
  var allowed = ['ko', 'th', 'vi', 'en'];
  var loc = allowed.indexOf(d.locale) >= 0 ? d.locale : (i18n.locale || 'unknown');
  if (typeof gtag !== 'undefined') {
    gtag('event', d.type, {
      locale: loc,
      page_type: i18n.page_type || 'home',
    });
  }
  // Meta Pixel 보조 전환 — 측정 완료만 커스텀 이벤트(열람은 약한 신호라 픽셀 미발사).
  if (d.type === 'height_calc_complete' && typeof fbq !== 'undefined') {
    fbq('trackCustom', 'HeightCalcComplete', { locale: loc });
  }
});

// ============= I18N HELPER =============
// Looks up window.__I18N__.shell with dot-path. Falls back to provided ko-default
// so the file remains readable as Korean source-of-truth even if i18n is missing.
function t(path, fallback) {
  const root = (window.__I18N__ && window.__I18N__.shell) || null;
  if (!root) return fallback;
  let cur = root;
  for (const p of path.split('.')) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return fallback;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : fallback;
}
// HTML-escape for use inside attribute/text content (defends against ' " < > & in translations).
function tEsc(path, fallback) {
  return t(path, fallback)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============= SHELL MARKUP INJECTION =============
// Locale-aware nav: every public page lives under /{lang}/, set via window.__I18N__.locale
// in the static HTML. Defaults to /ko/ for safety if locale is missing.
const __I18N_LOCALE = (window.__I18N__ && window.__I18N__.locale) || 'ko';
const __NAV_BASE = `/${__I18N_LOCALE}`;
const __HOME_HREF = `${__NAV_BASE}/index.html`;
const __CLINIC_HREF = `${__NAV_BASE}/clinic.html`;
const __CASES_HREF = `${__NAV_BASE}/cases.html`;
const __CALC_HREF = `${__NAV_BASE}/calculator.html`;
const __LOGO_SRC = (__I18N_LOCALE && __I18N_LOCALE !== 'ko') ? '/images/logo_en.png' : '/images/logo.jpg';
// 예약(콜백) 기능은 한글 페이지 전용. __I18N__ 이 있고 locale 이 ko 일 때만(blog-index 처럼
// __I18N__ 없는 페이지는 폴백 ko 로 잡히지 않도록 명시적으로 __I18N__ 존재를 확인).
const __IS_KO = !!(window.__I18N__ && window.__I18N__.locale === 'ko');
// 예약 접수를 보낼 ai-server. build-i18n 이 window.__I18N__.aiServer 로 주입(로컬 폴백 :4000).
const __AI_SERVER__ = ((window.__I18N__ && window.__I18N__.aiServer) || 'http://localhost:4000').replace(/\/$/, '');
// Messenger CTA — injected per-locale by build-i18n. Falls back to Kakao defaults
// so this file remains readable as ko source-of-truth even if __I18N__ is missing.
const __MESSENGER = (window.__I18N__ && window.__I18N__.messenger) || {
  url: 'https://pf.kakao.com/_mxbWxfX',
  label: '1:1 카톡 상담',
  channel: 'kakao',
  color_bg: '#FAE100',
  color_fg: '#3C1E1E',
};
function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const __M_URL = escAttr(__MESSENGER.url);
const __M_LABEL = escAttr(__MESSENGER.label);
const __M_CH = escAttr(__MESSENGER.channel);
const __M_BG = escAttr(__MESSENGER.color_bg);
const __M_FG = escAttr(__MESSENGER.color_fg);

// ============= 1:1 상담 채널 시트 (비한국어 전용) =============
// 해외(th/vi/en) 방문자는 쓰는 메신저가 갈려서(태국 LINE·베트남 카톡/잘로·화교 WhatsApp)
// 단일 채널 강제 = 그 앱 안 쓰는 사람은 이탈 → 헤더 pill·하단 바에서 3채널 시트를 연다.
// ko 는 카카오 단일 채널이라 consult_channels 가 없고(빈 배열) → 기존 직행 링크 유지.
const __CONSULT = (window.__I18N__ && window.__I18N__.consultChannels) || [];
const __HAS_CONSULT_SHEET = __CONSULT.length > 1;
// 채널 브랜드 글리프 — 브랜드 로고 자산 없이 알아볼 수 있는 최소 단서(말풍선 + 채널색).
const __CONSULT_ITEMS = __CONSULT.map((c) => `
          <a class="t-consult-item" href="${escAttr(c.url)}" target="_blank" rel="noopener"
             data-source="consult_sheet" data-channel="${escAttr(c.channel)}"
             style="background:${escAttr(c.color_bg)};color:${escAttr(c.color_fg)}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
            </svg>
            <span>${escAttr(c.label)}</span>
            <svg class="t-consult-go" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </a>`).join('');

// ============= LANGUAGE SWITCHER =============
// 활성 언어(build-i18n 의 ACTIVE_LANGS 와 동일). 라벨은 각 언어 자국어 표기 —
// 어느 언어 페이지에 있든 자기 언어를 알아볼 수 있어야 하므로 번역하지 않는다.
const __LANGS = [
  { code: 'ko', label: '한국어', short: 'KO' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'th', label: 'ไทย', short: 'TH' },
  { code: 'vi', label: 'Tiếng Việt', short: 'VI' },
];
// 현재 언어는 경로에서 먼저 읽는다 — blog-index 처럼 __I18N__ 이 없는 페이지도
// /{lang}/ 아래 있어서 폴백 'ko' 로 잘못 잡히는 걸 막는다.
const __PATH_LANG_RE = /^\/(ko|th|vi|en)(\/.*)?$/;
const __CUR_LANG = (function () {
  const m = window.location.pathname.match(__PATH_LANG_RE);
  return (m && m[1]) || __I18N_LOCALE;
})();
// 같은 페이지의 다른 언어 URL. index/clinic/cases/calculator 는 파일명이 전 언어 공통이라
// 프리픽스만 갈아끼우면 되고, 블로그 글은 slug 가 언어마다 달라(1:1 대응 없음) 해당 언어 블로그 목록으로 보낸다.
function __langHref(code) {
  const m = window.location.pathname.match(__PATH_LANG_RE);
  let rest = (m && m[2]) || '/';
  if (/^\/blog\/.+/.test(rest) && !/^\/blog\/index\.html$/.test(rest)) rest = '/blog/';
  return `/${code}${rest}${window.location.search}${window.location.hash}`;
}
const __CUR_LANG_SHORT = escAttr((__LANGS.find((l) => l.code === __CUR_LANG) || __LANGS[0]).short);
const __LANG_ITEMS = __LANGS.map((l) => `
        <li role="none">
          <a role="menuitem" href="${escAttr(__langHref(l.code))}" lang="${l.code}" data-lang-to="${l.code}"${l.code === __CUR_LANG ? ' aria-current="true"' : ''}>
            <span>${l.label}</span>
            <span class="t-lang-code">${l.short}</span>
          </a>
        </li>`).join('');

const SHELL_HTML = `
  <header class="t-header" role="banner">
    <a href="${__HOME_HREF}" class="logo-wrap" aria-label="${tEsc('aria.home', '홈으로')}">
      <img class="logo" src="${__LOGO_SRC}" alt="187 성장클리닉">
    </a>
    <div class="t-header-actions">
      ${__HAS_CONSULT_SHEET ? `
      <button type="button" class="t-header-kakao" data-consult-open="header_cta" aria-haspopup="dialog" aria-label="${tEsc('aria.consult', '1:1 상담')}" style="background:${__M_BG};color:${__M_FG}">` : `
      <a class="t-header-kakao" data-channel="${__M_CH}" data-source="header_cta" href="${__M_URL}" target="_blank" rel="noopener" aria-label="${tEsc('aria.kakao', '카카오톡 1:1 상담')}" style="background:${__M_BG};color:${__M_FG}">`}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
        </svg>
        <span>${__HAS_CONSULT_SHEET ? tEsc('header.consult_label', '1:1 상담') : tEsc('header.kakao_label', '1:1 카톡 상담')}</span>
      ${__HAS_CONSULT_SHEET ? '</button>' : '</a>'}
      <div class="t-lang" data-lang-switch>
        <button type="button" class="t-lang-btn" aria-label="${tEsc('aria.lang', '언어 선택')}" aria-haspopup="true" aria-expanded="false" data-lang-toggle>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/>
            <path d="M3 12h18"/>
            <path d="M12 3a15 15 0 010 18 15 15 0 010-18z"/>
          </svg>
          <span>${__CUR_LANG_SHORT}</span>
          <svg class="t-lang-caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        <ul class="t-lang-menu" role="menu" hidden>${__LANG_ITEMS}
        </ul>
      </div>
    </div>
  </header>

  <nav class="t-bottom-nav${__IS_KO ? ' t-bottom-nav--full' : ''}${__HAS_CONSULT_SHEET ? ' t-bottom-nav--5' : ''}" aria-label="${tEsc('aria.menu', '메인 메뉴')}">
    <a href="${__HOME_HREF}" data-nav="programs">
      <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 4h12a4 4 0 014 4v12" />
        <path d="M4 4v16h16" />
        <path d="M8 9h8" /><path d="M8 13h6" />
      </svg>
      <span>${tEsc('nav.programs', '성장 프로그램')}</span>
    </a>
    <a href="${__CLINIC_HREF}" data-nav="clinic">
      <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 21h18" />
        <path d="M5 21V8l7-5 7 5v13" />
        <path d="M12 12v6" /><path d="M9 15h6" />
      </svg>
      <span>${tEsc('nav.clinic', '병원 소개')}</span>
    </a>
    <a href="${__CASES_HREF}" data-nav="cases">
      <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="1.5" />
        <path d="M3 9h18" /><path d="M9 9v12" />
      </svg>
      <span>${tEsc('nav.cases', '치료 사례')}</span>
    </a>
    <a href="${__CALC_HREF}" data-nav="calc" class="t-nav-highlight">
      <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 4l16 16" /><path d="M4 4v16h16" /><path d="M9 14l3-3 3 3" /><path d="M12 11V4" />
      </svg>
      <span>${tEsc('nav.calc', '예상키 측정')}</span>
    </a>${__HAS_CONSULT_SHEET ? `
    <button type="button" data-consult-open="bottom_nav" aria-haspopup="dialog">
      <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
      </svg>
      <span>${tEsc('nav.consult', '1:1 상담')}</span>
    </button>` : ''}${__IS_KO ? `
    <button type="button" class="t-nav-reserve" data-open-reservation aria-haspopup="dialog">
      <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M9 15l2 2 4-4"/>
      </svg>
      <span>예약하기</span>
    </button>` : ''}
  </nav>

${__HAS_CONSULT_SHEET ? `
  <div class="t-consult" id="tConsult" role="dialog" aria-modal="true" aria-label="${tEsc('consult.title', '1:1 상담')}" hidden>
    <div class="t-consult-sheet" role="document">
      <div class="t-consult-head">
        <div>
          <h2>${tEsc('consult.title', '1:1 상담')}</h2>
          <p>${tEsc('consult.desc', '편하신 메신저를 선택하세요.')}</p>
        </div>
        <button type="button" class="t-consult-close" data-consult-close aria-label="${tEsc('aria.close', '닫기')}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="t-consult-list">${__CONSULT_ITEMS}
      </div>
    </div>
  </div>` : ''}

  <div class="t-modal" id="tCalcModal" role="dialog" aria-modal="true" aria-label="${tEsc('calc.title', '우리 아이 예상 키')}">
    <div class="t-calc-frame">
      <div class="t-calc-frame-bar">
        <button type="button" class="t-modal-close" data-close-modal aria-label="${tEsc('aria.close', '닫기')}">✕</button>
      </div>
      <iframe id="tCalcFrame" class="t-calc-iframe" title="${tEsc('calc.title', '우리 아이 예상 키')}" loading="lazy"></iframe>
    </div>
  </div>
${__IS_KO ? `
  <div class="t-resv" id="tResv" role="dialog" aria-modal="true" aria-label="예약 신청" hidden>
    <div class="t-resv-sheet">
      <div class="t-resv-bar">
        <button type="button" class="t-resv-close" data-resv-close aria-label="닫기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="t-resv-body">
        <div class="t-resv-view" data-resv-view="form">
          <h2 class="t-resv-lead">원활한 예약을 위해<br>고객님의 정보를 먼저 입력해 주세요.</h2>
          <form id="tResvForm" novalidate>
            <div class="t-resv-field">
              <label class="t-resv-flabel" for="tResvName">성명 <i>*</i></label>
              <input id="tResvName" name="name" type="text" required autocomplete="name" placeholder="이름을 입력해 주세요.">
            </div>
            <div class="t-resv-field">
              <label class="t-resv-flabel" for="tResvPhone">휴대전화번호 <i>*</i></label>
              <input id="tResvPhone" name="phone" type="tel" inputmode="numeric" required autocomplete="tel" placeholder="휴대전화번호를 입력해 주세요.">
            </div>
            <div class="t-resv-field">
              <span class="t-resv-flabel">상담 방식 <i>*</i></span>
              <div class="t-resv-radio">
                <label><input type="radio" name="contactMethod" value="phone" checked><span>전화상담</span></label>
                <label><input type="radio" name="contactMethod" value="text"><span>문자상담</span></label>
              </div>
            </div>
            <div class="t-resv-field">
              <label class="t-resv-flabel" for="tResvMsg">상담 내용 <em>(선택)</em></label>
              <textarea id="tResvMsg" name="message" rows="3" placeholder="아이 나이·키 고민을 간단히 적어주세요."></textarea>
            </div>
            <input class="t-resv-hp" type="text" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true">

            <div class="t-resv-terms">
              <div class="t-resv-terms-title">약관동의</div>
              <p class="t-resv-terms-sub">필수 항목 약관에 동의해 주세요.</p>
              <label class="t-resv-check t-resv-all"><input type="checkbox" data-resv-all><b>전체동의</b></label>
              <div class="t-resv-crow">
                <label class="t-resv-check"><input type="checkbox" data-resv-req name="agreeService"><span><b>(필수)</b> 서비스 이용약관</span></label>
                <button type="button" class="t-resv-viewbtn" data-resv-terms="service">보기</button>
              </div>
              <div class="t-resv-doc" data-resv-doc="service" hidden>본 예약 신청은 연세새봄의원(187 성장클리닉)의 상담 예약을 위한 것입니다. 남겨주신 정보는 예약 상담 연락 목적으로만 사용되며, 진료·처방을 보장하거나 특정 치료 효과를 약속하지 않습니다. 신청자는 언제든 연락 거부 및 정보 삭제를 요청할 수 있습니다.</div>
              <div class="t-resv-crow">
                <label class="t-resv-check"><input type="checkbox" data-resv-req name="agreePrivacy"><span><b>(필수)</b> 개인정보 수집·이용</span></label>
                <button type="button" class="t-resv-viewbtn" data-resv-terms="privacy">보기</button>
              </div>
              <div class="t-resv-doc" data-resv-doc="privacy" hidden>• 수집 항목: 성명, 휴대전화번호, 상담 방식 (선택: 상담 내용)<br>• 수집·이용 목적: 상담 예약 확인 및 연락<br>• 보유·이용 기간: 상담 종료 후 1년 또는 삭제 요청 시까지<br>• 동의를 거부할 권리가 있으나, 미동의 시 예약 연락이 어렵습니다.</div>
            </div>

            <p class="t-resv-err" id="tResvErr" hidden></p>
          </form>
        </div>

        <div class="t-resv-view" data-resv-view="done" hidden>
          <div class="t-resv-done">
            <div class="t-resv-done-ic">✓</div>
            <h2>예약이 접수됐어요.</h2>
            <p>담당자가 확인 후 남겨주신 번호로<br>빠르게 연락드리겠습니다.</p>
            <button type="button" class="t-resv-done-btn" data-resv-close>확인</button>
          </div>
        </div>
      </div>

      <div class="t-resv-foot" data-resv-foot="form">
        <button type="submit" form="tResvForm" class="t-resv-submit" id="tResvSubmit">예약 신청하기</button>
        <a class="t-resv-call" href="tel:1599-0741" data-source="reservation_call">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          바로 전화하기 · 1599-0741
        </a>
      </div>
    </div>
  </div>` : ''}
`;

(function() {
  // Inject shell into <body> end
  const mount = document.createElement('div');
  mount.innerHTML = SHELL_HTML;
  while (mount.firstChild) document.body.appendChild(mount.firstChild);

  // Mark active nav by data-page attribute on <body>
  const currentPage = document.body.dataset.page || 'programs';
  document.querySelectorAll('.t-bottom-nav a').forEach(a => {
    if (a.dataset.nav === currentPage) a.classList.add('active');
  });

  // ============= 1:1 상담 채널 시트 (th/vi/en) =============
  // 채널 링크는 마크업에 이미 박혀 있고(=__CONSULT_ITEMS, 클릭 추적은 a[data-source] 공통 바인딩이
  // 담당) 여기선 열고/닫기 + 열람 이벤트만 담당. 진입점 2곳(헤더 pill / 하단 바)이 같은 시트를 쓴다.
  const consult = document.getElementById('tConsult');
  if (consult) {
    // 시트는 오버레이라 자동 page_view 가 없다 → 예약 폼과 같은 규칙으로 열람 이벤트를 발사해
    // "열었지만 아무 채널도 안 누른" 이탈을 퍼널에서 볼 수 있게 한다.
    const trackConsultOpen = (source) => {
      if (typeof gtag === 'undefined') return;
      gtag('event', 'consult_open', {
        locale: (window.__I18N__ && window.__I18N__.locale) || 'unknown',
        source: source || 'unknown',
      });
    };
    const setConsultNavActive = (on) => {
      document.querySelectorAll('.t-bottom-nav [data-consult-open]').forEach((b) => b.classList.toggle('active', on));
    };
    const openConsult = (source) => {
      consult.hidden = false;
      requestAnimationFrame(() => consult.classList.add('is-open'));
      document.body.style.overflow = 'hidden';
      setConsultNavActive(true);
      trackConsultOpen(source);
    };
    const closeConsult = () => {
      consult.classList.remove('is-open');
      document.body.style.overflow = '';
      setConsultNavActive(false);
      setTimeout(() => { consult.hidden = true; }, 200);
    };

    document.querySelectorAll('[data-consult-open]').forEach((b) => {
      b.addEventListener('click', () => openConsult(b.getAttribute('data-consult-open')));
    });
    consult.querySelectorAll('[data-consult-close]').forEach((b) => b.addEventListener('click', closeConsult));
    // 배경(딤) 클릭 = 닫기. 시트 내부 클릭은 통과시킨다.
    consult.addEventListener('click', (e) => { if (e.target === consult) closeConsult(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && consult.classList.contains('is-open')) closeConsult();
    });
    // 채널을 골라 나가면(새 탭) 시트는 닫아둔다 — 돌아왔을 때 열린 채로 남지 않게.
    consult.querySelectorAll('.t-consult-item').forEach((a) => a.addEventListener('click', closeConsult));
  }

  // Language switcher dropdown — 항목 href 는 마크업에서 이미 현재 페이지의 대응 URL 로
  // 계산돼 있으므로(=__langHref) 여기선 열고/닫기만 담당한다.
  const langWrap = document.querySelector('[data-lang-switch]');
  if (langWrap) {
    const langBtn = langWrap.querySelector('[data-lang-toggle]');
    const langMenu = langWrap.querySelector('.t-lang-menu');

    const setLangOpen = (open) => {
      langMenu.hidden = !open;
      langBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      langWrap.classList.toggle('open', open);
    };

    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setLangOpen(langMenu.hidden);
    });
    document.addEventListener('click', (e) => {
      if (!langMenu.hidden && !langWrap.contains(e.target)) setLangOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !langMenu.hidden) {
        setLangOpen(false);
        langBtn.focus();
      }
    });
  }

  // ============= CALCULATOR MODAL (iframe → React /calc-embed) =============
  // 폼·계산·차트는 React HeightCalculator 단일 소스. 모달은 iframe 으로만 재사용.
  // 30일 만료 — 같은 사용자가 광고 재방문 시에도 너무 차갑지 않게 다시 한 번 노출.
  const SEEN_KEY = 't.calc.modal.seen';
  const SEEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const modal = document.getElementById('tCalcModal');
  const calcFrame = document.getElementById('tCalcFrame');

  function openCalcModal() {
    if (!modal) return;
    // Lazy-load the iframe only on first open — 경량 calc 엔트리(/calc.html)로 위임.
    if (calcFrame && !calcFrame.src) {
      calcFrame.src = '/calc.html?lang=' + encodeURIComponent(__I18N_LOCALE);
    }
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeCalcModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch (e) { /* ignore */ }
  }
  // Expose globally so any inline onclick or other shells can reuse.
  window.t = window.t || {};
  window.t.openCalcModal = openCalcModal;
  window.t.closeCalcModal = closeCalcModal;

  document.querySelectorAll('[data-close-modal]').forEach((b) => {
    b.addEventListener('click', closeCalcModal);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) closeCalcModal();
  });

  // Auto-open policy (2026-06-17 완화 — 즉시 전면 팝업이 첫인상 방해 → 이탈↑·체류↓ 원인)
  // 유입 대부분이 광고라 광고도 동일하게 이탈 보호(2026-06-17b).
  // - calc 전용 페이지에선 skip (이미 같은 폼이 페이지 자체).
  // - 30일 이내 본 적 있으면 skip.
  // - 광고/조직 공통: '관심' 신호일 때만 — 스크롤 깊이 50%↑ / 데스크톱 exit-intent / 시간 폴백.
  //   시간 폴백만 차등: 광고 7초(빠른 이탈 ~4.6초 대응) · 조직 20초.
  //   (옛 광고 0.6초·조직 1.5초/200px 즉시 오픈 제거 — 읽기 전 차단이 이탈 유발)
  const isCalcPage = document.body.dataset.page === 'calc';
  let alreadySeen = false;
  try {
    const v = localStorage.getItem(SEEN_KEY);
    if (v) {
      const ts = Number(v);
      // 옛 값 ('1') 도 그대로 인정 (Number('1') = 1, 30일 한참 지난 시점 → 다시 표시)
      alreadySeen = !isNaN(ts) && ts > 0 && Date.now() - ts < SEEN_TTL_MS;
    }
  } catch (e) { /* ignore */ }
  // 자동오픈 OFF (2026-07-01) — GA4 실측: 팝업이 calc_open 만 부풀리고(사람들이 반사적으로 닫음) 완료로 안 이어짐
  // + 전면 오버레이(fixed) iframe 이 모바일 키보드/스크롤 마찰. 측정 유도는 **광고를 계산 페이지
  // (`/{lang}/calculator.html`)로 직행**시키는 게 정답(메시지 매치·팝업 무). 트리거 코드는 보존(되살리기 쉽게).
  const AUTO_OPEN = false;
  if (AUTO_OPEN && !isCalcPage && !alreadySeen) {
    const params = new URLSearchParams(window.location.search);
    const fromAd = ['cpc', 'paid', 'paid_social'].includes(params.get('utm_medium') || '');
    // 광고/조직 공통 — '관심' 신호일 때만 노출(즉시 전면팝업은 이탈 유발). fromAd 는 시간 폴백만 짧게.
    let opened = false;
    const fallbackMs = fromAd ? 7000 : 20000;
    const trigger = () => {
      if (opened) return;
      opened = true;
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mouseout', onExit);
      clearTimeout(fallbackTimer);
      openCalcModal();
    };
    // ① 스크롤 깊이 50%↑ = 콘텐츠를 읽는 중(모바일 포함 동작).
    const onScroll = () => {
      const sh = document.documentElement.scrollHeight - window.innerHeight;
      if (sh > 0 && window.scrollY / sh >= 0.5) trigger();
    };
    // ② exit-intent = 마우스가 뷰포트 상단 밖으로 이탈(떠나려는 순간, 데스크톱).
    const onExit = (e) => { if (e.clientY <= 0 && !e.relatedTarget) trigger(); };
    // ③ 시간 폴백 = 스크롤·exit 둘 다 없는 경우(광고 7초·조직 20초).
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mouseout', onExit);
    const fallbackTimer = setTimeout(trigger, fallbackMs);
  }

  // ============= RESERVATION (콜백 예약, 한글 전용) =============
  // 이름·전화만 남기면 병원이 연락하는 저마찰 리드 캡처. 접수는 ai-server 로 POST
  // (service_role insert + 이메일/텔레그램 알림). 카톡 상담과 병행하는 별도 동선.
  if (__IS_KO) {
    const resv = document.getElementById('tResv');
    const form = document.getElementById('tResvForm');
    const submitBtn = document.getElementById('tResvSubmit');
    const errEl = document.getElementById('tResvErr');
    const allChk = resv && resv.querySelector('[data-resv-all]');
    const reqChks = resv ? Array.from(resv.querySelectorAll('[data-resv-req]')) : [];

    function resetResvView() {
      if (!resv) return;
      const formView = resv.querySelector('[data-resv-view="form"]');
      const doneView = resv.querySelector('[data-resv-view="done"]');
      const foot = resv.querySelector('[data-resv-foot="form"]');
      if (formView) formView.hidden = false;
      if (doneView) doneView.hidden = true;
      if (foot) foot.hidden = false;
      if (errEl) errEl.hidden = true;
    }
    // 예약 폼은 오버레이라 자동 page_view 가 없다 → 가상 페이지(/reservation)로 GA4 Pages 리포트에
    // 잡히게 하고, 퍼널용 reservation_open 이벤트(source 구분)도 함께 발사. 3개 진입점 공통.
    function trackResvOpen(source) {
      if (typeof gtag === 'undefined') return;
      gtag('event', 'page_view', { page_title: '예약 신청', page_location: location.origin + '/reservation', page_path: '/reservation' });
      gtag('event', 'reservation_open', { locale: 'ko', source: source || 'unknown' });
    }
    function setResvNavActive(on) {
      document.querySelectorAll('[data-open-reservation]').forEach((b) => b.classList.toggle('active', on));
    }
    function openResv(source) {
      if (!resv) return;
      resetResvView();
      resv.hidden = false;
      requestAnimationFrame(() => resv.classList.add('is-open'));
      document.body.style.overflow = 'hidden';
      setResvNavActive(true);
      trackResvOpen(source);
    }
    function closeResv() {
      if (!resv) return;
      resv.classList.remove('is-open');
      document.body.style.overflow = '';
      setResvNavActive(false);
      setTimeout(() => { resv.hidden = true; }, 200);
    }

    document.querySelectorAll('[data-open-reservation]').forEach((b) => b.addEventListener('click', () => openResv('bottom_nav')));
    if (resv) {
      resv.querySelectorAll('[data-resv-close]').forEach((b) => b.addEventListener('click', closeResv));
      // 약관 [보기] 토글
      resv.querySelectorAll('[data-resv-terms]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-resv-terms');
          const doc = resv.querySelector('[data-resv-doc="' + key + '"]');
          if (doc) { doc.hidden = !doc.hidden; btn.textContent = doc.hidden ? '보기' : '닫기'; }
        });
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && resv && resv.classList.contains('is-open')) closeResv();
    });

    // 예측키 결과(iframe /calc.html)에서 "예약하기" 클릭 → 부모로 postMessage → 여기서 오버레이 오픈.
    // 계산기 모달이 떠 있으면 먼저 닫고(겹침 방지) 예약 폼을 연다.
    window.addEventListener('message', function (e) {
      var d = e && e.data;
      if (!d || d.type !== 'open_reservation') return;
      if (modal && modal.classList.contains('is-open')) closeCalcModal();
      openResv(d.source || 'calc'); // openResv 가 page_view + reservation_open 발사
    });

    // 전체동의 ↔ 개별 필수 동기화
    if (allChk) {
      allChk.addEventListener('change', () => { reqChks.forEach((c) => { c.checked = allChk.checked; }); });
    }
    reqChks.forEach((c) => c.addEventListener('change', () => {
      if (allChk) allChk.checked = reqChks.length > 0 && reqChks.every((x) => x.checked);
    }));

    function showResvErr(msg) {
      if (!errEl) return;
      errEl.textContent = msg;
      errEl.hidden = false;
    }
    function resvAttribution() {
      const here = new URLSearchParams(window.location.search);
      const utm = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach((k) => {
        const v = here.get(k);
        if (v) utm[k] = v;
      });
      return { referrer: document.referrer || null, utm: Object.keys(utm).length ? utm : null };
    }

    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errEl) errEl.hidden = true;
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      const phone = String(fd.get('phone') || '').trim();
      const contactMethod = String(fd.get('contactMethod') || 'phone');
      const message = String(fd.get('message') || '').trim();
      const hp = String(fd.get('hp') || '');
      const digits = phone.replace(/[^0-9]/g, '');
      const consent = reqChks.length > 0 && reqChks.every((c) => c.checked);

      if (!name) return showResvErr('성명을 입력해 주세요.');
      if (digits.length < 9 || digits.length > 11) return showResvErr('휴대전화번호를 정확히 입력해 주세요.');
      if (!consent) return showResvErr('필수 약관에 동의해 주세요.');

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '신청 중…'; }
      try {
        const att = resvAttribution();
        const resp = await fetch(__AI_SERVER__ + '/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, contactMethod, message, consent: true, hp, locale: 'ko', referrer: att.referrer, utm: att.utm }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data.ok) throw new Error((data && data.error) || '접수에 실패했습니다.');
        // 성공 → done 뷰 전환 + 계측
        const formView = resv.querySelector('[data-resv-view="form"]');
        const doneView = resv.querySelector('[data-resv-view="done"]');
        const foot = resv.querySelector('[data-resv-foot="form"]');
        if (formView) formView.hidden = true;
        if (doneView) doneView.hidden = false;
        if (foot) foot.hidden = true;
        if (typeof gtag !== 'undefined') gtag('event', 'reservation_submit', { locale: 'ko', source: 'bottom_nav' });
        if (typeof fbq !== 'undefined') fbq('track', 'Lead', { source: 'reservation', locale: 'ko' });
      } catch (err) {
        showResvErr((err && err.message) || '접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '예약 신청하기'; }
      }
    });
  }
})();
