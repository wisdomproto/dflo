import { useEffect, useState } from 'react';
import { WebsiteSlider } from './WebsiteSlider';
import { CaseDetailModal } from './CaseDetailModal';
import { fetchGrowthCases } from '@/features/content/services/contentService';
import { trackKakaoConsult } from '@/shared/lib/analytics';
import type { GrowthCase } from '@/shared/types';

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/_ZxneSb';

export function CaseSlider() {
  const [cases, setCases] = useState<GrowthCase[]>([]);
  const [selected, setSelected] = useState<GrowthCase | null>(null);

  useEffect(() => {
    fetchGrowthCases().then(setCases).catch(() => {});
  }, []);

  if (!cases.length) return null;

  return (
    <>
      <div className="w-full h-full flex items-center justify-center">
        <WebsiteSlider id="cases" title="📊 187 성장 클리닉 - 성장 관리 사례" desktopCards={3} sideHeader>
        {cases.map((c) => {
          const first = c.measurements?.[0];
          const last = c.measurements?.[c.measurements.length - 1];
          const growth = first && last ? (last.height - first.height).toFixed(1) : null;

          const isMale = c.gender === 'male';
          return (
            <button key={c.id} onClick={() => setSelected(c)}
              className={`w-full text-left rounded-2xl overflow-hidden shadow-sm h-full
                         hover:shadow-md active:scale-[0.98] transition-all border border-l-4 flex flex-col
                         ${isMale ? 'border-blue-100 border-l-blue-400 hover:border-blue-200 hover:border-l-blue-400' : 'border-pink-100 border-l-pink-400 hover:border-pink-200 hover:border-l-pink-400'}`}>
              {/* Top gradient header */}
              <div className={`px-5 pt-4 pb-3 flex-shrink-0 ${isMale
                ? 'bg-gradient-to-r from-blue-50 to-sky-50'
                : 'bg-gradient-to-r from-pink-50 to-rose-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-sm
                    ${isMale ? 'bg-blue-100' : 'bg-pink-100'}`}>
                    {isMale ? '👦' : '👧'}
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-800">{c.patient_name}</p>
                    <p className="text-xs text-gray-400">{isMale ? '남아' : '여아'}{c.measurements?.length ? ` · 측정 ${c.measurements.length}회` : ''}</p>
                  </div>
                </div>
              </div>
              {/* Body */}
              <div className="px-5 pb-4 pt-3 bg-white space-y-3 flex-1 flex flex-col">
                {growth && (
                  <div className={`rounded-xl px-4 py-3 text-center ${isMale ? 'bg-blue-50' : 'bg-pink-50'}`}>
                    <p className={`text-xs font-medium ${isMale ? 'text-blue-500' : 'text-pink-500'}`}>성장 변화</p>
                    <p className={`text-2xl font-black ${isMale ? 'text-blue-600' : 'text-pink-600'}`}>+{growth}cm</p>
                  </div>
                )}
                {c.special_notes && (
                  <p className="text-sm text-gray-500 line-clamp-2">{c.special_notes}</p>
                )}
                <p className="text-xs font-semibold text-[#0F6E56]">상세 보기 →</p>
              </div>
            </button>
          );
        })}
        </WebsiteSlider>
      </div>

      {/* Final CTA */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-8">
        <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
          onClick={() => trackKakaoConsult('case_slider')}
          className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#0F6E56] py-4
                     text-white font-bold text-base hover:bg-[#0D5A47] active:scale-[0.98] transition-all shadow-lg">
          <span>💬</span> 우리 아이도 상담 받아보기
        </a>
      </div>

      {/* Detail Modal */}
      <CaseDetailModal caseData={selected} onClose={() => setSelected(null)} />
    </>
  );
}
