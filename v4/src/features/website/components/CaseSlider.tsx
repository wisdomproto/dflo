import { useEffect, useState } from 'react';
import { SwipeableSection } from '@/shared/components/SwipeableSection';
import { fetchGrowthCases } from '@/features/content/services/contentService';
import type { GrowthCase } from '@/shared/types';

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/';

export function CaseSlider() {
  const [cases, setCases] = useState<GrowthCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrowthCases()
      .then(setCases)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="cases" className="py-8 bg-gray-50">
      <SwipeableSection title="치료 사례" emoji="📋" isLoading={loading}>
        {cases.map((c) => {
          const first = c.measurements?.[0];
          const last = c.measurements?.[c.measurements.length - 1];
          const growth = first && last ? (last.height - first.height).toFixed(1) : null;

          return (
            <div key={c.id} className="rounded-xl bg-white p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">{c.gender === 'male' ? '👦' : '👧'}</span>
                <div>
                  <p className="text-sm font-bold text-gray-800">{c.patient_name}</p>
                  <p className="text-xs text-gray-400">{c.gender === 'male' ? '남아' : '여아'}</p>
                </div>
              </div>
              {growth && (
                <div className="bg-[#E8F5F0] rounded-lg px-3 py-2 text-center">
                  <p className="text-xs text-[#0F6E56] font-medium">성장 변화</p>
                  <p className="text-lg font-black text-[#0F6E56]">+{growth}cm</p>
                </div>
              )}
              {c.special_notes && (
                <p className="text-xs text-gray-500 line-clamp-2">{c.special_notes}</p>
              )}
            </div>
          );
        })}
      </SwipeableSection>

      {/* Final CTA */}
      <div className="px-4 mt-4">
        <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#0F6E56] py-4
                     text-white font-bold text-base hover:bg-[#0D5A47] active:scale-[0.98] transition-all shadow-lg">
          <span>💬</span> 우리 아이도 상담 받아보기
        </a>
      </div>
    </section>
  );
}
