// 치료사례 카드 — 접힘(요약) / 펼침(하이라이트·뼈나이 격차·부모키·원장 스토리·차트).
import { useState } from 'react';
import type { TreatmentCase } from './treatmentCaseService';
import { CaseChartTabs } from './CaseChartTabs';

const fmtAge = (a: number) => {
  const y = Math.floor(a);
  const m = Math.round((a - y) * 12);
  if (m >= 12) return `만 ${y + 1}세`;
  return m > 0 ? `만 ${y}세 ${m}개월` : `만 ${y}세`;
};
const fmtDur = (mo: number) => {
  const y = Math.floor(mo / 12);
  const m = mo % 12;
  return y > 0 ? (m > 0 ? `${y}년 ${m}개월` : `${y}년`) : `${m}개월`;
};
// 나이(소수 년) → "13세 3개월", 격차 → "+1년 9개월" / "−6개월"
const ymText = (dec: number) => {
  const t = Math.round(dec * 12);
  const y = Math.floor(t / 12);
  const m = t % 12;
  return m > 0 ? `${y}세 ${m}개월` : `${y}세`;
};
const gapYM = (dec: number) => {
  const t = Math.round(dec * 12);
  const sign = t > 0 ? '+' : t < 0 ? '−' : '';
  const a = Math.abs(t);
  const y = Math.floor(a / 12);
  const m = a % 12;
  const body = y > 0 ? (m > 0 ? `${y}년 ${m}개월` : `${y}년`) : `${m}개월`;
  return `${sign}${body}`;
};

// 뼈나이 촬영 회차별 원자료 — 회차마다 실제 나이 대비 뼈나이가 어떻게 움직였는지가 이 치료의 핵심 근거.
function BoneRoundTable({ ms }: { ms: TreatmentCase['chart']['measurements'] }) {
  const rows = ms.filter((m) => m.bone_age != null);
  if (rows.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-3 py-2 text-[12px] font-bold text-slate-700">
        🦴 뼈나이 회차별 기록 <span className="font-normal text-slate-400">({rows.length}회 촬영)</span>
      </div>
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-x-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10.5px] font-bold text-slate-500">
        <span>실제 나이</span>
        <span>뼈나이</span>
        <span>차이</span>
        <span className="text-right">키</span>
      </div>
      {rows.map((m, i) => {
        const ca = m.ageDecimal ?? 0;
        const gap = (m.bone_age as number) - ca;
        return (
          <div
            key={i}
            className={`grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-x-2 px-3 py-1.5 text-[11.5px] ${
              i % 2 ? 'bg-slate-50/60' : ''
            }`}
          >
            <span className="text-slate-600">
              {ymText(ca)}
              {m.followup && <span className="ml-1 text-[9.5px] font-bold text-purple-600">추적</span>}
            </span>
            <span className="text-orange-600">{ymText(m.bone_age as number)}</span>
            <span className={`font-bold ${gap > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{gapYM(gap)}</span>
            <span className="text-right font-semibold text-slate-800">{m.height}cm</span>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, from, to, delta, unit = 'cm' }: { label: string; from: number; to: number; delta: number; unit?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-[13px] font-medium text-slate-400">
        {from}
        <span className="mx-1 text-slate-300">→</span>
        <b className="text-[17px] font-extrabold text-slate-900">{to}</b>
        <span className="ml-0.5 text-[11px] text-slate-500">{unit}</span>
      </div>
      {delta > 0 && <div className="mt-0.5 text-[11px] font-extrabold text-emerald-600">+{delta}{unit}</div>}
    </div>
  );
}

export function CaseCard({ c }: { c: TreatmentCase }) {
  const [open, setOpen] = useState(false);
  const isF = c.gender === '여';
  const accent = isF ? '#d6336c' : '#2563EB';
  const hasFollowup = c.chart.measurements.some((m) => m.followup);
  const parents = [
    { label: '아버지', v: c.fa },
    { label: '어머니', v: c.mo },
    { label: '유전 기대키', v: c.mph },
    { label: '희망키', v: c.desired, accent: true },
  ].filter((p) => p.v);

  return (
    // 카드 경계를 세게 — 상단 성별 색 띠 + 펼침 시 테두리·그림자 강조로 "어디부터 어디까지가 한 아이인지" 구분.
    <article
      className={`overflow-hidden rounded-2xl border-2 bg-white transition ${open ? 'shadow-lg' : 'shadow-sm'}`}
      style={{ borderColor: open ? accent : '#e2e8f0' }}
    >
      <div className="h-1.5" style={{ background: accent }} />
      <div className="p-4">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[22px]"
            style={{ background: isF ? '#fdeef4' : '#eef3ff' }}
          >
            {isF ? '👧' : '👦'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-[16px] font-extrabold text-slate-900">{c.name}</span>
              <span className="text-[12px] font-semibold" style={{ color: accent }}>
                {isF ? '여아' : '남아'}
              </span>
              {c.tags.map((t) => (
                <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {t}
                </span>
              ))}
            </div>
            <div className="text-[12px] text-slate-500">
              {fmtAge(c.ageAtFirst)} → {fmtAge(c.ageAtLast)}
            </div>
          </div>
        </div>

        {/* 기본 정보 — 치료기간이 제일 크게(짧다는 게 핵심). 기간은 뼈나이 회차 기준이라 나이 구간보다 짧을 수 있다. */}
        <div className="mt-3 rounded-xl px-3 py-2.5 text-center" style={{ background: isF ? '#fdeef4' : '#eef3ff' }}>
          <div className="text-[11px] font-bold" style={{ color: accent }}>
            치료 기간
          </div>
          <div className="text-[24px] font-extrabold leading-tight" style={{ color: accent }}>
            {fmtDur(c.months)}
          </div>
          {hasFollowup && <div className="text-[11px] text-slate-500">이후는 추적 관찰</div>}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="실제 키" from={c.hFirst} to={c.hLast} delta={c.hDelta} />
          <Stat label="예상 성인키" from={c.pahFirst} to={c.pahLast} delta={c.pahDelta} />
        </div>

        {parents.length > 0 && (
          <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-slate-50 px-2 py-2.5 text-center">
            {parents.map((p) => (
              <div key={p.label}>
                <div className="text-[10.5px] font-semibold text-slate-500">{p.label}</div>
                <div
                  className="text-[15px] font-extrabold"
                  style={{ color: p.accent ? accent : '#1e293b' }}
                >
                  {p.v}
                  <span className="text-[10.5px] font-bold">cm</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 원장 노트는 접힌 상태에서도 읽히게 — 펼침은 그래프·회차 데이터 전용.
            (치료 요약 ✓ 목록은 기본정보·원장 노트와 내용이 겹쳐 제거) */}
        {c.story && (
          <div className="mt-3">
            <div className="text-[11px] font-bold tracking-wide text-slate-400">🩺 원장 노트</div>
            <h3 className="mt-1 text-[15px] font-extrabold text-slate-900">{c.story.title}</h3>
            <div className="mt-2 space-y-2.5">
              {c.story.story.split(/\n{2,}/).map((p, i) => (
                <p key={i} className="text-[13.5px] leading-[1.75] text-slate-700">
                  {p}
                </p>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-4 w-full rounded-xl border py-2.5 text-center text-[13px] font-bold"
          style={{ color: accent, borderColor: accent, background: isF ? '#fdeef4' : '#eef3ff' }}
        >
          {open ? '접기 ▴' : '📈 성장 그래프 · 뼈나이 회차 기록 보기 ▾'}
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-slate-100 bg-slate-50/50 p-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <CaseChartTabs data={c.chart} />
          </div>
          <BoneRoundTable ms={c.chart.measurements} />
        </div>
      )}
    </article>
  );
}
