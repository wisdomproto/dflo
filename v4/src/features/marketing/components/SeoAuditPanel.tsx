// src/features/marketing/components/SeoAuditPanel.tsx
// 우측 SEO 감사 패널 — URL 입력 → 규칙 기반 4엔진 점수 + 이슈 리스트 (키 없이 동작).
// 결과 저장(supabase) + AI 개선 제안(Gemini 게이트, 502 시 안내 배지) + URL별 점수 추이.
import { useState } from 'react';
import {
  runAudit,
  saveAudit,
  getSuggestions,
  type AuditResult,
  type AuditIssue,
  type SavedAudit,
} from '../services/marketingAuditService';

const ENGINE_LABEL: Record<AuditIssue['engine'], string> = {
  google: '구글',
  naver: '네이버',
  geo: 'GEO',
  tech: '기술',
};
const ENGINE_BADGE: Record<AuditIssue['engine'], string> = {
  google: 'bg-blue-100 text-blue-700',
  naver: 'bg-emerald-100 text-emerald-700',
  geo: 'bg-purple-100 text-purple-700',
  tech: 'bg-gray-200 text-gray-700',
};

function scoreColor(n: number): string {
  if (n >= 80) return 'text-emerald-600';
  if (n >= 50) return 'text-amber-600';
  return 'text-red-600';
}
function barColor(n: number): string {
  if (n >= 80) return 'bg-emerald-500';
  if (n >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function Gauge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`text-lg font-bold tabular-nums ${scoreColor(value)}`}>{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded bg-gray-100">
        <div className={`h-full rounded ${barColor(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname || url;
  } catch {
    return url;
  }
}

export function SeoAuditPanel({ history, onSaved }: { history: SavedAudit[]; onSaved: () => void }) {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestErr, setSuggestErr] = useState<string | null>(null);

  const run = async () => {
    const target = url.trim();
    if (!target) {
      setErr('분석할 URL을 입력하세요.');
      return;
    }
    setLoading(true);
    setErr(null);
    setSaved(false);
    setSuggestions([]);
    setSuggestErr(null);
    try {
      const r = await runAudit(target);
      setResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '감사 실패');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    setErr(null);
    try {
      await saveAudit(result);
      setSaved(true);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const suggest = async () => {
    if (!result) return;
    setSuggesting(true);
    setSuggestErr(null);
    try {
      const s = await getSuggestions({ url: result.url, scores: result.scores, issues: result.issues });
      setSuggestions(s);
    } catch (e) {
      setSuggestErr(e instanceof Error ? e.message : '제안 생성 실패');
    } finally {
      setSuggesting(false);
    }
  };

  // 현재 결과 URL과 같은 path 의 과거 감사 추이.
  const urlHistory = result
    ? history.filter((h) => pathOf(h.url) === pathOf(result.url)).slice(0, 8)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="분석할 페이지 URL (https://…)"
          className="min-w-[240px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-[#4A2D6B] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {loading ? '분석 중…' : '분석'}
        </button>
      </div>
      {err && <p className="text-xs text-red-500">{err}</p>}

      {!result && !loading && (
        <p className="py-10 text-center text-sm text-gray-400">
          URL을 입력하면 구글 · 네이버 · GEO · 기술 점수와 개선 이슈를 분석합니다.
        </p>
      )}

      {result && (
        <>
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{result.title || '(제목 없음)'}</span>
            <span className="ml-2 break-all">{result.url}</span>
          </div>

          {/* 4엔진 점수 게이지 */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Gauge label="구글" value={result.scores.google} />
            <Gauge label="네이버" value={result.scores.naver} />
            <Gauge label="GEO" value={result.scores.geo} />
            <Gauge label="기술" value={result.scores.tech} />
          </div>

          {/* 온페이지 신호 요약 */}
          <div className="flex flex-wrap gap-1.5 text-[11px] text-gray-500">
            <span className="rounded bg-gray-100 px-2 py-0.5">H1 {result.meta.h1Count}</span>
            <span className="rounded bg-gray-100 px-2 py-0.5">H2 {result.meta.h2Count}</span>
            <span className="rounded bg-gray-100 px-2 py-0.5">이미지 {result.meta.imageCount}</span>
            <span className="rounded bg-gray-100 px-2 py-0.5">링크 {result.meta.linkCount}</span>
            <span className="rounded bg-gray-100 px-2 py-0.5">{result.meta.textLength.toLocaleString()}자</span>
            <span className="rounded bg-gray-100 px-2 py-0.5">
              {result.meta.isHttps ? 'HTTPS ✓' : 'HTTPS ✗'}
            </span>
            <span className="rounded bg-gray-100 px-2 py-0.5">
              스키마 {result.meta.hasSchema ? '✓' : '✗'}
            </span>
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving || saved}
              className="rounded-lg border border-[#4A2D6B] px-3 py-1.5 text-sm font-semibold text-[#4A2D6B] disabled:opacity-40"
            >
              {saved ? '✓ 저장됨' : saving ? '저장 중…' : '결과 저장'}
            </button>
            <button
              type="button"
              onClick={suggest}
              disabled={suggesting}
              className="rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-semibold text-amber-900 disabled:opacity-40"
            >
              {suggesting ? '생성 중…' : '✨ AI 개선 제안'}
            </button>
            {suggestErr && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-600">
                키 만료 — 제안 일시 중단
              </span>
            )}
          </div>

          {suggestErr && <p className="text-[11px] text-gray-400">{suggestErr}</p>}
          {suggestions.length > 0 && (
            <ol className="list-inside list-decimal space-y-1 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}

          {/* 이슈 리스트 */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-gray-500">개선 이슈 ({result.issues.length})</h4>
            {result.issues.length === 0 ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                발견된 이슈가 없습니다. 훌륭합니다!
              </p>
            ) : (
              <ul className="space-y-1.5">
                {result.issues.map((iss, i) => (
                  <li
                    key={i}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      iss.severity === 'critical'
                        ? 'border-red-200 bg-red-50'
                        : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${ENGINE_BADGE[iss.engine]}`}>
                        {ENGINE_LABEL[iss.engine]}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          iss.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                        }`}
                      >
                        {iss.severity === 'critical' ? '치명적' : '경고'}
                      </span>
                      <span className="font-medium text-gray-800">{iss.message}</span>
                    </div>
                    {iss.fixAction && <p className="mt-0.5 pl-1 text-gray-500">→ {iss.fixAction}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* URL별 점수 추이 */}
          {urlHistory.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-500">이 URL 점수 추이</h4>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-400">
                    <th className="py-1">일시</th>
                    <th className="py-1 text-right">구글</th>
                    <th className="py-1 text-right">네이버</th>
                    <th className="py-1 text-right">GEO</th>
                    <th className="py-1 text-right">기술</th>
                    <th className="py-1 text-right">이슈</th>
                  </tr>
                </thead>
                <tbody>
                  {urlHistory.map((h, i) => (
                    <tr key={i} className="border-b border-gray-100 tabular-nums">
                      <td className="py-1 text-gray-500">{h.createdAt.slice(0, 16).replace('T', ' ')}</td>
                      <td className="py-1 text-right">{h.googleScore}</td>
                      <td className="py-1 text-right">{h.naverScore}</td>
                      <td className="py-1 text-right">{h.geoScore}</td>
                      <td className="py-1 text-right">{h.techScore}</td>
                      <td className="py-1 text-right text-gray-500">{h.issueCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
