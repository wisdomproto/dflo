import type { Recipe, GrowthCase, GrowthGuide, CaseMeasurement } from '@/shared/types';

export type Tab = 'recipe' | 'guide' | 'case';
export const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'guide', label: '성장 가이드', emoji: '📚' },
  { key: 'recipe', label: '건강 레시피', emoji: '🥗' },
  { key: 'case', label: '성장 사례', emoji: '📋' },
];
export const DIFF = ['쉬움', '보통', '어려움'] as const;

export type ERecipe = Partial<Recipe> & { title: string };
export type EGuide = Partial<GrowthGuide> & { title: string; content: string };
export type ECase = Partial<GrowthCase> & { patient_name: string };

export const mkRecipe = (): ERecipe => ({ title: '', image_url: '', key_benefits: '', cooking_time_minutes: 0, difficulty: '보통', is_featured: false, order_index: 0 });
export const mkGuide = (): EGuide => ({ title: '', subtitle: '', icon: '', category: '', content: '', image_url: '', banner_color: '', is_featured: false, order_index: 0 });
export const mkCase = (): ECase => ({ patient_name: '', gender: 'male', special_notes: '', image_url: '', is_featured: false, order_index: 0, measurements: [] });
export const mkMeasurement = (): CaseMeasurement => ({ date: new Date().toISOString().split('T')[0], age: 0, height: 0 });

/* dark theme classes */
export const ic = 'bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm w-full text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary';
export const cellIc = 'bg-transparent border-0 w-full text-xs text-gray-200 placeholder-gray-500 py-1 px-1 focus:outline-none focus:bg-gray-700/50 rounded';
export const fw = 'bg-gray-800 rounded-xl p-4 space-y-3';
export const cardCls = 'bg-gray-800 rounded-xl shadow-sm p-4 flex items-center justify-between';

export const Badge = () => <span className="bg-yellow-900/50 text-yellow-400 rounded-full px-2 py-0.5 text-xs">추천</span>;
export const Skeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((i) => <div key={i} className="bg-gray-800 rounded-xl p-4 h-16 animate-pulse" />)}
  </div>
);

export const thumb = (url: string | undefined, fallbackEmoji: string, fallbackBg: string, onLightbox: (url: string) => void) => {
  if (url) {
    return (
      <img
        src={url} alt=""
        className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-primary/50 transition"
        onClick={(e) => { e.stopPropagation(); onLightbox(url); }}
      />
    );
  }
  return <div className={`w-10 h-10 rounded-lg ${fallbackBg} flex items-center justify-center text-lg`}>{fallbackEmoji}</div>;
};

export const label = (text: string) => <span className="text-[11px] text-gray-400 block mb-0.5">{text}</span>;
export const empty = (msg: string) => <p className="text-gray-500 text-sm text-center py-8">{msg}</p>;

export const editBtn = (onClick: () => void) => <button onClick={onClick} className="text-primary hover:text-primary-light text-xs">수정</button>;
export const foldBtn = (onClick: () => void) => <button onClick={onClick} className="text-gray-400 hover:text-gray-200 text-xs">접기</button>;
export const delBtn = (onClick: () => void) => <button onClick={onClick} className="text-red-400 hover:text-red-300 text-xs">삭제</button>;
export const newBtn = (onClick: () => void) => <button onClick={onClick} className="text-sm font-medium text-primary hover:text-primary-light">+ 새로 만들기</button>;
export const cancelBtn = (onClick: () => void) => <button onClick={onClick} className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1.5">취소</button>;
export const saveBtn = (onClick: () => void, disabled: boolean, saving: boolean) => (
  <button onClick={onClick} disabled={disabled} className="text-sm bg-primary text-white rounded-lg px-4 py-1.5 disabled:opacity-40 hover:bg-primary-dark transition-colors">
    {saving ? '저장 중...' : '저장'}
  </button>
);
