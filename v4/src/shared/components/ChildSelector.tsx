// ================================================
// ChildSelector 컴포넌트 - 187 성장케어 v4
// 활성 자녀 선택 (가로 스크롤 필 셀렉터)
// ================================================

import { useChildrenStore } from '@/stores/childrenStore';
import { calculateAge, formatAge } from '@/shared/utils/age';
import GenderIcon from '@/shared/components/GenderIcon';

export default function ChildSelector() {
  const children = useChildrenStore((s) => s.children);
  const selectedChildId = useChildrenStore((s) => s.selectedChildId);
  const selectChild = useChildrenStore((s) => s.selectChild);

  if (children.length === 0) {
    return (
      <div className="px-4 py-2">
        <p className="text-sm text-gray-400">등록된 자녀가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
      {children.map((child) => {
        const active = child.id === selectedChildId;
        const age = calculateAge(child.birth_date);

        return (
          <button
            key={child.id}
            onClick={() => selectChild(child.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full
                       whitespace-nowrap text-sm font-medium
                       transition-all duration-200 flex-shrink-0
                       ${
                         active
                           ? 'bg-primary text-white shadow-md shadow-primary/30'
                           : 'bg-white text-gray-600 border border-gray-200 active:bg-gray-50'
                       }`}
          >
            <GenderIcon gender={child.gender} size="sm" />
            <span>{child.name}</span>
            <span
              className={`text-xs ${
                active ? 'text-white/70' : 'text-gray-400'
              }`}
            >
              {formatAge(age)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
