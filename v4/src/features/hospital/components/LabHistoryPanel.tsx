import { useEffect, useMemo, useState } from 'react';
import type { LabTest } from '@/shared/types';
import { fetchLabTestsByChild } from '@/features/hospital/services/labTestService';

// ─── Panel classification helpers ───
// lab_tests.test_type is limited to 'allergy'|'organic_acid'|'blood'|'attachment'
// by the DB CHECK constraint. The OCR import pipeline stores the finer-grained
// panel under result_data.panel_type so we can distinguish IgG4 food panels
// from MAST allergen panels, etc.
type PanelType =
  | 'blood'
  | 'food_intolerance'
  | 'mast_allergy'
  | 'nk_activity'
  | 'organic_acid'
  | 'hair_mineral'
  | 'attachment'
  | 'unknown';

const PANEL_LABELS: Record<PanelType, string> = {
  blood: '혈액',
  food_intolerance: 'IgG4 음식',
  mast_allergy: 'MAST 알레르기',
  nk_activity: 'NK세포 활성도',
  organic_acid: '유기산',
  hair_mineral: '모발 중금속',
  attachment: '첨부',
  unknown: '기타',
};

const PANEL_ORDER: PanelType[] = [
  'blood',
  'food_intolerance',
  'mast_allergy',
  'nk_activity',
  'organic_acid',
  'hair_mineral',
  'attachment',
  'unknown',
];

function panelTypeOf(lab: LabTest): PanelType {
  const pt = (lab.result_data as { panel_type?: string } | undefined)?.panel_type;
  if (pt && PANEL_ORDER.includes(pt as PanelType)) return pt as PanelType;
  // Fallback: infer from the legacy test_type.
  if (lab.test_type === 'blood') return 'blood';
  if (lab.test_type === 'organic_acid') return 'organic_acid';
  if (lab.test_type === 'allergy') return 'food_intolerance';
  return 'unknown';
}

// ─── Panel-specific row renderers ───

type StandardItem = {
  code?: string | null;
  name?: string | null;
  value?: number | string | null;
  unit?: string | null;
  ref?: string | null;
  flag?: 'H' | 'L' | null;
  panel?: string | null;
  sample?: string | null;
};
type IgG4Item = { name: string; value?: number | string; class?: string; unit?: string };
type MastItem = { group?: string; name: string; value?: number | string; class?: string };
type OapMarker = { category?: string; marker: string; flag: string; notes?: string };
type NkData = { value?: number; unit?: string; category?: string };

function flagBadgeClass(flag?: string | null) {
  if (flag === 'H' || flag === 'BH') return 'bg-red-100 text-red-700';
  if (flag === 'L' || flag === 'BL') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-500';
}

function BloodPanelView({ data }: { data: Record<string, unknown> }) {
  const items = (data.items as StandardItem[] | undefined) ?? [];
  if (!items.length) return <p className="text-xs text-slate-400">결과 행 없음</p>;
  const flagged = items.filter((i) => i.flag);
  const rest = items.filter((i) => !i.flag);
  return (
    <div className="space-y-2">
      {flagged.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-semibold text-red-600">이상 수치 ({flagged.length})</p>
          <ResultTable rows={flagged} />
        </div>
      )}
      <details>
        <summary className="cursor-pointer text-[11px] text-slate-500">전체 {items.length}개 보기</summary>
        <ResultTable rows={rest.concat(flagged.filter((f) => !flagged.includes(f)))} />
      </details>
    </div>
  );
}

function ResultTable({ rows }: { rows: StandardItem[] }) {
  return (
    <table className="w-full text-xs">
      <thead className="text-[10px] text-slate-400">
        <tr className="border-b border-slate-200">
          <th className="text-left font-normal">검사명</th>
          <th className="text-right font-normal">결과</th>
          <th className="text-left font-normal pl-2">참고치</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-100 last:border-0">
            <td className="py-1 pr-2">{r.name}</td>
            <td className="py-1 text-right tabular-nums">
              <span>{r.value ?? '-'}</span>
              {r.flag && (
                <span className={`ml-1 rounded px-1 text-[10px] ${flagBadgeClass(r.flag)}`}>
                  {r.flag}
                </span>
              )}
            </td>
            <td className="py-1 pl-2 text-slate-500">{r.ref ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IgG4View({ data }: { data: Record<string, unknown> }) {
  const items = (data.items as IgG4Item[] | undefined) ?? [];
  const elevated = items.filter((i) => {
    const c = parseInt(i.class ?? '0', 10);
    return c >= 1;
  });
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-500">
        전체 {items.length}종, 양성 <span className="font-semibold text-red-600">{elevated.length}</span>종
      </p>
      {elevated.length > 0 && (
        <ul className="space-y-1 text-xs">
          {elevated
            .sort((a, b) => parseInt(b.class ?? '0', 10) - parseInt(a.class ?? '0', 10))
            .map((it, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>{it.name}</span>
                <span>
                  <span className="tabular-nums text-slate-600">{it.value}</span>
                  <span className="ml-2 rounded bg-orange-100 px-1 text-[10px] text-orange-700">
                    Class {it.class}
                  </span>
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function MastView({ data }: { data: Record<string, unknown> }) {
  const items = (data.items as MastItem[] | undefined) ?? [];
  const elevated = items.filter((i) => {
    const c = parseInt(i.class ?? '0', 10);
    return c >= 1;
  });
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-500">
        알레르겐 {items.length}개, 양성{' '}
        <span className="font-semibold text-red-600">{elevated.length}</span>개
      </p>
      {elevated.length > 0 && (
        <ul className="space-y-1 text-xs">
          {elevated
            .sort((a, b) => parseInt(b.class ?? '0', 10) - parseInt(a.class ?? '0', 10))
            .map((it, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>
                  <span className="text-slate-500">{it.group ? `[${it.group}] ` : ''}</span>
                  {it.name}
                </span>
                <span>
                  <span className="tabular-nums text-slate-600">{it.value}</span>
                  <span className="ml-2 rounded bg-orange-100 px-1 text-[10px] text-orange-700">
                    Class {it.class}
                  </span>
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function NkView({ data }: { data: Record<string, unknown> }) {
  const d = data as NkData;
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xl font-semibold tabular-nums text-slate-800">{d.value ?? '-'}</span>
      <span className="text-xs text-slate-500">{d.unit ?? 'pg/mL'}</span>
      {d.category && (
        <span className="ml-auto rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
          {d.category}
        </span>
      )}
    </div>
  );
}

function OapView({ data }: { data: Record<string, unknown> }) {
  const markers = (data.abnormal_markers as OapMarker[] | undefined) ?? [];
  if (!markers.length) return <p className="text-xs text-slate-400">이상 marker 없음</p>;
  const grouped = new Map<string, OapMarker[]>();
  for (const m of markers) {
    const k = m.category ?? '기타';
    const arr = grouped.get(k) ?? [];
    arr.push(m);
    grouped.set(k, arr);
  }
  return (
    <div className="space-y-2">
      {[...grouped.entries()].map(([category, ms]) => (
        <div key={category}>
          <p className="text-[11px] font-semibold text-slate-600">{category}</p>
          <ul className="ml-2 space-y-1 text-xs">
            {ms.map((m, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`shrink-0 rounded px-1 text-[10px] ${flagBadgeClass(m.flag)}`}>
                  {m.flag}
                </span>
                <span className="font-medium">{m.marker}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AttachmentView({ data }: { data: Record<string, unknown> }) {
  const pages = (data.pages as string[] | undefined) ?? [];
  return (
    <div className="text-xs text-slate-500">
      첨부 {pages.length}장 {pages.slice(0, 3).join(', ')}
      {pages.length > 3 && ` …외 ${pages.length - 3}장`}
    </div>
  );
}

function PanelContent({ panel, data }: { panel: PanelType; data: Record<string, unknown> }) {
  switch (panel) {
    case 'blood':
      return <BloodPanelView data={data} />;
    case 'food_intolerance':
      return <IgG4View data={data} />;
    case 'mast_allergy':
      return <MastView data={data} />;
    case 'nk_activity':
      return <NkView data={data} />;
    case 'organic_acid':
      return <OapView data={data} />;
    case 'hair_mineral':
    case 'attachment':
      return <AttachmentView data={data} />;
    default:
      return <p className="text-xs text-slate-400">미지원 패널</p>;
  }
}

// ─── Main component ───

export function LabHistoryPanel({ childId }: { childId: string }) {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPanel, setFilterPanel] = useState<PanelType | 'all'>('all');

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    fetchLabTestsByChild(childId)
      .then((t) => {
        if (!canceled) setTests(t);
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [childId]);

  const byPanel = useMemo(() => {
    const m = new Map<PanelType, LabTest[]>();
    for (const t of tests) {
      const p = panelTypeOf(t);
      m.set(p, [...(m.get(p) ?? []), t]);
    }
    return m;
  }, [tests]);

  const visibleTests = useMemo(() => {
    if (filterPanel === 'all') return tests;
    return tests.filter((t) => panelTypeOf(t) === filterPanel);
  }, [tests, filterPanel]);

  if (loading) return <p className="p-3 text-xs text-slate-400">검사 기록 로딩 중…</p>;
  if (!tests.length)
    return <p className="p-3 text-xs text-slate-400">저장된 검사 기록이 없습니다.</p>;

  return (
    <div className="space-y-3 p-3">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1">
        <FilterChip
          label={`전체 ${tests.length}`}
          active={filterPanel === 'all'}
          onClick={() => setFilterPanel('all')}
        />
        {PANEL_ORDER.filter((p) => byPanel.has(p)).map((p) => (
          <FilterChip
            key={p}
            label={`${PANEL_LABELS[p]} ${byPanel.get(p)!.length}`}
            active={filterPanel === p}
            onClick={() => setFilterPanel(p)}
          />
        ))}
      </div>

      {/* Lab order cards */}
      <div className="space-y-2">
        {visibleTests.map((t) => {
          const panel = panelTypeOf(t);
          return (
            <article
              key={t.id}
              className="rounded-md border border-slate-200 bg-white p-3"
            >
              <header className="mb-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">
                    {PANEL_LABELS[panel]}
                  </span>
                  <span className="text-slate-600">{t.collected_date ?? '-'}</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {(t.result_data as { accession?: string } | undefined)?.accession ?? ''}
                </span>
              </header>
              <PanelContent panel={panel} data={t.result_data as Record<string, unknown>} />
            </article>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-0.5 text-[11px] ${
        active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}
