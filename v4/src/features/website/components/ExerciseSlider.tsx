import { SwipeableSection } from '@/shared/components/SwipeableSection';
import { EXERCISES } from '@/features/exercise/data/exercises';

export function ExerciseSlider() {
  return (
    <section className="py-8">
      <SwipeableSection title="키 성장 운동" emoji="🏃">
        {EXERCISES.map((ex) => (
          <a key={ex.id}
            href={`https://www.youtube.com/watch?v=${ex.videoId}&t=${ex.startSeconds}`}
            target="_blank" rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
            <img
              src={`https://img.youtube.com/vi/${ex.videoId}/mqdefault.jpg`}
              alt={ex.name}
              className="w-full h-28 object-cover"
            />
            <div className="p-3">
              <p className="text-sm font-bold text-gray-800">{ex.name}</p>
              <span className={`inline-block mt-1 text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                ex.category === '스트레칭'
                  ? 'bg-[#E8F5F0] text-[#0F6E56]'
                  : 'bg-blue-50 text-blue-600'
              }`}>
                {ex.category}
              </span>
            </div>
          </a>
        ))}
      </SwipeableSection>
    </section>
  );
}
