import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';

// 치료사례 후보(전체 상세) — 환자 데이터 요약본.
// 기존 admin 환자 페이지와 동일하게 v4 anon 클라이언트로 case_candidates_doc 를 직접 읽는다
// (환자 PHI 테이블이 이미 anon-readable 인 앱 모델과 동일 수준, AdminRoute 가 페이지 노출 통제).
// 데이터 적재 = 로컬 `node cases/gen_case_profiles.mjs` (service_role 로 write).
export default function CaseCandidatesAdminPage() {
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('case_candidates_doc')
      .select('html')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setErr(error.message); return; }
        if (!data?.html) { setErr('아직 데이터가 없습니다. 로컬에서 gen 스크립트를 실행해 DB에 적재하세요.'); return; }
        // srcDoc iframe 의 base 는 부모(/admin/cases)라 상대경로 case-charts.js 가 404.
        // 절대경로로 바꿔 부모 origin(/marketing/strategy/case-charts.js, prod tracked)에서 로드.
        setHtml(data.html.replace(/src="case-charts\.js/g, 'src="/marketing/strategy/case-charts.js'));
      });
    return () => { cancelled = true; };
  }, []);

  if (err) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <div className="mb-2 text-3xl">⚠️</div>
          <p className="text-sm font-semibold text-gray-700">치료사례 후보를 불러오지 못했습니다</p>
          <p className="mt-2 text-xs leading-relaxed text-gray-400">{err}<br />
            데이터가 없으면 로컬에서 <code className="rounded bg-gray-100 px-1 py-0.5">node cases/gen_case_profiles.mjs</code> 를 실행해 DB에 적재하세요.
          </p>
        </div>
      </div>
    );
  }
  if (html === null) {
    return <div className="flex h-full items-center justify-center p-8 text-sm text-gray-400">불러오는 중…</div>;
  }
  return (
    <div className="-m-4 lg:-m-6 h-[calc(100dvh-3.5rem)] lg:h-dvh">
      <iframe srcDoc={html} title="치료사례 후보" className="h-full w-full border-0" />
    </div>
  );
}
