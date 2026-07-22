// 치료사례 차트 — 성장곡선 ↔ 예측키 추세 탭. 렌더러는 진료 화면·후보 페이지와 같은 모듈을 재사용.
// 예측키 탭 하단 그리드가 곧 "뼈나이 회차"(만나이/뼈나이/격차) 표다.
import { useEffect, useRef, useState } from 'react';
import { renderGrowth, renderTrend, type CaseData } from '@/features/hospital/lib/caseChartsStandalone';

type Tab = 'growth' | 'trend';
type ChartCanvas = HTMLCanvasElement & { _chart?: { destroy: () => void } };

const TABS: { id: Tab; label: string }[] = [
  { id: 'growth', label: '성장 곡선' },
  { id: 'trend', label: '예측키 추세' },
];

// renderTrend 가 그린 x축 스트립을 환자용으로 다듬는다.
//  ① 회차마다 붙던 '추적' 배지 줄을 떼어 모든 칸을 3줄로 맞추고(줄이 어긋나면 라벨과 안 맞음)
//  ② 차트 y축 폭(46px)을 첫 열로 돌려 "실제 나이 / 뼈나이 / 차이" 라벨을 넣는다 — 숫자만 3줄이면 뭘 보는지 모른다.
const AXIS_W = 46;
function addAxisLabels(grid: HTMLElement) {
  if (!grid.children.length) return;
  for (const cell of [...grid.children]) {
    const badge = cell.querySelector('div');
    if (badge && badge.textContent === '추적') badge.remove();
    // 라벨이 생겼으니 칸마다 붙던 "만 "·"뼈 " 접두사는 중복 — 숫자만 남긴다.
    for (const line of cell.querySelectorAll('div')) {
      if (line.textContent) line.textContent = line.textContent.replace(/^(만|뼈)\s+/, '');
    }
  }
  const label = document.createElement('div');
  label.style.cssText = 'text-align:left;line-height:1.35;font-size:10px;font-weight:700;color:#94a3b8';
  label.innerHTML = '<div>실제 나이</div><div style="color:#f97316">뼈나이</div><div style="color:#475569">차이</div>';
  grid.style.paddingLeft = '0px';
  grid.style.gridTemplateColumns = `${AXIS_W}px repeat(${grid.children.length}, minmax(0, 1fr))`;
  grid.prepend(label);
}

export function CaseChartTabs({ data }: { data: CaseData }) {
  const [tab, setTab] = useState<Tab>('growth');
  const canvasRef = useRef<ChartCanvas>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const rounds = data.measurements.filter((m) => m.bone_age != null).length;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv._chart?.destroy();
    if (tab === 'growth') {
      renderGrowth(cv, data);
      // renderTrend 가 남긴 인라인 display:grid 는 Tailwind `hidden` 클래스를 이긴다 → 인라인으로 지운다.
      if (gridRef.current) {
        gridRef.current.style.cssText = 'display:none';
        gridRef.current.innerHTML = '';
      }
    } else if (gridRef.current) {
      renderTrend(cv, gridRef.current, data);
      addAxisLabels(gridRef.current);
    }
    return () => cv._chart?.destroy();
  }, [tab, data]);

  return (
    <div>
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-[13px] font-bold transition ${
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* 예측키 탭은 회차 수만큼 폭이 필요해 가로 스크롤 — 차트와 하단 회차 표가 같이 움직여야 열이 맞는다. */}
      <div className="mt-3 overflow-x-auto">
        <div style={tab === 'trend' ? { minWidth: `${Math.max(280, rounds * 64 + AXIS_W + 12)}px` } : undefined}>
          <div className="h-[280px]">
            <canvas ref={canvasRef} />
          </div>
          <div ref={gridRef} className="mt-2" />
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        {tab === 'growth'
          ? '◆ 뼈나이를 촬영한 회차의 실제 키입니다. 점선은 마지막 회차 뼈나이 기준 성인키 예측치이며, 보라색 점은 치료 종료 후 추적 회차입니다.'
          : '회차마다 뼈나이로 다시 계산한 예상 성인키입니다. 보라색 칸은 치료 종료 후 추적 회차입니다.'}
      </p>
    </div>
  );
}
