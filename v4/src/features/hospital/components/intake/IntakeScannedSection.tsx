import type { ScannedIntake } from '@/shared/types';

/**
 * 스캔 초진기록지(손글씨)에서 OCR 추출 → 후보 매칭으로 연결된 미검증 데이터 표시.
 * 평소 접힘. 펼치면 원본 스캔(앞·뒷장) + 추출 필드(저신뢰·검토 강조). 읽기 전용.
 * 원본 이미지는 로컬 정적(/intake-review/img/, gitignore)이라 없으면 자동 숨김.
 */
const LABELS: Record<string, string> = {
  gender: '성별', gestational_weeks: '임신주수', birth_weight_kg: '출생몸무게',
  birth_notes: '출생특이', current_height_cm: '현재키', last_year_growth_cm: '작년성장',
  current_weight_kg: '현재몸무게', grade: '학년', class_height_rank: '학급키번호',
  father_height_cm: '아버지키', mother_height_cm: '어머니키', past_growth_clinic: '과거 성장클리닉',
  parents_interested: '부모 관심', child_interested: '아이 관심', desired_height_cm: '희망키',
  sports_athlete: '체육특기', past_clinic_visits: '과거 병원', puberty_note: '사춘기',
  causes: '원인', growth_history: '성장표', labs: '검사',
};
const ORDER = Object.keys(LABELS);

function imgUrls(ref?: string): string[] {
  const m = ref?.match(/(\w+)#p(\d+)/);
  if (!m) return [];
  const tag = m[1], p = Number(m[2]);
  const pad = (n: number) => String(n).padStart(3, '0');
  return [`/intake-review/img/${tag}_p${pad(p)}.jpg`, `/intake-review/img/${tag}_p${pad(p + 1)}.jpg`];
}

function fmt(key: string, v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? '예' : '아니오';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (key === 'sports_athlete' || key === 'past_clinic_visits') {
      const yn = o.yn == null ? '미상' : o.yn ? '예' : '아니오';
      const extra = (o.event || o.detail) as string | undefined;
      return extra ? `${yn} (${extra})` : yn;
    }
    if (key === 'growth_history') return Object.entries(o).map(([a, h]) => `${a}세:${h}`).join(', ');
    return Object.keys(o).length ? '있음' : '—';
  }
  return String(v);
}

export function IntakeScannedSection({ scanned }: { scanned: ScannedIntake }) {
  const lc = new Set(scanned.low_confidence || []);
  const nr = new Set(scanned.needs_review || []);
  const fields = scanned.fields || {};
  const keys = ORDER.filter((k) => k in fields && fmt(k, fields[k]) !== '—');
  const imgs = imgUrls((scanned.page_refs || [])[0]);
  const isScan = (scanned.source || []).includes('pdf');

  return (
    <details className="rounded-xl border border-amber-200 bg-amber-50/40">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3 text-sm">
        <span className="font-bold text-amber-800">📄 스캔 초진기록지</span>
        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">미검증</span>
        {scanned.name_read && <span className="text-slate-600">손글씨 판독: <b>{scanned.name_read}</b> {scanned.birth_read || ''}</span>}
        <span className="ml-auto text-[11px] text-slate-400">
          {scanned.match_type?.split(' ')[0]} · 저신뢰 {lc.size} · 검토 {nr.size}
        </span>
      </summary>

      <div className="space-y-3 border-t border-amber-200 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-amber-700">
          ⚠ 손글씨 스캔에서 자동 추출한 <b>미검증</b> 데이터입니다. 정확한 값은 우측 원본 스캔으로 확인하세요.
          <span className="text-amber-500"> 노랑=불확실 · 빨강=검토 필요(비현실적 값). 1차 컬럼·기존 문진은 건드리지 않았습니다.</span>
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          {/* 원본 스캔 */}
          {imgs.length > 0 && (
            <div className="space-y-2">
              {imgs.map((src, i) => (
                <figure key={src} className="m-0">
                  <figcaption className="mb-0.5 text-[10px] font-semibold text-slate-400">{i === 0 ? '앞장' : '뒷장'}</figcaption>
                  <a href={src} target="_blank" rel="noreferrer">
                    <img
                      src={src}
                      alt={i === 0 ? '앞장' : '뒷장'}
                      loading="lazy"
                      onError={(e) => { (e.currentTarget.closest('figure') as HTMLElement)?.style.setProperty('display', 'none'); }}
                      className="w-full rounded-lg border border-slate-200 shadow-sm"
                    />
                  </a>
                </figure>
              ))}
            </div>
          )}

          {/* 추출 필드 */}
          <div>
            <table className="w-full text-xs">
              <tbody>
                {keys.map((k) => {
                  const tone = nr.has(k) ? 'bg-red-50 text-red-700' : lc.has(k) ? 'bg-amber-50 text-amber-800' : '';
                  return (
                    <tr key={k} className="border-b border-slate-100 last:border-0">
                      <td className="w-24 py-1 pr-2 align-top font-semibold text-slate-500">{LABELS[k]}</td>
                      <td className={`py-1 ${tone}`}>
                        {nr.has(k) && '🔴 '}{lc.has(k) && !nr.has(k) && '⚠ '}{fmt(k, fields[k])}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!isScan && <p className="mt-2 text-[10px] text-slate-400">출처: docx 타이핑본(원본 스캔 이미지 없음)</p>}
            <p className="mt-2 text-[10px] text-slate-400">
              연결: {(scanned.source || []).join('+')} · {scanned.linked_at?.slice(0, 10)}
            </p>
          </div>
        </div>
      </div>
    </details>
  );
}
