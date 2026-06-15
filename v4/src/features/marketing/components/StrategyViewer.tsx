// src/features/marketing/components/StrategyViewer.tsx
import { useState } from 'react';
import strategyIndexRaw from '../data/strategy-index.json';
import type { StrategyDoc } from '../types';

const DOCS = (strategyIndexRaw as StrategyDoc[]).slice().sort((a, b) => a.order - b.order);
const GROUPS: StrategyDoc['group'][] = ['종합 전략', '국내', '글로벌', '국가별 작전', '채널분석', '광고 전략'];

export function StrategyViewer() {
  const [active, setActive] = useState<string>(DOCS[0]?.file ?? '');
  const activeDoc = DOCS.find((d) => d.file === active);

  return (
    <div className="flex h-full">
      <div className="w-60 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-3">
        {GROUPS.map((g) => {
          const docs = DOCS.filter((d) => d.group === g);
          if (!docs.length) return null;
          return (
            <div key={g} className="mb-4">
              <div className="mb-1 px-2 text-xs font-bold text-gray-400">{g}</div>
              {docs.map((d) => (
                <button
                  key={d.file}
                  onClick={() => setActive(d.file)}
                  className={`mb-0.5 block w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    active === d.file ? 'bg-[#4A2D6B] text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {d.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <div className="flex flex-1 flex-col bg-white">
        {activeDoc && (
          <div className="border-b border-gray-100 px-4 py-2 text-xs text-gray-400">
            {activeDoc.description}
          </div>
        )}
        {active && (
          <iframe
            key={active}
            src={`/marketing/strategy/${active}`}
            title={active}
            className="w-full flex-1 border-0"
          />
        )}
      </div>
    </div>
  );
}
