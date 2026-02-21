// ================================================
// GrowthModalContent - 성장 기록 모달 내용
// 현재키/체중, 차트, 예측 성인키, 측정기록 테이블
// ================================================

import { MeasurementTable, type MeasurementRow } from '@/shared/components/MeasurementTable';
import { GrowthChart, type GrowthPoint } from '@/shared/components/GrowthChart';
import type { Gender } from '@/shared/types';

interface LMSData {
  percentile: number;
  predicted: number | null;
}

interface BPPrediction {
  pah: number;
  boneAge: number;
}

interface Props {
  latestHeight: number;
  latestWeight: number | undefined;
  gender: Gender;
  latestLMS: LMSData | null;
  bpPrediction: BPPrediction | null;
  mph: number | null;
  chartPoints: GrowthPoint[];
  tableRows: MeasurementRow[];
}

export function GrowthModalContent({
  latestHeight, latestWeight, gender,
  latestLMS, bpPrediction, mph, chartPoints, tableRows,
}: Props) {
  if (tableRows.length === 0) {
    return <p className="text-center text-sm text-gray-400 py-10">측정 기록이 없습니다.</p>;
  }

  return (
    <div className="space-y-5">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs text-gray-400 mb-1">현재 키</p>
          <p className="text-xl font-bold text-primary">
            {latestHeight}<span className="text-xs font-normal ml-0.5">cm</span>
          </p>
          {latestLMS && (
            <p className="text-xs text-gray-500 mt-1">백분위 {latestLMS.percentile.toFixed(1)}%</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs text-gray-400 mb-1">현재 체중</p>
          {latestWeight != null ? (
            <p className="text-xl font-bold text-secondary">
              {latestWeight}<span className="text-xs font-normal ml-0.5">kg</span>
            </p>
          ) : (
            <p className="text-sm text-gray-300 mt-2">기록 없음</p>
          )}
        </div>
      </div>

      {/* 성장 차트 */}
      {chartPoints.length > 0 && (
        <GrowthChart gender={gender} points={chartPoints} />
      )}

      {/* 예측 성인키 */}
      {latestLMS?.predicted && (
        <div className="space-y-3 bg-white rounded-xl border border-gray-100 p-4">
          <h4 className="text-sm font-bold text-gray-800">예측 성인키</h4>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              예측키 (LMS)
              <span className="block text-[10px] text-gray-400">현재 백분위 유지 기준</span>
            </span>
            <span className="text-lg font-bold text-primary">{latestLMS.predicted} cm</span>
          </div>

          {bpPrediction && bpPrediction.pah > 0 && (
            <>
              <div className="border-t border-gray-100" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  PAH (참고)
                  <span className="block text-[10px] text-gray-400">골연령 {bpPrediction.boneAge}세 기준</span>
                </span>
                <span className="text-lg font-bold text-gray-600">{bpPrediction.pah} cm</span>
              </div>
            </>
          )}

          {mph && (
            <>
              <div className="border-t border-gray-100" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">유전적 예상키 (MPH)</span>
                <span className="text-lg font-bold text-secondary">{mph} cm</span>
              </div>
              <div className="border-t border-gray-100" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">차이 (예측 − MPH)</span>
                <span className={`text-sm font-semibold ${latestLMS.predicted >= mph ? 'text-success' : 'text-danger'}`}>
                  {latestLMS.predicted >= mph ? '+' : ''}
                  {(latestLMS.predicted - mph).toFixed(1)} cm
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* 측정 기록 테이블 */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 mb-2">측정 기록</h4>
        <MeasurementTable
          rows={tableRows}
          gender={gender}
          showBoneAge
          showPercentile
          showPredicted
        />
      </div>
    </div>
  );
}
