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

// Expose LMS helpers for inline page scripts (e.g. calculator.html)
window.t = window.t || {};
window.t.calc = { calculateAge, calcPercentile, predictAdultHeight };

// ============= SHELL MARKUP INJECTION =============
const SHELL_HTML = `
  <header class="t-header" role="banner">
    <a href="index.html" class="logo-wrap" aria-label="홈으로">
      <img class="logo" src="/images/logo.jpg" alt="187 성장클리닉">
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
  </header>

  <nav class="t-bottom-nav" aria-label="메인 메뉴">
    <a href="index.html" data-nav="programs">
      <span class="icon">📘</span>
      <span>프로그램 소개</span>
    </a>
    <a href="clinic.html" data-nav="clinic">
      <span class="icon">🏥</span>
      <span>병원 소개</span>
    </a>
    <a href="calculator.html" data-nav="calc">
      <span class="icon">📐</span>
      <span>예상키 측정</span>
    </a>
    <a href="cases.html" data-nav="cases">
      <span class="icon">📊</span>
      <span>치료 사례</span>
    </a>
  </nav>

  <a class="t-kakao" href="https://pf.kakao.com/_ZxneSb" target="_blank" rel="noopener" aria-label="카카오톡 1:1 상담">
    <span aria-hidden="true">💬</span>
    <span class="label">카톡 상담</span>
  </a>
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
})();
