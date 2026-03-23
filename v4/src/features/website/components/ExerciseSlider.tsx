import { WebsiteSlider } from './WebsiteSlider';
import { EXERCISES } from '@/features/exercise/data/exercises';

export function ExerciseSlider() {
  return (
    <WebsiteSlider id="exercises" tag="자세 교정 & 운동" title="바른 자세가 키 성장의 시작" desktopCards={3} bgClass="bg-gray-50">
      {EXERCISES.map((ex) => (
        <a key={ex.id}
          href={`https://www.youtube.com/watch?v=${ex.videoId}&t=${ex.startSeconds}`}
          target="_blank" rel="noopener noreferrer"
          className="block rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100
                     hover:shadow-lg transition-shadow h-full">
          <img
            src={`https://img.youtube.com/vi/${ex.videoId}/mqdefault.jpg`}
            alt={ex.name}
            className="w-full h-40 object-cover"
          />
          <div className="p-4">
            <p className="text-base font-bold text-gray-800 mb-2">{ex.name}</p>
            <span className={`inline-block text-xs font-semibold rounded-full px-3 py-1 ${
              ex.category === '스트레칭'
                ? 'bg-[#E8F5F0] text-[#0F6E56]'
                : 'bg-blue-50 text-blue-600'
            }`}>
              {ex.category}
            </span>
          </div>
        </a>
      ))}
    </WebsiteSlider>
  );
}
