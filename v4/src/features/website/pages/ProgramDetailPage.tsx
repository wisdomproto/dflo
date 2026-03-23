import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WebsiteLayout } from '../components/WebsiteLayout';
import { PROGRAMS } from '../data/programs';

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/';

export default function ProgramDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const program = PROGRAMS.find((p) => p.slug === slug);

  useEffect(() => {
    if (program) document.title = `${program.title} | 187 성장클리닉`;
  }, [program]);

  if (!program) {
    return (
      <WebsiteLayout>
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <p className="text-gray-500">프로그램을 찾을 수 없습니다.</p>
          <button onClick={() => navigate('/website')}
            className="mt-4 text-sm text-[#0F6E56] font-semibold underline">홈으로 돌아가기</button>
        </div>
      </WebsiteLayout>
    );
  }

  return (
    <WebsiteLayout>
      {/* Hero */}
      <section className="relative py-16 px-6" style={{ background: `linear-gradient(135deg, ${program.color}15, ${program.color}05)` }}>
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate('/website')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            전체 프로그램
          </button>
          <span className="text-4xl mb-4 block">{program.emoji}</span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">{program.title}</h1>
          <p className="text-base text-gray-600 leading-relaxed">{program.description}</p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-3xl mx-auto px-6 py-10">
        <h2 className="text-lg font-bold text-gray-900 mb-4">프로그램 특징</h2>
        <div className="space-y-3">
          {program.features.map((f, i) => (
            <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: program.color }}>
                {i + 1}
              </span>
              <p className="text-sm text-gray-700 pt-0.5">{f}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Target children */}
      <section className="max-w-3xl mx-auto px-6 pb-10">
        <h2 className="text-lg font-bold text-gray-900 mb-4">이런 아이에게 필요해요</h2>
        <div className="bg-[#E8F5F0] rounded-2xl p-5 space-y-2">
          {program.targetChildren.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[#0F6E56]">✓</span>
              <p className="text-sm text-gray-700">{t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-12">
        <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-2xl py-4 text-white font-bold text-base
                     hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
          style={{ backgroundColor: program.color }}>
          <span>💬</span> {program.shortTitle} 상담 받기
        </a>
      </section>
    </WebsiteLayout>
  );
}
