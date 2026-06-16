import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';

// 치료사례 후보(전체 상세) — 환자 데이터 요약본.
// 기존 admin 환자 페이지와 동일하게 v4 anon 클라이언트로 case_candidates_doc 를 직접 읽는다
// (환자 PHI 테이블이 이미 anon-readable 인 앱 모델과 동일 수준, AdminRoute 가 페이지 노출 통제).
// 데이터 적재 = 로컬 `node cases/gen_case_profiles.mjs` (service_role 로 write).
const CHART_BUNDLE_URL = '/marketing/strategy/case-charts.js';

export default function CaseCandidatesAdminPage() {
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from('case_candidates_doc').select('html').eq('id', 1).maybeSingle(),
      // 차트 번들을 텍스트로 받아 HTML 에 인라인 주입한다.
      // srcDoc iframe 에선 외부 <script src> 가 비동기로 늦게 실행될 수 있어, 인라인 init 이
      // window.CaseCharts 를 undefined 로 캡처 → 차트가 안 그려진다. 인라인이면 실행 순서 보장.
      fetch(CHART_BUNDLE_URL).then((r) => (r.ok ? r.text() : '')).catch(() => ''),
    ]).then(([res, bundle]) => {
      if (cancelled) return;
      const { data, error } = res;
      if (error) { setErr(error.message); return; }
      if (!data?.html) { setErr('아직 데이터가 없습니다. 로컬에서 gen 스크립트를 실행해 DB에 적재하세요.'); return; }
      let out = data.html as string;
      if (bundle) {
        // </script> 가 번들 문자열에 있으면 인라인 스크립트가 조기 종료되므로 이스케이프.
        const safe = bundle.replace(/<\/script>/gi, '<\\/script>');
        out = out.replace(/<script src="(?:\/marketing\/strategy\/)?case-charts\.js[^"]*"><\/script>/g, `<script>${safe}</script>`);
      } else {
        // 폴백: 번들 fetch 실패 시 절대경로 외부 로드라도 시도 (srcDoc base 가 부모라 상대경로는 404).
        out = out.replace(/src="case-charts\.js/g, `src="${CHART_BUNDLE_URL}`);
      }
      setHtml(out);
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
