import { useEffect, useState } from 'react';
import { WebsiteSlider } from './WebsiteSlider';
import { fetchGrowthCases } from '@/features/content/services/contentService';
import type { GrowthCase } from '@/shared/types';

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/';

export function CaseSlider() {
  const [cases, setCases] = useState<GrowthCase[]>([]);

  useEffect(() => {
    fetchGrowthCases().then(setCases).catch(() => {});
  }, []);

  if (!cases.length) return null;

  return (
    <>
      <WebsiteSlider id="cases" tag="치료 사례" title="실제 성장 치료 성공 사례" desktopCards={3}>
        {cases.map((c) => {
          const first = c.measurements?.[0];
          const last = c.measurements?.[c.measurements.length - 1];
          const growth = first && last ? (last.height - first.height).toFixed(1) : null;

          return (
            <div key={c.id} className="rounded-2xl bg-white p-5 border border-gray-100 shadow-sm h-full space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                  {c.gender === 'male' ? '👦' : '👧'}
                </div>
                <div>
                  <p className="text-base font-bold text-gray-800">{c.patient_name}</p>
                  <p className="text-xs text-gray-400">{c.gender === 'male' ? '남아' : '여아'}</p>
                </div>
              </div>
              {growth && (
                <div className="bg-[#E8F5F0] rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-[#0F6E56] font-medium">성장 변화</p>
                  <p className="text-2xl font-black text-[#0F6E56]">+{growth}cm</p>
                </div>
              )}
              {c.special_notes && (
                <p className="text-sm text-gray-500 line-clamp-2">{c.special_notes}</p>
              )}
            </div>
          );
        })}
      </WebsiteSlider>

      {/* Final CTA */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-8">
        <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#0F6E56] py-4
                     text-white font-bold text-base hover:bg-[#0D5A47] active:scale-[0.98] transition-all shadow-lg">
          <span>💬</span> 우리 아이도 상담 받아보기
        </a>
      </div>
    </>
  );
}
