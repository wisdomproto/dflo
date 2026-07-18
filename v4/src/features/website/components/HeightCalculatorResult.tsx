// ================================================
// HeightCalculatorResult - 예상키 측정 결과 모달
// 애니메이션: 카운트업 숫자 + 선 그리기 + 포인트 팝
// ================================================

import { useMemo, useState, useEffect, useRef } from 'react';
import { heightAtSamePercentile, getHeightStandard, type GrowthStandard } from '@/shared/data/growthStandard';
import { InfoModal } from './InfoModal';
import { trackKakaoConsult } from '@/shared/lib/analytics';
import { getCalcLabels, type CalcLang } from './calcLabels';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/_mxbWxfX';

// 언어별 메신저 CTA (i18n/messenger.yml 과 동일). th 는 LINE OA, 나머지는 KakaoTalk.
const MESSENGER: Record<CalcLang, { url: string; bgClass: string; fgClass: string; hoverClass: string }> = {
  ko: { url: KAKAO_URL, bgClass: 'bg-[#FEE500]', fgClass: 'text-[#3C1E1E]', hoverClass: 'hover:bg-[#FDD800]' },
  vi: { url: KAKAO_URL, bgClass: 'bg-[#FEE500]', fgClass: 'text-[#3C1E1E]', hoverClass: 'hover:bg-[#FDD800]' },
  en: { url: 'https://wa.me/821066932838?text=Hi%2C%20I%20would%20like%20a%20growth%20consultation%20for%20my%20child.', bgClass: 'bg-[#25D366]', fgClass: 'text-white', hoverClass: 'hover:brightness-95' },
  th: { url: 'https://line.me/R/ti/p/%40894qhqtu', bgClass: 'bg-[#06C755]', fgClass: 'text-white', hoverClass: 'hover:brightness-95' },
  // 중국어(대만·화교) = WhatsApp, messenger.yml 과 동일한 중국어 프리필.
  'zh-hant': { url: 'https://wa.me/821066932838?text=%E6%82%A8%E5%A5%BD%EF%BC%8C%E6%88%91%E6%83%B3%E7%82%BA%E5%AD%A9%E5%AD%90%E8%AB%AE%E8%A9%A2%E7%94%9F%E9%95%B7%E5%95%8F%E9%A1%8C%E3%80%82', bgClass: 'bg-[#25D366]', fgClass: 'text-white', hoverClass: 'hover:brightness-95' },
  'zh-hans': { url: 'https://wa.me/821066932838?text=%E6%82%A8%E5%A5%BD%EF%BC%8C%E6%88%91%E6%83%B3%E4%B8%BA%E5%AD%A9%E5%AD%90%E5%92%A8%E8%AF%A2%E7%94%9F%E9%95%BF%E9%97%AE%E9%A2%98%E3%80%82', bgClass: 'bg-[#25D366]', fgClass: 'text-white', hoverClass: 'hover:brightness-95' },
  // 아랍어(MENA) = WhatsApp, messenger.yml 과 동일한 아랍어 프리필.
  ar: { url: 'https://wa.me/821066932838?text=%D9%85%D8%B1%D8%AD%D8%A8%D9%8B%D8%A7%D8%8C%20%D8%A3%D9%88%D8%AF%D9%91%20%D8%A7%D8%B3%D8%AA%D8%B4%D8%A7%D8%B1%D8%A9%20%D8%A8%D8%B4%D8%A3%D9%86%20%D9%86%D9%85%D9%88%20%D8%B7%D9%81%D9%84%D9%8A.', bgClass: 'bg-[#25D366]', fgClass: 'text-white', hoverClass: 'hover:brightness-95' },
};

// 성장 골든타임 — 원장 저서(1장) 기준. 나이를 딱 박지 않고 range 로(여 9~11 / 남 11~14),
// 위치 문구는 "늦었다" 뉘앙스 없이 항상 "지금 할 수 있는 게 있다"로 끝나게.
function goldenTimeInfo(gender: 'male' | 'female', age: number) {
  const female = gender === 'female';
  const lo = female ? 9 : 11;
  const hi = female ? 11 : 14;
  const who = female ? '여자아이' : '남자아이';
  let position: string;
  if (age < lo) position = '아직 골든타임 전이에요 — 지금부터 준비하면 가장 좋습니다.';
  else if (age <= hi) position = '지금이 바로 그 골든타임 시기예요.';
  else position = female
    ? '골든타임 후반이라, 남은 성장 시간을 잘 활용하는 게 중요해요.'
    : '남아는 만 17세까지 자랄 수 있어요 — 남은 시간을 잘 쓰는 게 중요합니다.';
  return { lo, hi, who, position };
}

export interface HeightResult {
  predicted: number;
  percentile: number;
  age: number;
  currentHeight: number;
  gender: 'male' | 'female';
  /** 성장 표준 (예측 경로·배경 백분위 곡선에 동일 적용). 기본 'KR'. */
  standard?: GrowthStandard;
}

interface Props {
  result: HeightResult;
  isOpen: boolean;
  onClose: () => void;
  /** Render result inline as a page (no modal overlay). Used by /calc-embed. */
  embedded?: boolean;
  /** Locale for UI labels. Default 'ko'. */
  lang?: CalcLang;
}

/** Count-up hook: animates from 0 to target over duration ms */
function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) { setValue(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(eased * target);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, active]);

  return value;
}

export function HeightCalculatorResult({ result, isOpen, onClose, embedded = false, lang = 'ko' }: Props) {
  const [phase, setPhase] = useState(0); // 0=init, 1=countUp, 2=chart, 3=done
  const [drawnPoints, setDrawnPoints] = useState(0); // how many path points are visible
  const [desired, setDesired] = useState(''); // 희망 키(선택) — 설문으로 넘겨 프리필
  const chartRef = useRef<ChartJS<'line'>>(null);
  const t = getCalcLabels(lang);
  const messenger = MESSENGER[lang] || MESSENGER.ko;
  // 표준별 차트 출처 — en 계산기는 국적(KR/TH/CN)에 따라 다름. natFooter 없으면 기본 chartFooter.
  const chartFooter = t.natFooter?.[result.standard ?? 'KR'] ?? t.chartFooter;

  const allPathPoints = useMemo(() => {
    const startAge = Math.ceil(result.age * 2) / 2;
    const points: { x: number; y: number }[] = [
      { x: Math.round(result.age * 2) / 2, y: result.currentHeight },
    ];
    for (let a = startAge + 0.5; a <= 17.5; a += 0.5) {
      const h = heightAtSamePercentile(result.currentHeight, result.age, a, result.gender, result.standard);
      if (h > 0) points.push({ x: a, y: h });
    }
    points.push({ x: 18, y: result.predicted });
    return points;
  }, [result]);

  // Reset phases when modal opens
  useEffect(() => {
    if (!isOpen) { setPhase(0); setDrawnPoints(0); return; }
    // Phase 1: count-up immediately
    setPhase(1);
    // Phase 2: show chart background + start progressive line drawing
    const t2 = setTimeout(() => {
      setPhase(2);
      setDrawnPoints(1); // show first point (current height)
    }, 800);
    return () => clearTimeout(t2);
  }, [isOpen]);

  // Progressive line drawing: add one point at a time
  useEffect(() => {
    if (phase < 2 || drawnPoints === 0) return;
    if (drawnPoints >= allPathPoints.length) {
      // All points drawn → phase 3 (done)
      const t = setTimeout(() => setPhase(3), 300);
      return () => clearTimeout(t);
    }
    // Add next point after interval (faster for more points)
    const interval = Math.max(80, 1200 / allPathPoints.length);
    const t = setTimeout(() => setDrawnPoints((p) => p + 1), interval);
    return () => clearTimeout(t);
  }, [phase, drawnPoints, allPathPoints.length]);

  const countUp = useCountUp(result.predicted, 1200, phase >= 1);

  // Currently visible path points
  const pathPoints = allPathPoints.slice(0, drawnPoints);

  const chartData = useMemo(() => {
    const standard = getHeightStandard(result.gender, result.standard);
    const filtered = standard.filter((d) => d.age >= 3 && d.age <= 18);
    const toXY = (vals: number[]) => filtered.map((d, i) => ({ x: d.age, y: vals[i] }));

    return {
      datasets: [
        // Background percentile lines (always visible)
        {
          label: '95th',
          data: toXY(filtered.map((d) => d.p95)),
          borderColor: 'rgba(239,68,68,0.3)',
          borderWidth: 1.5, borderDash: [4, 4] as number[],
          pointRadius: 0, fill: false, tension: 0.3,
        },
        {
          label: '50th',
          data: toXY(filtered.map((d) => d.p50)),
          borderColor: 'rgba(34,197,94,0.5)',
          borderWidth: 2, borderDash: [6, 3] as number[],
          pointRadius: 0, fill: false, tension: 0.3,
        },
        {
          label: '5th',
          data: toXY(filtered.map((d) => d.p5)),
          borderColor: 'rgba(59,130,246,0.3)',
          borderWidth: 1.5, borderDash: [4, 4] as number[],
          pointRadius: 0, fill: false, tension: 0.3,
        },
        // Prediction path — progressive line drawing (points added one by one)
        ...(pathPoints.length > 0 ? [{
          label: t.chartPathLegend,
          data: pathPoints,
          borderColor: '#0F6E56',
          backgroundColor: 'rgba(15,110,86,0.06)',
          borderWidth: 2.5,
          borderDash: [] as number[],
          pointRadius: pathPoints.map((_, i) => {
            const isFirst = i === 0;
            const isLast = i === pathPoints.length - 1 && drawnPoints >= allPathPoints.length;
            return isFirst ? 8 : isLast ? 10 : 2;
          }),
          pointBackgroundColor: pathPoints.map((_, i) => {
            const isFirst = i === 0;
            const isLast = i === pathPoints.length - 1 && drawnPoints >= allPathPoints.length;
            return isFirst ? '#0F6E56' : isLast ? '#F59E0B' : 'rgba(15,110,86,0.3)';
          }),
          pointBorderColor: pathPoints.map((_, i) => {
            const isLast = i === pathPoints.length - 1 && drawnPoints >= allPathPoints.length;
            return isLast ? '#D97706' : 'rgba(15,110,86,0.3)';
          }),
          pointBorderWidth: pathPoints.map((_, i) => {
            const isLast = i === pathPoints.length - 1 && drawnPoints >= allPathPoints.length;
            return isLast ? 2 : 0;
          }),
          pointStyle: pathPoints.map((_, i) => {
            const isLast = i === pathPoints.length - 1 && drawnPoints >= allPathPoints.length;
            return isLast ? 'star' as const : 'circle' as const;
          }),
          fill: true,
          tension: 0.4,
        }] : []),
      ],
    };
  }, [result, pathPoints, drawnPoints, allPathPoints.length, t]);

  const options: Parameters<typeof Line>[0]['options'] = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1 / 1.4,
    animation: false as const,  // Disable — we animate by progressively adding points
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          boxWidth: 14, font: { size: 12 }, padding: 10,
          filter: (item) => !item.text?.includes('hidden'),
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ctx.parsed.y != null ? `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}cm` : '',
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: { display: true, text: t.chartXAxis, font: { size: 13 } },
        min: 3, max: 18,
        ticks: { stepSize: 1, font: { size: 12 }, callback: (val) => Number.isInteger(Number(val)) ? `${val}` : '' },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: t.chartYAxis, font: { size: 13 } },
        min: 70, max: 185,
        ticks: { font: { size: 12 }, stepSize: 10 },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  }), [phase, t]);

  const interpretation = result.percentile >= 75
    ? t.interpretHigh
    : result.percentile >= 50
      ? t.interpretMid
      : result.percentile >= 25
        ? t.interpretLow
        : t.interpretCritical;

  const ageYears = Math.floor(result.age);
  const ageMonths = Math.round((result.age % 1) * 12);

  // 예약하기(콜백) — 결과는 iframe(/calc.html) 이라 부모 페이지 _shell.js 의 예약 오버레이를
  // postMessage 로 연다(measurement 이벤트와 동일 채널). ko 전용.
  const openReservation = () => {
    try {
      (window.parent || window).postMessage({ type: 'open_reservation', source: 'height_calc_result' }, '*');
    } catch { /* iframe 밖이면 무시 */ }
  };

  const body = (
    <>
      <div className="space-y-5 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">{t.resultTitle}</h2>

        {/* Main result — count-up animation */}
        <div className="bg-[#E8F5F0] rounded-2xl p-5 md:p-6 text-center space-y-2">
          <p className="text-sm md:text-base font-medium text-[#0F6E56]">{t.resultLabel}</p>
          <p className="text-5xl md:text-6xl font-black text-[#0F6E56] leading-none transition-all">
            {countUp.toFixed(1)} <span className="text-2xl md:text-3xl">cm</span>
          </p>
          <div className={`flex justify-center gap-2 flex-wrap text-xs md:text-sm transition-opacity duration-500 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
            <span className="rounded-full bg-[#0F6E56] text-white font-semibold px-3 py-1">
              {result.gender === 'male' ? t.resultGenderMale : t.resultGenderFemale} · {t.pillAge(ageYears, ageMonths)}
            </span>
            <span className="rounded-full bg-white text-[#0F6E56] font-semibold px-3 py-1">
              {t.pillCurrent(result.currentHeight, result.percentile)}
            </span>
          </div>
        </div>

        {/* Chart — line drawing animation. PC 에선 너무 길어지지 않게 폭 제한(1:1.4 비율) */}
        <div className={`transition-opacity duration-500 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="md:max-w-md md:mx-auto">
            <Line ref={chartRef} data={chartData} options={options} />
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 text-center mt-1">
            {chartFooter}
          </p>
        </div>

        {/* Interpretation — fade in at end */}
        <div className={`bg-amber-50 rounded-xl p-4 md:p-5 space-y-1.5 transition-all duration-700 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-xs md:text-sm font-bold text-amber-800">{t.interpretH}</p>
          <p className="text-xs md:text-sm text-amber-700 leading-relaxed break-keep">{interpretation}</p>
        </div>

        {/* 성장 골든타임 — ko 전용. 예측키(추세)만으론 부족 → "언제 관리해야 하나"로 동기 부여.
            나이를 딱 박지 않고 range + "중고등 기다리면 늦다" 오해 반박(원장 저서 근거). */}
        {lang === 'ko' && phase >= 3 && (() => {
          const g = goldenTimeInfo(result.gender, result.age);
          return (
            <div className="rounded-xl border border-[#0F6E56]/20 bg-[#F2FBF8] p-4 md:p-5 space-y-2">
              <p className="text-sm md:text-base font-bold text-[#0F6E56]">⏳ 성장 골든타임, 지금 어디쯤일까요?</p>
              <p className="text-xs md:text-sm text-gray-700 leading-relaxed break-keep">
                {g.who} 성장 골든타임은 대략 <b>만 {g.lo}~{g.hi}세</b> — 사춘기 급성장 전후로 최종 키의 상당 부분이 이 시기에 결정됩니다. {g.position}
              </p>
              <p className="text-xs md:text-sm text-gray-500 leading-relaxed break-keep">
                “중학교·고등학교 가서 크겠지”는 골든타임을 놓치는 가장 흔한 오해예요. 관리는 그 <b>전에</b> 시작해야 합니다.
              </p>
            </div>
          );
        })()}

        {/* Methodology note + Kakao CTA — fade in at end */}
        <div className={`space-y-2.5 md:space-y-3 transition-all duration-700 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-gray-50 rounded-xl p-4 md:p-5 space-y-2 text-xs md:text-sm text-gray-600 leading-relaxed break-keep">
            <p><strong>{t.noteBoxPrincipleLabel}</strong> {t.noteBoxPrincipleBody}</p>
            <p><strong>{t.noteBoxPredictedLabel}</strong> {t.noteBoxPredictedBody}</p>
            <p><strong>{t.noteBoxCautionLabel}</strong> {t.noteBoxCautionBody}</p>
          </div>

          {/* 걱정→행동 맥락 — 백분위로 분기(하위 50% 미만=걱정 / 이상=최적화).
              둘 다 "숫자만으론 부족 → 상담" 갈증을 만들고, 바로 아래 hero CTA(카톡)로 흐르게 배치. */}
          <p className="text-sm md:text-base text-gray-700 text-center leading-relaxed break-keep px-2 font-medium">
            {result.percentile < 50 ? t.ctaContextConcern : t.ctaContextOptimize}
          </p>

          {/* 🎯 희망키 → 설문 유도 (ko 전용). 골든타임에 이어 "목표까지 갈 수 있나?" 갈증 → 설문/리포트.
              입력한 희망키는 dh 파라미터로 설문(step3 desiredHeight)에 프리필. iframe 탈출 target=_top. */}
          {lang === 'ko' && (
            <div className="rounded-xl border border-[#0F6E56]/30 bg-[#F2FBF8] p-4 space-y-3">
              <label htmlFor="desiredHeight" className="block text-sm md:text-base font-bold text-[#0F6E56]">
                🎯 목표(희망) 키가 있으세요? <span className="font-medium text-gray-400">(선택)</span>
              </label>
              <div className="flex items-center gap-2">
                <input id="desiredHeight" type="number" inputMode="numeric" value={desired}
                  onChange={(e) => setDesired(e.target.value)} placeholder="예: 175"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-base focus:outline-none focus:border-[#0F6E56]" />
                <span className="text-sm text-gray-500 shrink-0">cm</span>
              </div>
              <a
                href={`/diagnosis?g=${result.gender}&h=${result.currentHeight}&age=${result.age.toFixed(2)}&ph=${result.predicted.toFixed(1)}&pct=${result.percentile.toFixed(1)}&std=${result.standard ?? 'KR'}&lang=${lang}${desired ? `&dh=${encodeURIComponent(desired)}` : ''}`}
                target="_top"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#0F6E56] py-3.5 md:py-4 text-white font-bold text-base md:text-lg hover:brightness-105 active:scale-[0.98] transition-all">
                🎯 희망키까지 갈 수 있을까요? 정밀 리포트
              </a>
            </div>
          )}

          {/* ① Hero CTA — 카톡/메신저 상담 (전 언어 primary). th=LINE, en=WhatsApp, ko/vi=KakaoTalk */}
          <a href={messenger.url} target="_blank" rel="noopener noreferrer"
            onClick={() => trackKakaoConsult('height_calc_result')}
            className={`flex items-center justify-center gap-2 w-full rounded-xl ${messenger.bgClass} py-4 md:py-5
                       ${messenger.fgClass} font-bold text-lg md:text-xl shadow-sm ${messenger.hoverClass} active:scale-[0.98] transition-all`}>
            {t.kakaoCta}
          </a>

          {/* ①-b 예약하기 — 카톡이 부담스러운 사람용 콜백(번호 남기면 병원이 연락). ko 전용.
              카톡(hero, 노랑)과 나란한 상담 동선이라 바로 아래·솔리드 버튼. 결과는 iframe 이라
              부모 _shell.js 예약 오버레이를 postMessage 로 오픈. */}
          {lang === 'ko' && (
            <button type="button" onClick={openReservation}
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-[#0F6E56]/40 py-2.5 md:py-3
                         text-[#0F6E56] font-semibold text-sm md:text-base hover:bg-[#0F6E56]/5 active:scale-[0.98] transition-all">
              📞 번호 남기고 예약 (전화·문자로 연락드려요)
            </button>
          )}

          {/* ③ 3차 — 공개 치료사례 텍스트 링크(제일 작게). iframe 임베드라 target=_top 으로 부모 프레임 이동 */}
          <a href={`/${lang}/cases.html`} target="_top"
            className="flex items-center justify-center w-full text-center text-xs md:text-sm
                       text-[#4A2D6B] font-semibold underline underline-offset-4 py-2 hover:text-[#3A2255] transition-colors">
            {t.casesLink}
          </a>

          {/* Reset button — embedded mode only (modal mode uses close button) */}
          {embedded && (
            <button onClick={onClose}
              className="w-full text-center text-xs md:text-sm text-gray-500 underline underline-offset-4 py-2 hover:text-gray-700">
              {t.reset}
            </button>
          )}
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div className="max-w-lg md:max-w-2xl mx-auto p-5 md:p-8 bg-white">{body}</div>;
  }

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} title="">
      {body}
    </InfoModal>
  );
}
