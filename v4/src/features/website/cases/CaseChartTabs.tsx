// 치료사례 차트 — 성장곡선 ↔ 예측키 추세 탭. 렌더러는 진료 화면·후보 페이지와 같은 모듈을 재사용.
// 예측키 탭 하단 스트립이 곧 "뼈나이 회차"(실제 나이/뼈나이/차이) 축이다.
import { useEffect, useMemo, useRef, useState } from 'react';
import { renderGrowth, renderTrend, type CaseData } from '@/features/hospital/lib/caseChartsStandalone';
import { TEXT, type CaseLang } from './casesText';

type Tab = 'growth' | 'trend';
type ChartCanvas = HTMLCanvasElement & { _chart?: { destroy: () => void } };

// renderTrend 가 그린 x축 스트립을 환자용으로 다듬는다.
//  ① 회차마다 붙던 '추적' 배지 줄을 떼어 모든 칸을 3줄로 맞추고(줄이 어긋나면 라벨과 안 맞음)
//  ② 차트 y축 폭(46px)을 첫 열로 돌려 "실제 나이 / 뼈나이 / 차이" 라벨을 넣는다 — 숫자만 3줄이면 뭘 보는지 모른다.
const AXIS_W = 46;
function addAxisLabels(grid: HTMLElement, lang: CaseLang) {
  if (!grid.children.length) return;
  const t = TEXT[lang];
  for (const cell of [...grid.children]) {
    const badge = cell.querySelector('div');
    if (badge && badge.textContent === '추적') badge.remove();
    for (const line of cell.querySelectorAll('div')) {
      if (!line.textContent) continue;
      // 라벨이 생겼으니 칸마다 붙던 "만 "·"뼈 " 접두사는 중복 — 숫자만 남긴다.
      let s = line.textContent.replace(/^(만|뼈)\s+/, '');
      if (lang === 'en') s = s.replace(/(\d+)세/g, '$1y').replace(/(\d+)개월/g, '$1m').replace(/(\d+)년/g, '$1y');
      line.textContent = s;
    }
  }
  const label = document.createElement('div');
  label.style.cssText = 'text-align:left;line-height:1.35;font-size:10px;font-weight:700;color:#94a3b8';
  label.innerHTML =
    `<div>${t.axisAge}</div><div style="color:#f97316">${t.axisBone}</div><div style="color:#475569">${t.axisGap}</div>`;
  grid.style.paddingLeft = '0px';
  grid.style.gridTemplateColumns = `${AXIS_W}px repeat(${grid.children.length}, minmax(0, 1fr))`;
  grid.prepend(label);
}

export function CaseChartTabs({ data, lang }: { data: CaseData; lang: CaseLang }) {
  const [tab, setTab] = useState<Tab>('growth');
  const canvasRef = useRef<ChartCanvas>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const rounds = data.measurements.filter((m) => m.bone_age != null).length;
  const t = TEXT[lang];
  const chartData = useMemo(() => ({ ...data, labels: t.chart }), [data, t]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv._chart?.destroy();
    if (tab === 'growth') {
      renderGrowth(cv, chartData);
      // renderTrend 가 남긴 인라인 display:grid 는 Tailwind `hidden` 클래스를 이긴다 → 인라인으로 지운다.
      if (gridRef.current) {
        gridRef.current.style.cssText = 'display:none';
        gridRef.current.innerHTML = '';
      }
    } else if (gridRef.current) {
      renderTrend(cv, gridRef.current, chartData);
      addAxisLabels(gridRef.current, lang);
    }
    return () => cv._chart?.destroy();
  }, [tab, chartData, lang]);

  return (
    <div>
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {([['growth', t.tabGrowth], ['trend', t.tabTrend]] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg py-2 text-[13px] font-bold transition ${
              tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {/* 예측키 탭은 회차 수만큼 폭이 필요해 가로 스크롤 — 차트와 하단 회차 축이 같이 움직여야 열이 맞는다. */}
      <div className="mt-3 overflow-x-auto">
        <div style={tab === 'trend' ? { minWidth: `${Math.max(280, rounds * 64 + AXIS_W + 12)}px` } : undefined}>
          <div className="h-[280px]">
            <canvas ref={canvasRef} />
          </div>
          <div ref={gridRef} className="mt-2" />
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        {tab === 'growth' ? t.growthCaption : t.trendCaption}
      </p>
    </div>
  );
}
