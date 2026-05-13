/* ============================================
   /test/ shared shell JS
   - Calculator (vanilla port of LMS logic)
   - Modal open/close
   - Active nav state
   ============================================ */

// ============= LMS DATA (한국 질병관리청 2017) =============
const MALE_HEIGHT_LMS = [
  { age: 2, L: 1, M: 87.1161, S: 0.0351 },
  { age: 2.5, L: 1, M: 91.9327, S: 0.037 },
  { age: 3, L: -1.0915, M: 96.4961, S: 0.0403 },
  { age: 3.5, L: -0.5827, M: 99.793, S: 0.0401 },
  { age: 4, L: -0.1597, M: 103.0749, S: 0.04 },
  { age: 4.5, L: 0.1897, M: 106.344, S: 0.0399 },
  { age: 5, L: 0.4242, M: 109.5896, S: 0.0398 },
  { age: 5.5, L: 0.3787, M: 112.7735, S: 0.04 },
  { age: 6, L: 0.1783, M: 115.9183, S: 0.0403 },
  { age: 6.5, L: 0.0563, M: 119.0136, S: 0.0406 },
  { age: 7, L: 0.0492, M: 122.0537, S: 0.0406 },
  { age: 7.5, L: 0.0397, M: 125.0114, S: 0.0406 },
  { age: 8, L: 0.1205, M: 127.8793, S: 0.0405 },
  { age: 8.5, L: 0.2339, M: 130.6754, S: 0.0404 },
  { age: 9, L: 0.1885, M: 133.4136, S: 0.0405 },
  { age: 9.5, L: 0.021, M: 136.1026, S: 0.041 },
  { age: 10, L: -0.0752, M: 138.8473, S: 0.0417 },
  { age: 10.5, L: -0.0489, M: 141.7059, S: 0.0426 },
  { age: 11, L: 0.0886, M: 144.701, S: 0.0438 },
  { age: 11.5, L: 0.4064, M: 147.9321, S: 0.0453 },
  { age: 12, L: 0.8928, M: 151.4223, S: 0.0465 },
  { age: 12.5, L: 1.458, M: 155.0459, S: 0.0469 },
  { age: 13, L: 2.0111, M: 158.6245, S: 0.0463 },
  { age: 13.5, L: 2.6754, M: 162.0038, S: 0.0445 },
  { age: 14, L: 3.3119, M: 164.965, S: 0.0417 },
  { age: 14.5, L: 3.6315, M: 167.3647, S: 0.0388 },
  { age: 15, L: 3.5208, M: 169.1812, S: 0.0363 },
  { age: 15.5, L: 2.9809, M: 170.4684, S: 0.0345 },
  { age: 16, L: 2.154, M: 171.3949, S: 0.0332 },
  { age: 16.5, L: 1.3966, M: 172.0897, S: 0.0323 },
  { age: 17, L: 0.9751, M: 172.6404, S: 0.0321 },
  { age: 17.5, L: 0.6595, M: 173.1222, S: 0.0321 },
  { age: 18, L: 0.3638, M: 173.6037, S: 0.032 },
];

const FEMALE_HEIGHT_LMS = [
  { age: 2, L: 1, M: 85.7153, S: 0.0376 },
  { age: 2.5, L: 1, M: 90.6797, S: 0.0389 },
  { age: 3, L: 0.5472, M: 95.4078, S: 0.0413 },
  { age: 3.5, L: 0.2825, M: 98.6465, S: 0.0407 },
  { age: 4, L: 0.1129, M: 101.8943, S: 0.0401 },
  { age: 4.5, L: -0.0216, M: 105.1425, S: 0.0395 },
  { age: 5, L: -0.1404, M: 108.3714, S: 0.039 },
  { age: 5.5, L: -0.0272, M: 111.5656, S: 0.0388 },
  { age: 6, L: 0.2115, M: 114.7289, S: 0.0388 },
  { age: 6.5, L: 0.2769, M: 117.8257, S: 0.0391 },
  { age: 7, L: 0.0163, M: 120.8229, S: 0.0396 },
  { age: 7.5, L: -0.3571, M: 123.7505, S: 0.0402 },
  { age: 8, L: -0.5993, M: 126.6703, S: 0.041 },
  { age: 8.5, L: -0.779, M: 129.6197, S: 0.0416 },
  { age: 9, L: -0.8812, M: 132.6442, S: 0.0423 },
  { age: 9.5, L: -0.6545, M: 135.8116, S: 0.0432 },
  { age: 10, L: -0.1573, M: 139.1218, S: 0.0438 },
  { age: 10.5, L: 0.4653, M: 142.4689, S: 0.044 },
  { age: 11, L: 1.1242, M: 145.7568, S: 0.0435 },
  { age: 11.5, L: 1.8239, M: 148.8746, S: 0.0421 },
  { age: 12, L: 2.3447, M: 151.6571, S: 0.0402 },
  { age: 12.5, L: 2.5648, M: 154.0138, S: 0.0382 },
  { age: 13, L: 2.5607, M: 155.9198, S: 0.0362 },
  { age: 13.5, L: 2.3149, M: 157.3292, S: 0.0348 },
  { age: 14, L: 2.0549, M: 158.3159, S: 0.0339 },
  { age: 14.5, L: 1.967, M: 159.0139, S: 0.0334 },
  { age: 15, L: 1.79, M: 159.4917, S: 0.033 },
  { age: 15.5, L: 1.3515, M: 159.8149, S: 0.0328 },
  { age: 16, L: 0.8678, M: 160.0286, S: 0.0325 },
  { age: 16.5, L: 0.332, M: 160.1342, S: 0.032 },
  { age: 17, L: -0.164, M: 160.2483, S: 0.0316 },
  { age: 17.5, L: -0.311, M: 160.4524, S: 0.0313 },
  { age: 18, L: -0.4107, M: 160.6484, S: 0.0311 },
];

// ============= LMS HELPERS =============
function interpolateLMS(age, table) {
  if (age <= table[0].age) return table[0];
  if (age >= table[table.length - 1].age) return table[table.length - 1];
  for (let i = 0; i < table.length - 1; i++) {
    if (age >= table[i].age && age <= table[i + 1].age) {
      const t = (age - table[i].age) / (table[i + 1].age - table[i].age);
      return {
        age,
        L: table[i].L + t * (table[i + 1].L - table[i].L),
        M: table[i].M + t * (table[i + 1].M - table[i].M),
        S: table[i].S + t * (table[i + 1].S - table[i].S),
      };
    }
  }
  return table[0];
}

function zScoreFromLMS(value, lms) {
  if (Math.abs(lms.L) < 0.001) return Math.log(value / lms.M) / lms.S;
  return (Math.pow(value / lms.M, lms.L) - 1) / (lms.L * lms.S);
}

function zToPercentile(z) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return Math.max(0, Math.min(100, ((1 + sign * erf) / 2) * 100));
}

function calculateAge(birthDate) {
  const birth = new Date(birthDate);
  const target = new Date();
  let years = target.getFullYear() - birth.getFullYear();
  let months = target.getMonth() - birth.getMonth();
  let days = target.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    const prev = new Date(target.getFullYear(), target.getMonth(), 0);
    days += prev.getDate();
  }
  if (months < 0) { years -= 1; months += 12; }
  const decimal = parseFloat((years + months / 12).toFixed(2));
  return { years, months, decimal };
}

function calcPercentile(height, age, gender) {
  const table = gender === 'male' ? MALE_HEIGHT_LMS : FEMALE_HEIGHT_LMS;
  const lms = interpolateLMS(age, table);
  if (!lms) return 50;
  const z = zScoreFromLMS(height, lms);
  return Math.round(zToPercentile(z) * 10) / 10;
}

function predictAdultHeight(height, age, gender) {
  const table = gender === 'male' ? MALE_HEIGHT_LMS : FEMALE_HEIGHT_LMS;
  const currentLms = interpolateLMS(age, table);
  const adultLms = table[table.length - 1];
  if (!currentLms) return 0;
  const z = zScoreFromLMS(height, currentLms);
  if (Math.abs(adultLms.L) < 0.001) {
    return Math.round(adultLms.M * Math.exp(adultLms.S * z) * 10) / 10;
  }
  const inside = 1 + adultLms.L * adultLms.S * z;
  if (inside <= 0) return 0;
  return Math.round(adultLms.M * Math.pow(inside, 1 / adultLms.L) * 10) / 10;
}

// Expose LMS helpers + chart helper for inline page scripts (e.g. calculator.html)
window.t = window.t || {};
window.t.calc = { calculateAge, calcPercentile, predictAdultHeight };
// Also expose interpolate / zScore so chart helper inside IIFE can be replicated by inline scripts if needed.
window.t.lms = { interpolateLMS, zScoreFromLMS, MALE_HEIGHT_LMS, FEMALE_HEIGHT_LMS };

// ============== GA4 Consult Tracking ==============
// Locale + channel injected by build-i18n via window.__I18N__.
window.trackConsultClick = function (source) {
  var i18n = window.__I18N__ || {};
  if (typeof gtag === 'undefined') return;
  gtag('event', 'consult_click', {
    channel: i18n.channel || 'unknown',
    locale: i18n.locale || 'unknown',
    source: source || 'unspecified',
    page_type: i18n.page_type || 'home',
  });
};

document.addEventListener('DOMContentLoaded', function () {
  var anchors = document.querySelectorAll('a[data-source]');
  anchors.forEach(function (a) {
    a.addEventListener('click', function () {
      window.trackConsultClick(a.getAttribute('data-source'));
    });
  });
});

// ============= SHELL MARKUP INJECTION =============
const SHELL_HTML = `
  <header class="t-header" role="banner">
    <a href="index.html" class="logo-wrap" aria-label="홈으로">
      <img class="logo" src="/images/logo.jpg" alt="187 성장클리닉">
    </a>
    <div class="t-header-actions">
      <a class="t-header-kakao" href="https://pf.kakao.com/_ZxneSb" target="_blank" rel="noopener" aria-label="카카오톡 1:1 상담">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
        </svg>
        <span>1:1 카톡 상담</span>
      </a>
      <button type="button" class="share-btn" aria-label="공유하기" data-share>
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

  <nav class="t-bottom-nav" aria-label="메인 메뉴">
    <a href="index.html" data-nav="programs">
      <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 4h12a4 4 0 014 4v12" />
        <path d="M4 4v16h16" />
        <path d="M8 9h8" /><path d="M8 13h6" />
      </svg>
      <span>성장 프로그램</span>
    </a>
    <a href="clinic.html" data-nav="clinic">
      <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 21h18" />
        <path d="M5 21V8l7-5 7 5v13" />
        <path d="M12 12v6" /><path d="M9 15h6" />
      </svg>
      <span>병원 소개</span>
    </a>
    <a href="cases.html" data-nav="cases">
      <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="1.5" />
        <path d="M3 9h18" /><path d="M9 9v12" />
      </svg>
      <span>치료 사례</span>
    </a>
    <a href="calculator.html" data-nav="calc" class="t-nav-highlight">
      <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 4l16 16" /><path d="M4 4v16h16" /><path d="M9 14l3-3 3 3" /><path d="M12 11V4" />
      </svg>
      <span>예상키 측정</span>
    </a>
  </nav>

  <div class="t-modal" id="tCalcModal" role="dialog" aria-modal="true" aria-labelledby="tCalcTitle">
    <div class="t-calc">
      <button type="button" class="t-modal-close" data-close-modal aria-label="닫기">✕</button>
      <div id="tCalcForm">
        <div class="calc-header">
          <span class="badge">성장 진단 · 무료</span>
          <h2 id="tCalcTitle">우리 아이 예상 키</h2>
          <p>성장판이 닫히기 전 골든타임 진단.<br>30초 안에 18세 예상 성인 키를 확인하세요.</p>
        </div>
        <div style="margin-top:18px">
          <label class="field-label">성별</label>
          <div class="gender-row">
            <button type="button" class="gender-btn active" data-gender="male">👦 남아</button>
            <button type="button" class="gender-btn" data-gender="female">👧 여아</button>
          </div>
        </div>
        <div style="margin-top:14px">
          <label class="field-label">생년월일</label>
          <input type="date" id="tCalcBirth">
        </div>
        <div class="row-2" style="margin-top:14px">
          <div>
            <label class="field-label">현재 키 (cm)</label>
            <input type="number" id="tCalcHeight" step="0.1" min="50" max="220" placeholder="120.5">
          </div>
          <div>
            <label class="field-label">몸무게 (kg)</label>
            <input type="number" id="tCalcWeight" step="0.1" min="5" max="200" placeholder="25.0">
          </div>
        </div>
        <button type="button" class="calc-btn" id="tCalcSubmit" disabled>예상키 계산하기</button>
      </div>
      <div class="t-result" id="tCalcResult">
        <div class="hero-card">
          <div class="label">예상 성인 키</div>
          <div class="number"><span id="tResultHeight">0</span><span class="unit"> cm</span></div>
          <div class="meta">
            <span class="pill solid">상위 <span id="tResultPercentile">50</span>%</span>
            <span class="pill outline" id="tResultGender">남아</span>
          </div>
        </div>
        <svg class="t-result-chart" id="tResultChart" viewBox="0 0 320 180" preserveAspectRatio="none" aria-hidden="true"></svg>
        <div class="interpretation" id="tResultInterpret"></div>
        <div class="note">
          <strong>참고:</strong> WHO/KDCA 표준 성장도표 기반 통계 추정치입니다. 실제 성장은 영양·수면·운동 등 환경 요인에 따라 달라질 수 있어요.
        </div>
        <a class="kakao-cta" href="https://pf.kakao.com/_ZxneSb" target="_blank" rel="noopener">💬 카톡 1:1 상담받기</a>
        <button type="button" class="reset-btn" id="tCalcReset">다시 측정하기</button>
      </div>
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
        showToast('링크가 복사되었습니다');
      } catch (e) {
        showToast('공유 실패');
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

  // ============= RESULT CHART (SVG line chart) =============
  // 현재 키부터 18세까지 동일 백분위 유지 가정한 곡선.
  // calculator.html 과 모달 양쪽에서 #tResultChart 또는 #calcResultChart 로 호출.
  function drawHeightChart(currentH, currentAge, adultH, gender) {
    // calc 전용 페이지에서는 #calcResultChart 가 메인. 그 외 페이지에서는 모달 안의 #tResultChart.
    const isCalcPage = document.body.dataset.page === 'calc';
    const svg = isCalcPage
      ? (document.getElementById('calcResultChart') || document.getElementById('tResultChart'))
      : (document.getElementById('tResultChart') || document.getElementById('calcResultChart'));
    if (!svg) return;
    const VB_W = 320, VB_H = 180;
    const PAD_L = 38, PAD_R = 12, PAD_T = 18, PAD_B = 28;
    const plotW = VB_W - PAD_L - PAD_R;
    const plotH = VB_H - PAD_T - PAD_B;
    const startAge = Math.max(2, Math.floor(currentAge * 2) / 2);
    const endAge = 18;
    const ageSpan = endAge - startAge;

    // 동일 백분위 유지 곡선: 매 0.5세마다 predictAdultHeight 사용해서 18세 시점 추정.
    // 시각화는 startAge → 18세까지 LMS 기반 동일 백분위 체인.
    const table = gender === 'male' ? MALE_HEIGHT_LMS : FEMALE_HEIGHT_LMS;
    const lmsAt = (a) => interpolateLMS(a, table);
    const startLms = lmsAt(currentAge);
    const startZ = zScoreFromLMS(currentH, startLms);
    function heightAtAge(a) {
      const lms = lmsAt(a);
      if (Math.abs(lms.L) < 0.001) return lms.M * Math.exp(lms.S * startZ);
      const inside = 1 + lms.L * lms.S * startZ;
      if (inside <= 0) return lms.M;
      return lms.M * Math.pow(inside, 1 / lms.L);
    }
    const points = [];
    for (let a = startAge; a <= endAge + 0.001; a += 0.5) {
      points.push({ age: a, h: heightAtAge(a) });
    }
    const minH = Math.min(...points.map(p => p.h)) - 4;
    const maxH = Math.max(...points.map(p => p.h)) + 4;
    const hSpan = maxH - minH;
    const xOf = (a) => PAD_L + ((a - startAge) / ageSpan) * plotW;
    const yOf = (h) => PAD_T + (1 - (h - minH) / hSpan) * plotH;

    // Build path d
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.age).toFixed(1)},${yOf(p.h).toFixed(1)}`).join(' ');
    // 50th percentile reference (median)
    const medianPath = points.map((p, i) => {
      const lms = lmsAt(p.age);
      return `${i === 0 ? 'M' : 'L'}${xOf(p.age).toFixed(1)},${yOf(lms.M).toFixed(1)}`;
    }).join(' ');

    const ageTicks = [];
    for (let a = Math.ceil(startAge); a <= endAge; a += 2) ageTicks.push(a);
    if (!ageTicks.includes(endAge)) ageTicks.push(endAge);

    svg.innerHTML = `
      <defs>
        <linearGradient id="tHeroGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4A2D6B" stop-opacity="0.20"/>
          <stop offset="100%" stop-color="#4A2D6B" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line x1="${PAD_L}" y1="${PAD_T + plotH}" x2="${VB_W - PAD_R}" y2="${PAD_T + plotH}" stroke="#e8e2d8" stroke-width="1"/>
      <line x1="${PAD_L}" y1="${PAD_T}" x2="${PAD_L}" y2="${PAD_T + plotH}" stroke="#e8e2d8" stroke-width="1"/>
      <path d="${medianPath}" fill="none" stroke="#8a8580" stroke-width="1" stroke-dasharray="2 3" opacity="0.55"/>
      <path d="${path} L${xOf(endAge).toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${xOf(startAge).toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z" fill="url(#tHeroGrad)"/>
      <path d="${path}" fill="none" stroke="#4A2D6B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${xOf(startAge).toFixed(1)}" cy="${yOf(currentH).toFixed(1)}" r="3.5" fill="#fff" stroke="#4A2D6B" stroke-width="1.5"/>
      <circle cx="${xOf(endAge).toFixed(1)}" cy="${yOf(adultH).toFixed(1)}" r="4" fill="#4A2D6B"/>
      <text x="${xOf(endAge).toFixed(1)}" y="${(yOf(adultH) - 8).toFixed(1)}" text-anchor="end" font-size="10.5" font-weight="700" fill="#4A2D6B">${adultH.toFixed(1)}cm</text>
      <text x="${xOf(startAge).toFixed(1)}" y="${(yOf(currentH) - 8).toFixed(1)}" text-anchor="start" font-size="9.5" fill="#8a8580">현재 ${currentH}cm</text>
      ${ageTicks.map(a => `<text x="${xOf(a).toFixed(1)}" y="${(VB_H - 10).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="#8a8580">${a}세</text>`).join('')}
      <text x="${(PAD_L - 6).toFixed(1)}" y="${(PAD_T + 8).toFixed(1)}" text-anchor="end" font-size="9" fill="#8a8580">${maxH.toFixed(0)}</text>
      <text x="${(PAD_L - 6).toFixed(1)}" y="${(PAD_T + plotH).toFixed(1)}" text-anchor="end" font-size="9" fill="#8a8580">${minH.toFixed(0)}</text>
    `;
  }
  // calculator.html inline script 도 그래프 그릴 수 있게 노출.
  window.t.drawHeightChart = drawHeightChart;

  // ============= CALCULATOR MODAL =============
  // 30일 만료 — 같은 사용자가 광고 재방문 시에도 너무 차갑지 않게 다시 한 번 노출.
  const SEEN_KEY = 't.calc.modal.seen';
  const SEEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const modal = document.getElementById('tCalcModal');
  const formEl = document.getElementById('tCalcForm');
  const resultEl = document.getElementById('tCalcResult');
  const submitBtn = document.getElementById('tCalcSubmit');
  const birthInput = document.getElementById('tCalcBirth');
  const heightInput = document.getElementById('tCalcHeight');
  const weightInput = document.getElementById('tCalcWeight');
  let gender = 'male';

  function openCalcModal() {
    if (!modal) return;
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

  function validateForm() {
    if (!submitBtn) return;
    submitBtn.disabled = !(birthInput.value && heightInput.value && weightInput.value);
  }
  [birthInput, heightInput, weightInput].forEach((el) => {
    if (el) el.addEventListener('input', validateForm);
  });

  document.querySelectorAll('.gender-btn').forEach((b) => {
    b.addEventListener('click', () => {
      gender = b.dataset.gender;
      document.querySelectorAll('.gender-btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    });
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (submitBtn.disabled) return;
      const { decimal: age } = window.t.calc.calculateAge(birthInput.value);
      const height = parseFloat(heightInput.value);
      const adultHeight = window.t.calc.predictAdultHeight(height, age, gender);
      const adultPctile = window.t.calc.calcPercentile(adultHeight, 18, gender);
      document.getElementById('tResultHeight').textContent = adultHeight.toFixed(1);
      document.getElementById('tResultPercentile').textContent = Math.round(adultPctile);
      document.getElementById('tResultGender').textContent = gender === 'male' ? '남아' : '여아';
      let msg;
      if (adultPctile >= 75) {
        msg = '✅ 또래 평균 이상으로 성장할 가능성이 높아요. 지금 페이스를 유지하는 것이 중요합니다.';
      } else if (adultPctile >= 50) {
        msg = '🔍 또래 평균 수준이에요. 환경 요인을 잘 관리하면 더 좋은 결과를 기대할 수 있어요.';
      } else if (adultPctile >= 25) {
        msg = '⚠️ 또래보다 약간 작을 수 있어요. 성장판이 닫히기 전 골든타임 진단을 권해드려요.';
      } else {
        msg = '🚨 또래 대비 많이 작을 수 있어요. 골연령·호르몬 정밀 진단으로 원인을 빨리 찾는 것이 중요합니다.';
      }
      document.getElementById('tResultInterpret').textContent = msg;
      drawHeightChart(height, age, adultHeight, gender);
      formEl.style.display = 'none';
      resultEl.classList.add('is-shown');
    });
  }

  const resetBtn = document.getElementById('tCalcReset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      formEl.style.display = '';
      resultEl.classList.remove('is-shown');
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach((b) => {
    b.addEventListener('click', closeCalcModal);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) closeCalcModal();
  });

  // Auto-open policy
  // - calc 전용 페이지에선 skip (이미 같은 폼이 페이지 자체).
  // - 30일 이내 본 적 있으면 skip.
  // - 광고 클릭 (UTM `utm_medium=cpc`/`paid`) 진입은 즉시 오픈 — 콜드 트래픽 의도.
  // - 그 외엔 스크롤 200px 또는 1.5초 중 빨리 오는 것 (사용자가 페이지 인지한 뒤).
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
  if (!isCalcPage && !alreadySeen) {
    const params = new URLSearchParams(window.location.search);
    const fromAd = ['cpc', 'paid', 'paid_social'].includes(params.get('utm_medium') || '');
    if (fromAd) {
      setTimeout(openCalcModal, 600);
    } else {
      let opened = false;
      const trigger = () => {
        if (opened) return;
        opened = true;
        window.removeEventListener('scroll', onScroll);
        clearTimeout(fallbackTimer);
        openCalcModal();
      };
      const onScroll = () => { if (window.scrollY > 200) trigger(); };
      window.addEventListener('scroll', onScroll, { passive: true });
      const fallbackTimer = setTimeout(trigger, 1500);
    }
  }
})();
