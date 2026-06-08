import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSubmissions } from '@/features/admin/services/intakeSubmissionService';
import IntakeSubmissionDetail from '@/features/admin/components/IntakeSubmissionDetail';
import { countryFlag, countryLabel } from '@/shared/data/countries';
import type { IntakeSubmission, IntakeLang } from '@/features/intake/types';

// ================================================
// AdminIntakePage — 설문 접수함
// 공개 설문 제출 목록(대기/승인/반려/전체) + 우측 상세 + 승인/반려.
// ================================================

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'pending', label: '대기' },
  { key: 'approved', label: '승인' },
  { key: 'rejected', label: '반려' },
  { key: 'all', label: '전체' },
];

const SHARE_LANGS: { lang: IntakeLang; flag: string; label: string }[] = [
  { lang: 'ko', flag: '🇰🇷', label: '한국어' },
  { lang: 'th', flag: '🇹🇭', label: 'ไทย' },
  { lang: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
  { lang: 'en', flag: '🇺🇸', label: 'English' },
];

function ShareLinkBar() {
  const [copied, setCopied] = useState<IntakeLang | null>(null);

  async function copy(lang: IntakeLang) {
    const url = `${window.location.origin}/intake/${lang}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for non-secure contexts where Clipboard API is blocked.
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(lang);
    setTimeout(() => setCopied((c) => (c === lang ? null : c)), 1500);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <span className="text-xs font-semibold text-slate-500">설문 링크 복사</span>
      {SHARE_LANGS.map((s) => (
        <button
          key={s.lang}
          type="button"
          onClick={() => copy(s.lang)}
          title={`${window.location.origin}/intake/${s.lang}`}
          className={
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ' +
            (copied === s.lang
              ? 'bg-emerald-500 text-white'
              : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100')
          }
        >
          <span>{s.flag}</span>
          <span>{s.label}</span>
          <span className="text-[10px] opacity-70">
            {copied === s.lang ? '복사됨 ✓' : '📋'}
          </span>
        </button>
      ))}
    </div>
  );
}

function fmtDate(iso: string): string {
  return iso ? iso.slice(0, 10) : '—';
}

function StatusBadge({ status }: { status: IntakeSubmission['status'] }) {
  const map: Record<IntakeSubmission['status'], string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-600',
  };
  const label: Record<IntakeSubmission['status'], string> = {
    pending: '대기',
    approved: '승인',
    rejected: '반려',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}

export default function AdminIntakePage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [subs, setSubs] = useState<IntakeSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 전체를 한 번 fetch → 국가/상태는 클라에서 필터링(국가별 미처리 배지 계산 위해).
  async function load() {
    try {
      setLoading(true);
      const data = await fetchSubmissions('all');
      setSubs(data);
      setSelectedId((prev) => (prev && data.some((s) => s.id === prev) ? prev : null));
    } catch {
      setSubs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // 국가 목록 + 국가별 미처리(pending) 카운트
  const countries = [...new Set(subs.map((s) => s.country).filter((c): c is string => !!c))].sort();
  const pendingByCountry = subs.reduce<Record<string, number>>((acc, s) => {
    if (s.status === 'pending' && s.country) acc[s.country] = (acc[s.country] ?? 0) + 1;
    return acc;
  }, {});
  const totalPending = subs.filter((s) => s.status === 'pending').length;

  // 국가 → 상태 순으로 필터
  const byCountry = countryFilter === 'all' ? subs : subs.filter((s) => s.country === countryFilter);
  const filtered = statusFilter === 'all' ? byCountry : byCountry.filter((s) => s.status === statusFilter);

  const selected = subs.find((s) => s.id === selectedId) ?? null;

  const countryTabs = [
    { code: 'all', label: '전체', flag: '🌐' },
    ...countries.map((c) => ({ code: c, label: countryLabel(c) || c, flag: countryFlag(c) || '🏳️' })),
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">설문 접수함</h1>
        {!loading && (
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            {filtered.length}
          </span>
        )}
        <div className="w-full sm:ml-auto sm:w-auto">
          <ShareLinkBar />
        </div>
      </div>

      {/* Country tabs (with pending badge) */}
      <div className="flex flex-wrap gap-1.5">
        {countryTabs.map((c) => {
          const pending = c.code === 'all' ? totalPending : pendingByCountry[c.code] ?? 0;
          const active = countryFilter === c.code;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => setCountryFilter(c.code)}
              className={
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ' +
                (active
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50')
              }
            >
              <span>{c.flag}</span>
              <span>{c.label}</span>
              {pending > 0 && (
                <span
                  className={
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ' +
                    (active ? 'bg-amber-400 text-amber-950' : 'bg-amber-500 text-white')
                  }
                  title={`미처리 ${pending}건`}
                >
                  {pending}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key)}
            className={
              'rounded-full px-3 py-1 text-xs font-medium transition ' +
              (statusFilter === f.key
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50')
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
        {/* List */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">
              불러오는 중...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">
              {statusFilter === 'pending'
                ? '대기 중인 설문이 없습니다'
                : '해당하는 설문이 없습니다'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((s) => {
                const active = s.id === selectedId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={
                        'flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors ' +
                        (active ? 'bg-blue-50' : 'hover:bg-gray-50')
                      }
                    >
                      <div className="flex items-center gap-2">
                        {countryFlag(s.country) && (
                          <span>{countryFlag(s.country)}</span>
                        )}
                        <span className="font-medium text-gray-900">
                          {s.name || '(미입력)'}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                          {s.lang.toUpperCase()}
                        </span>
                        <div className="ml-auto">
                          <StatusBadge status={s.status} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-mono">{fmtDate(s.created_at)}</span>
                        <span>·</span>
                        <span>{s.uploads.length}개 첨부</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div>
          {selected ? (
            <IntakeSubmissionDetail
              key={selected.id}
              sub={selected}
              onApproved={(childId) => {
                load();
                navigate(`/admin/patients/${childId}`);
              }}
              onRejected={() => {
                setSelectedId(null);
                load();
              }}
            />
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20 text-sm text-gray-400">
              왼쪽 목록에서 설문을 선택하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
