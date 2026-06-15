// src/features/marketing/components/CasesViewer.tsx
// 치료사례 양산 후보 — 전략 뷰어에서 분리한 독립 페이지. PHI 포함 내부용(가명·차트번호),
// 정적 HTML(case-candidates.html, gitignore)을 iframe 전체 화면으로 노출.
// 재생성: node cases/gen_case_profiles.mjs
export function CasesViewer() {
  return (
    <div className="flex h-full flex-col bg-white">
      <iframe
        src="/marketing/strategy/case-candidates.html"
        title="치료사례 양산 후보"
        className="w-full flex-1 border-0"
      />
    </div>
  );
}
