import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WebsiteSlider } from './WebsiteSlider';
import { PROGRAMS } from '../data/programs';

export function ProgramSlider() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <section id="programs" className="py-6 md:py-10 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-[#0F6E56] hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="font-semibold">🏥 187 성장 프로그램 소개</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="programs" className="w-full h-full flex flex-col px-4 md:px-6">
      <div className="max-w-5xl mx-auto w-full">
        <button
          onClick={() => setIsOpen(false)}
          className="mb-4 flex items-center gap-2 px-4 py-2 text-[#0F6E56] hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          <span className="font-semibold">접기</span>
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <WebsiteSlider id="programs" title="🏥 187 성장 프로그램 소개" desktopCards={3} sideHeader>
        {PROGRAMS.map((p) => (
          <button key={p.slug} onClick={() => navigate(`/program/${p.slug}`)}
            className="w-full h-full text-left rounded-2xl p-5 transition-all hover:shadow-lg active:scale-[0.98] border border-gray-100"
            style={{ backgroundColor: p.color + '08', borderLeft: `4px solid ${p.color}` }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{p.emoji}</span>
              <p className="text-2xl font-bold text-gray-800">{p.shortTitle}</p>
            </div>
            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{p.description}</p>
            <span className="inline-block mt-3 text-xs font-semibold text-[#0F6E56]">자세히 보기 →</span>
          </button>
        ))}
        </WebsiteSlider>
      </div>
    </section>
  );
}
