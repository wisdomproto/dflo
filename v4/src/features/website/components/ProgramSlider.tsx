import { useNavigate } from 'react-router-dom';
import { WebsiteSlider } from './WebsiteSlider';
import { PROGRAMS } from '../data/programs';

export function ProgramSlider() {
  const navigate = useNavigate();

  return (
    <WebsiteSlider id="programs" tag="187 성장프로그램" title="우리 아이 맞춤 성장 프로그램" desktopCards={3}>
      {PROGRAMS.map((p) => (
        <button key={p.slug} onClick={() => navigate(`/website/program/${p.slug}`)}
          className="w-full h-full text-left rounded-2xl p-5 transition-all hover:shadow-lg active:scale-[0.98] border border-gray-100"
          style={{ backgroundColor: p.color + '08', borderLeft: `4px solid ${p.color}` }}>
          <span className="text-3xl block mb-3">{p.emoji}</span>
          <p className="text-base font-bold text-gray-800 mb-1">{p.shortTitle}</p>
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{p.description}</p>
          <span className="inline-block mt-3 text-xs font-semibold text-[#0F6E56]">자세히 보기 →</span>
        </button>
      ))}
    </WebsiteSlider>
  );
}
