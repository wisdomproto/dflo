// src/features/marketing/components/CasesViewer.tsx
// 치료사례 양산 후보 — 전략 뷰어에서 분리한 독립 페이지. PHI 포함 내부용(가명·차트번호),
// 정적 HTML(case-candidates.html, gitignore)을 iframe 전체 화면으로 노출.
// 재생성: node cases/gen_case_profiles.mjs
export function CasesViewer() {
  // PHI 포함 로컬 전용 — 배포본엔 case-candidates.html 이 없으므로(gitignore) dev 에서만 iframe.
  if (!import.meta.env.DEV) {
    return (
      <div className="flex h-full items-center justify-center bg-white p-8 text-center text-gray-500">
        <div>
          <div className="mb-2 text-3xl">🔒</div>
          <p className="text-sm font-semibold text-gray-700">치료사례 후보는 로컬 전용 도구입니다</p>
          <p className="mt-2 text-xs leading-relaxed text-gray-400">
            차트번호·진료기록 등 환자 정보를 포함해 배포본에는 포함되지 않습니다.<br />
            로컬 개발 환경에서 <code className="rounded bg-gray-100 px-1 py-0.5">node cases/gen_case_profiles.mjs</code> 로 생성해 확인하세요.
          </p>
        </div>
      </div>
    );
  }
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
