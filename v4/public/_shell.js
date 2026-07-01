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
window.trackConsultClick = function (source) {
  var i18n = window.__I18N__ || {};
  if (typeof gtag !== 'undefined') {
    gtag('event', 'consult_click', {
      channel: i18n.channel || 'unknown',
      locale: i18n.locale || 'unknown',
      source: source || 'unspecified',
      page_type: i18n.page_type || 'home',
    });
  }
  // Meta Pixel 핵심 전환 — 상담 문의 = Lead.
  if (typeof fbq !== 'undefined') {
    fbq('track', 'Lead', {
      source: source || 'unspecified',
      channel: i18n.channel || 'unknown',
      locale: i18n.locale || 'unknown',
    });
  }
};

document.addEventListener('DOMContentLoaded', function () {
  var anchors = document.querySelectorAll('a[data-source]');
  anchors.forEach(function (a) {
    a.addEventListener('click', function () {
      window.trackConsultClick(a.getAttribute('data-source'));
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

const SHELL_HTML = `
  <header class="t-header" role="banner">
    <a href="${__HOME_HREF}" class="logo-wrap" aria-label="${tEsc('aria.home', '홈으로')}">
      <img class="logo" src="${__LOGO_SRC}" alt="187 성장클리닉">
    </a>
    <div class="t-header-actions">
      <a class="t-header-kakao" data-channel="${__M_CH}" data-source="header_cta" href="${__M_URL}" target="_blank" rel="noopener" aria-label="${tEsc('aria.kakao', '카카오톡 1:1 상담')}" style="background:${__M_BG};color:${__M_FG}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
        </svg>
        <span>${tEsc('header.kakao_label', '1:1 카톡 상담')}</span>
      </a>
      <button type="button" class="share-btn" aria-label="${tEsc('aria.share', '공유하기')}" data-share>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      </button>
    </div>
  </header>

  <nav class="t-bottom-nav" aria-label="${tEsc('aria.menu', '메인 메뉴')}">
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
    </a>
  </nav>

  <div class="t-modal" id="tCalcModal" role="dialog" aria-modal="true" aria-label="${tEsc('calc.title', '우리 아이 예상 키')}">
    <div class="t-calc-frame">
      <div class="t-calc-frame-bar">
        <button type="button" class="t-modal-close" data-close-modal aria-label="${tEsc('aria.close', '닫기')}">✕</button>
      </div>
      <iframe id="tCalcFrame" class="t-calc-iframe" title="${tEsc('calc.title', '우리 아이 예상 키')}" loading="lazy"></iframe>
    </div>
  </div>
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

  // Share button — Web Share API + clipboard fallback
  const shareBtn = document.querySelector('[data-share]');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const url = window.location.href;
      const title = document.title || '187 성장클리닉';
      try {
        if (navigator.share) {
          await navigator.share({ title, url });
          return;
        }
      } catch (e) { /* user cancelled or share failed — fall through to clipboard */ }
      try {
        await navigator.clipboard.writeText(url);
        showToast(t('toast.copied', '링크가 복사되었습니다'));
      } catch (e) {
        showToast(t('toast.failed', '공유 실패'));
      }
    });
  }

  function showToast(msg) {
    let t = document.querySelector('.t-share-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 't-share-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => t.classList.remove('show'), 2000);
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
})();
