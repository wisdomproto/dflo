// 치료사례 카드 — 접힘(기본정보 + 원장 노트) / 펼침(그래프 탭 + 뼈나이 회차 기록).
import { useState } from 'react';
import type { TreatmentCase } from './treatmentCaseService';
import { CaseChartTabs } from './CaseChartTabs';
import { TEXT, fmtAge, fmtDur, gapYM, nameText, tagText, ymText, type CaseLang } from './casesText';

// 뼈나이 촬영 회차별 원자료 — 회차마다 실제 나이 대비 뼈나이가 어떻게 움직였는지가 이 치료의 핵심 근거.
function BoneRoundTable({ ms, lang }: { ms: TreatmentCase['chart']['measurements']; lang: CaseLang }) {
  const rows = ms.filter((m) => m.bone_age != null);
  const t = TEXT[lang];
  if (rows.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-3 py-2 text-[12px] font-bold text-slate-700">
        {t.tableTitle} <span className="font-normal text-slate-400">{t.tableCount(rows.length)}</span>
      </div>
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-x-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10.5px] font-bold text-slate-500">
        <span>{t.axisAge}</span>
        <span>{t.axisBone}</span>
        <span>{t.axisGap}</span>
        <span className="text-right">{t.colHeight}</span>
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
              {ymText(ca, lang)}
              {m.followup && <span className="ml-1 text-[9.5px] font-bold text-purple-600">{t.followup}</span>}
            </span>
            <span className="text-orange-600">{ymText(m.bone_age as number, lang)}</span>
            <span className={`font-bold ${gap > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{gapYM(gap, lang)}</span>
            <span className="text-right font-semibold text-slate-800">{m.height}cm</span>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, from, to, delta }: { label: string; from: number; to: number; delta: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-[13px] font-medium text-slate-400">
        {from}
        <span className="mx-1 text-slate-300">→</span>
        <b className="text-[17px] font-extrabold text-slate-900">{to}</b>
        <span className="ml-0.5 text-[11px] text-slate-500">cm</span>
      </div>
      {delta > 0 && <div className="mt-0.5 text-[11px] font-extrabold text-emerald-600">+{delta}cm</div>}
    </div>
  );
}

export function CaseCard({ c, lang }: { c: TreatmentCase; lang: CaseLang }) {
  const [open, setOpen] = useState(false);
  const t = TEXT[lang];
  const isF = c.gender === '여';
  const accent = isF ? '#d6336c' : '#2563EB';
  const hasFollowup = c.chart.measurements.some((m) => m.followup);
  const story = lang === 'en' && c.story?.story_en ? { title: c.story.title_en ?? '', story: c.story.story_en } : c.story;
  const parents = [
    { label: t.father, v: c.fa },
    { label: t.mother, v: c.mo },
    { label: t.mph, v: c.mph },
    { label: t.desired, v: c.desired, accent: true },
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
              <span className="text-[16px] font-extrabold text-slate-900">{nameText(c.name, lang)}</span>
              <span className="text-[12px] font-semibold" style={{ color: accent }}>
                {isF ? t.girl : t.boy}
              </span>
              {c.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {tagText(tag, lang)}
                </span>
              ))}
            </div>
            <div className="text-[12px] text-slate-500">
              {fmtAge(c.ageAtFirst, lang)} → {fmtAge(c.ageAtLast, lang)}
            </div>
          </div>
        </div>

        {/* 기본 정보 — 치료기간이 제일 크게(짧다는 게 핵심). 기간은 뼈나이 회차 기준이라 나이 구간보다 짧을 수 있다. */}
        <div className="mt-3 rounded-xl px-3 py-2.5 text-center" style={{ background: isF ? '#fdeef4' : '#eef3ff' }}>
          <div className="text-[11px] font-bold" style={{ color: accent }}>
            {t.duration}
          </div>
          <div className="text-[24px] font-extrabold leading-tight" style={{ color: accent }}>
            {fmtDur(c.months, lang)}
          </div>
          {hasFollowup && <div className="text-[11px] text-slate-500">{t.afterFollowup}</div>}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label={t.actualHeight} from={c.hFirst} to={c.hLast} delta={c.hDelta} />
          <Stat label={t.predictedHeight} from={c.pahFirst} to={c.pahLast} delta={c.pahDelta} />
        </div>

        {parents.length > 0 && (
          <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-slate-50 px-2 py-2.5 text-center">
            {parents.map((p) => (
              <div key={p.label}>
                <div className="text-[10.5px] font-semibold text-slate-500">{p.label}</div>
                <div className="text-[15px] font-extrabold" style={{ color: p.accent ? accent : '#1e293b' }}>
                  {p.v}
                  <span className="text-[10.5px] font-bold">cm</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 원장 노트는 접힌 상태에서도 읽히게 — 펼침은 그래프·회차 데이터 전용. */}
        {story && (
          <div className="mt-3">
            <div className="text-[11px] font-bold tracking-wide text-slate-400">{t.doctorNote}</div>
            <h3 className="mt-1 text-[15px] font-extrabold text-slate-900">{story.title}</h3>
            <div className="mt-2 space-y-2.5">
              {story.story.split(/\n{2,}/).map((p, i) => (
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
          {open ? t.closeDetail : t.openDetail}
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-slate-100 bg-slate-50/50 p-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <CaseChartTabs data={c.chart} lang={lang} />
          </div>
          <BoneRoundTable ms={c.chart.measurements} lang={lang} />
        </div>
      )}
    </article>
  );
}
