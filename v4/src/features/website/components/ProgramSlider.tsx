import { useNavigate } from 'react-router-dom';
import { WebsiteSlider } from './WebsiteSlider';
import { PROGRAMS } from '../data/programs';

export function ProgramSlider() {
  const navigate = useNavigate();

  return (
    <WebsiteSlider id="programs" title="🏥 187 성장 프로그램 소개" desktopCards={3}>
      {PROGRAMS.map((p) => (
        <button key={p.slug} onClick={() => navigate(`/website/program/${p.slug}`)}
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
  );
}
