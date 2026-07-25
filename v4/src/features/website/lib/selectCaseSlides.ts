// 치료사례 뷰어의 슬라이드 선택 로직 — React 라우트(CasesEmbedPage)와 경량 엔트리
// (cases-embed-main)이 공유하는 순수 함수. 렌더링과 무관하게 단위 테스트 가능.
//
// 규칙:
//   - cases 슬라이드를 포함한 첫 섹션을 찾는다("키 성장 관리 사례").
//   - order 로 정렬한다.
//   - ?case=N → N번째 케이스(1-base, cases 템플릿만 셈)로 딥링크.
//   - ?only=3,4,6,7 → 노출 케이스만 남긴다(스와이프 범위 제한). 딥링크 케이스는 항상 포함.
//   - 첫 진입 인덱스 = 딥링크 케이스 > 첫 케이스 슬라이드 > 0.
import type { WebsiteSection, Slide } from '../types/websiteSection';

export interface CaseSelection {
  slides: Slide[];
  showNav: boolean;
  initialIndex: number;
}

const EMPTY: CaseSelection = { slides: [], showNav: true, initialIndex: 0 };

export function selectCaseSlides(
  sections: WebsiteSection[],
  opts: { caseParam?: number; onlyParam?: string } = {},
): CaseSelection {
  const casesSection = sections.find((s) => s.slides?.some((sl) => sl.template === 'cases'));
  if (!casesSection) return EMPTY;

  const ordered = (casesSection.slides || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const showNav = casesSection.showNav ?? true;

  const caseIndexes = ordered
    .map((s, i) => (s.template === 'cases' ? i : -1))
    .filter((i) => i >= 0);

  const caseParam = opts.caseParam;
  const deepIdx =
    caseParam != null && Number.isFinite(caseParam) && caseParam >= 1 && caseParam <= caseIndexes.length
      ? caseIndexes[caseParam - 1]
      : -1;

  const wanted = (opts.onlyParam ?? '')
    .split(',')
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= caseIndexes.length);

  if (wanted.length > 0) {
    const keep = new Set(wanted.map((n) => caseIndexes[n - 1]));
    if (deepIdx >= 0) keep.add(deepIdx);
    const filtered = ordered.filter((_, i) => keep.has(i));
    const target = deepIdx >= 0 ? ordered[deepIdx] : filtered[0];
    return { slides: filtered, showNav, initialIndex: Math.max(0, filtered.indexOf(target)) };
  }

  const firstCaseIdx = caseIndexes.length > 0 ? caseIndexes[0] : 0;
  return {
    slides: ordered,
    showNav,
    initialIndex: deepIdx >= 0 ? deepIdx : firstCaseIdx > 0 ? firstCaseIdx : 0,
  };
}
