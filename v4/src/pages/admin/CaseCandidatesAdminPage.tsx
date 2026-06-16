import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

// 치료사례 후보(전체 상세, PHI) — prod admin 동적 조회.
// 데이터는 ai-server 가 case_candidates_doc(RLS 차단, service_role)에서 admin 인증 후 반환.
// 로컬에서 `node cases/gen_case_profiles.mjs` 실행 시 DB 에 적재됨.
const AI = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:4000';

export default function CaseCandidatesAdminPage() {
  const user = useAuthStore((s) => s.user);
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user?.email || !user?.password) {
      setErr('로그인 정보가 없습니다. 다시 로그인해 주세요.');
      return;
    }
    let cancelled = false;
    fetch(`${AI}/api/case-candidates`, {
      headers: { 'x-admin-email': user.email, 'x-admin-password': user.password },
    })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.message || body.error || `HTTP ${r.status}`);
        return body as { html: string; updatedAt: string | null };
      })
      .then((d) => {
        if (cancelled) return;
        // srcDoc iframe 은 base 가 부모(/admin/cases)라 상대경로 case-charts.js 가 404.
        // 절대경로로 바꿔 부모 origin(/marketing/strategy/case-charts.js, prod tracked)에서 로드.
        setHtml(d.html.replace(/src="case-charts\.js/g, 'src="/marketing/strategy/case-charts.js'));
      })
      .catch((e) => { if (!cancelled) setErr(String(e.message)); });
    return () => { cancelled = true; };
  }, [user]);

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
