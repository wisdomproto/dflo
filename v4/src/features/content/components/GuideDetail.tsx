// ================================================
// GuideDetail - 성장 가이드 상세 보기
// JSON content 파싱 + 섹션별 렌더링
// ================================================

import type { GrowthGuide } from '@/shared/types';

interface GuideSection {
  type?: string;
  title?: string;
  content?: string;
  steps?: string[];
  stages?: { name: string; description: string; key_actions?: string[] }[];
  items?: string[];
}

export function GuideDetail({ guide }: { guide: GrowthGuide }) {
  let parsed: { summary?: string; key_points?: string[]; sections?: GuideSection[] } = {};
  try {
    parsed = typeof guide.content === 'string' ? JSON.parse(guide.content) : guide.content;
  } catch {
    parsed = { summary: String(guide.content) };
  }

  return (
    <div className="space-y-5">
      {guide.image_url && (
        <img src={guide.image_url} alt={guide.title} className="w-full rounded-xl" />
      )}
      {parsed.summary && <p className="text-sm text-gray-700 leading-relaxed">{parsed.summary}</p>}
      {parsed.key_points && parsed.key_points.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-4">
          <h4 className="text-sm font-bold text-blue-800 mb-2">핵심 포인트</h4>
          <ul className="space-y-1">
            {parsed.key_points.map((p, i) => (
              <li key={i} className="text-sm text-blue-700 flex gap-2"><span className="text-blue-400">•</span>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {parsed.sections?.map((section, i) => (
        <div key={i}>
          {section.title && <h4 className="text-sm font-bold text-gray-800 mb-2">{section.title}</h4>}
          {section.content && <p className="text-sm text-gray-700 leading-relaxed">{section.content}</p>}
          {section.steps && (
            <ol className="space-y-1.5 mt-2">
              {section.steps.map((step, j) => (
                <li key={j} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-primary font-bold">{j + 1}.</span>{step}
                </li>
              ))}
            </ol>
          )}
          {section.stages && (
            <div className="space-y-3 mt-2">
              {section.stages.map((stage, j) => (
                <div key={j} className="bg-gray-50 rounded-xl p-3">
                  <h5 className="text-sm font-bold text-gray-800">{stage.name}</h5>
                  <p className="text-xs text-gray-600 mt-1">{stage.description}</p>
                  {stage.key_actions && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {stage.key_actions.map((a, k) => (
                        <span key={k} className="bg-white text-xs text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
