// Dashboard map view: 17개 광역시도 tile cartogram + 서울 25구 bar chart.
//
// A true geographic SVG of Korea would need a TopoJSON file and a projection
// library; for 244 patients we get more signal from a stylised tile grid that
// places each region at its rough compass position. Seoul dominates the data
// so its 구 breakdown is shown separately as horizontal bars.

import type { RegionDistribution } from '@/features/admin/services/adminService';

// Grid cell positions (col, row) for each 광역시도 on a 6×7 layout.
// Picked to roughly match each region's compass position on the peninsula.
const PROVINCE_TILES: Array<{ key: string; label: string; col: number; row: number }> = [
  { key: '강원',  label: '강원', col: 5, row: 1 },
  { key: '인천',  label: '인천', col: 2, row: 3 },
  { key: '서울',  label: '서울', col: 3, row: 3 },
  { key: '경기',  label: '경기', col: 4, row: 3 },
  { key: '충남',  label: '충남', col: 2, row: 4 },
  { key: '세종',  label: '세종', col: 3, row: 4 },
  { key: '충북',  label: '충북', col: 4, row: 4 },
  { key: '경북',  label: '경북', col: 5, row: 4 },
  { key: '대전',  label: '대전', col: 3, row: 5 },
  { key: '대구',  label: '대구', col: 5, row: 5 },
  { key: '울산',  label: '울산', col: 6, row: 5 },
  { key: '전북',  label: '전북', col: 2, row: 5 },
  { key: '광주',  label: '광주', col: 2, row: 6 },
  { key: '전남',  label: '전남', col: 3, row: 6 },
  { key: '경남',  label: '경남', col: 4, row: 6 },
  { key: '부산',  label: '부산', col: 5, row: 6 },
  { key: '제주',  label: '제주', col: 2, row: 7 },
];

// Choropleth scale — tuned against the actual distribution (서울 heavy).
function tileColor(count: number, max: number): { bg: string; fg: string } {
  if (count === 0) return { bg: 'bg-slate-100', fg: 'text-slate-400' };
  const ratio = max === 0 ? 0 : count / max;
  if (ratio >= 0.66) return { bg: 'bg-indigo-600', fg: 'text-white' };
  if (ratio >= 0.33) return { bg: 'bg-indigo-400', fg: 'text-white' };
  if (ratio >= 0.10) return { bg: 'bg-indigo-200', fg: 'text-indigo-900' };
  return { bg: 'bg-indigo-50', fg: 'text-indigo-700' };
}

export interface PatientDistributionMapProps {
  data: RegionDistribution | null;
  loading?: boolean;
}

export default function PatientDistributionMap({ data, loading }: PatientDistributionMapProps) {
  if (loading) {
    return (
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">지역별 환자 분포</h2>
        <div className="h-80 animate-pulse bg-slate-50 rounded-lg" />
      </section>
    );
  }
  if (!data) {
    return (
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">지역별 환자 분포</h2>
        <p className="text-sm text-slate-400">데이터를 불러올 수 없습니다.</p>
      </section>
    );
  }

  const maxProvince = Math.max(0, ...Object.values(data.provinces));
  const seoulList = Object.entries(data.seoulDistricts).sort((a, b) => b[1] - a[1]);
  const maxSeoul = seoulList[0]?.[1] ?? 0;

  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold">지역별 환자 분포</h2>
        <div className="text-xs text-slate-500">
          주소 등록 {data.totalWithAddress} / {data.totalPatients}명
          {data.unknown > 0 && ` · 미분류 ${data.unknown}`}
          {data.overseas > 0 && ` · 해외 ${data.overseas}`}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(280px,auto)_1fr] gap-8">
        {/* 17 시도 타일 카토그램 */}
        <div>
          <h3 className="text-sm font-medium text-slate-600 mb-3">광역시/도</h3>
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: 'repeat(6, 52px)',
              gridTemplateRows: 'repeat(7, 52px)',
            }}
          >
            {PROVINCE_TILES.map(({ key, label, col, row }) => {
              const count = data.provinces[key] ?? 0;
              const { bg, fg } = tileColor(count, maxProvince);
              return (
                <div
                  key={key}
                  className={`${bg} ${fg} rounded-lg flex flex-col items-center justify-center text-center`}
                  style={{ gridColumn: col, gridRow: row }}
                  title={`${label} · ${count}명`}
                >
                  <span className="text-[11px] font-semibold leading-tight">{label}</span>
                  <span className="text-[13px] font-bold leading-none mt-0.5">{count || '-'}</span>
                </div>
              );
            })}
          </div>

          {/* 범례 */}
          <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
            <span>0</span>
            <div className="flex h-3 flex-1 overflow-hidden rounded">
              <div className="flex-1 bg-slate-100" />
              <div className="flex-1 bg-indigo-50" />
              <div className="flex-1 bg-indigo-200" />
              <div className="flex-1 bg-indigo-400" />
              <div className="flex-1 bg-indigo-600" />
            </div>
            <span>{maxProvince}명</span>
          </div>
        </div>

        {/* 서울 구 bar chart */}
        <div>
          <h3 className="text-sm font-medium text-slate-600 mb-3">
            서울 {seoulList.length}개 구
            <span className="ml-2 text-xs text-slate-400">
              ({data.provinces['서울'] ?? 0}명)
            </span>
          </h3>
          {seoulList.length === 0 ? (
            <p className="text-sm text-slate-400">서울 거주 환자가 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {seoulList.map(([gu, count]) => {
                const pct = maxSeoul ? (count / maxSeoul) * 100 : 0;
                return (
                  <li key={gu} className="flex items-center gap-3 text-sm">
                    <span className="w-20 shrink-0 text-slate-700">{gu}</span>
                    <div className="flex-1 relative h-5 rounded bg-slate-100 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-indigo-500 rounded"
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-xs text-slate-600">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
