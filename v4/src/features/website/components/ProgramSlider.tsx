import { useNavigate } from 'react-router-dom';
import { SwipeableSection } from '@/shared/components/SwipeableSection';
import { PROGRAMS } from '../data/programs';

export function ProgramSlider() {
  const navigate = useNavigate();

  return (
    <section id="programs" className="py-8">
      <SwipeableSection title="187 성장프로그램" emoji="🏥">
        {PROGRAMS.map((p) => (
          <button key={p.slug} onClick={() => navigate(`/website/program/${p.slug}`)}
            className="w-full text-left rounded-xl p-4 transition-all hover:shadow-md active:scale-[0.98]"
            style={{ backgroundColor: p.color + '10', borderLeft: `4px solid ${p.color}` }}>
            <span className="text-2xl">{p.emoji}</span>
            <p className="text-sm font-bold text-gray-800 mt-2 leading-tight">{p.shortTitle}</p>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>
          </button>
        ))}
      </SwipeableSection>
    </section>
  );
}
