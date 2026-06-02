import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Child,
  HospitalMeasurement,
  LabTest,
  Visit,
} from '@/shared/types';
import { upsertMeasurementField } from '@/features/hospital/services/hospitalMeasurementService';
import { updateVisit } from '@/features/hospital/services/visitService';
import {
  fetchLabTestsByVisit,
  createLabTest,
} from '@/features/hospital/services/labTestService';
import { predictAdultHeightByBonePercentile } from '@/features/bone-age/lib/growthPrediction';
import { splitBoneAgeYM, parseBoneAgeDec } from '@/shared/utils/boneAge';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import { usePasteTarget } from '@/shared/hooks/usePasteTarget';
import {
  fetchXrayReadingsByVisit,
  syncXrayReadingBoneAge,
} from '@/features/bone-age/services/xrayReadingService';
import { XrayPanel } from './XrayPanel';
import { PrescriptionsBlock } from './PrescriptionsBlock';
import { LifestylePanel } from './LifestylePanel';
import { PanelContent, panelTypeOf } from './LabHistoryPanel';

interface Props {
  child: Child;
  visit: Visit;
  measurements: HospitalMeasurement[];
  onMeasurementChanged: (m: HospitalMeasurement) => void;
  /** Called after X-ray save so the parent can refresh measurements (bone_age sync). */
  onXraySaved: () => void;
  onNationalityChange?: (next: 'KR' | 'CN') => void;
}

/**
 * Middle-column visit workspace — shows the currently selected visit in
 * four sections: 측정 / X-ray / Lab / 처방. Each section edits its own slice
 * of clinical data and keeps the other sections untouched.
 */
export function VisitDetailPanel({
  child,
  visit,
  measurements,
  onMeasurementChanged,
  onXraySaved,
  onNationalityChange,
}: Props) {
  const m = measurements.find((x) => x.visit_id === visit.id) ?? null;
  const chronoAge = calculateAgeAtDate(child.birth_date, new Date(visit.visit_date));
  const nationality = child.nationality ?? 'KR';

  // Live bone age + PAH from XrayPanel so the 측정 section shows the same
  // working values the clinician is editing in X-ray (no stale drift).
  const [liveXray, setLiveXray] = useState<{
    boneAge: number | null;
    predictedAdult: number | null;
  }>({ boneAge: null, predictedAdult: null });

  // Reset live state when switching to a different visit.
  useEffect(() => {
    setLiveXray({ boneAge: null, predictedAdult: null });
  }, [visit.id]);

  // Presence probes so X-ray and Lab sections auto-collapse when empty.
  const [hasXrayImage, setHasXrayImage] = useState<boolean | null>(null);
  const [labFileCount, setLabFileCount] = useState<number | null>(null);

  // Bumped after we sync BA into xray_readings from the 진료 내역 탭 so the
  // XrayPanel re-fetches its row and shows the new value instead of stale state.
  const [xrayRefreshKey, setXrayRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setHasXrayImage(null);
    setLabFileCount(null);
    (async () => {
      try {
        const [xrs, labs] = await Promise.all([
          fetchXrayReadingsByVisit(visit.id),
          fetchLabTestsByVisit(visit.id),
        ]);
        if (cancelled) return;
        setHasXrayImage(xrs.some((r) => !!r.image_path));
        // Count = file attachments + structured panel rows (blood/IgG4/etc.)
        const files = labs.flatMap(
          (l) =>
            (l.result_data as unknown as { files?: { name: string; url: string }[] })
              ?.files ?? [],
        );
        const structured = labs.filter((l) => {
          const rd = l.result_data as { items?: unknown[] } | null;
          return l.test_type !== 'attachment' && Array.isArray(rd?.items) && rd!.items!.length > 0;
        });
        setLabFileCount(files.length + structured.length);
      } catch (e) {
        if (!cancelled) {
          logger.error('section presence probe failed', e);
          setHasXrayImage(false);
          setLabFileCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visit.id]);

  // 측정 grid 입력 미리보기: NumberField 가 onBlur 시점에 saveField 를 호출해
  // measurements prop 이 갱신되기 전까지는 PAH/헤더 BA 가 stale 상태로 남는다.
  // 입력 즉시(=onChange) NumberField 가 이 draft 를 부모에 push 하도록 onLocal
  // 콜백을 연결해서, draft 가 있으면 그 값으로 PAH 를 미리 계산한다. 저장은
  // 여전히 onBlur 시점에만 일어남.
  const [heightDraft, setHeightDraft] = useState<number | null>(null);
  const [weightDraft, setWeightDraft] = useState<number | null>(null);
  const [boneAgeDraft, setBoneAgeDraft] = useState<number | null>(null);
  // 뼈나이는 "0년 0개월 → null(미측정)"로 비우는 것도 허용해야 하므로, draft 가
  // null 인 것만으로는 "안 건드림"과 "0,0 으로 지움"을 구분할 수 없다. 사용자가
  // 뼈나이 칸을 한 번이라도 편집했는지를 별도 플래그로 추적한다.
  const [boneAgeTouched, setBoneAgeTouched] = useState(false);
  // 측정 섹션은 자동(blur) 저장 대신 명시적 "저장" 버튼으로 한 번에 저장한다.
  // dirty: 드래프트가 하나라도 바뀌었는지(버튼 활성화용). saved: 저장 직후 배지.
  const [savingMeasure, setSavingMeasure] = useState(false);
  const [savedMeasure, setSavedMeasure] = useState(false);
  useEffect(() => {
    setHeightDraft(null);
    setWeightDraft(null);
    setBoneAgeDraft(null);
    setBoneAgeTouched(false);
    setSavedMeasure(false);
  }, [visit.id]);
  const measureDirty = heightDraft != null || weightDraft != null || boneAgeTouched;

  const effectiveHeight = heightDraft ?? m?.height ?? null;
  // 뼈나이를 편집했으면(0,0 으로 비운 경우 포함) draft 값을 그대로 쓴다(null = 미측정).
  // 안 건드렸으면 저장된 m.bone_age 를 쓴다.
  const effectiveBaForCalc = boneAgeTouched ? boneAgeDraft : (m?.bone_age ?? null);
  const effectiveBoneAge = liveXray.boneAge ?? effectiveBaForCalc;
  const pah = useMemo(() => {
    if (liveXray.predictedAdult != null) return liveXray.predictedAdult;
    if (effectiveHeight && effectiveBaForCalc) {
      return predictAdultHeightByBonePercentile(
        effectiveHeight,
        effectiveBaForCalc,
        child.gender === 'male' ? 'M' : 'F',
        nationality,
      );
    }
    return null;
  }, [liveXray.predictedAdult, effectiveHeight, effectiveBaForCalc, child.gender, nationality]);

  const saveField = async (
    patch: Partial<Pick<HospitalMeasurement, 'height' | 'weight' | 'bone_age' | 'pah' | 'doctor_notes'>>,
  ) => {
    try {
      const next = await upsertMeasurementField({
        visit_id: visit.id,
        child_id: child.id,
        measured_date: visit.visit_date,
        patch,
      });
      onMeasurementChanged(next);
      // 진료 내역 탭에서 BA를 수정했으면 같은 회차의 xray_readings row 도
      // 같이 동기화해 X-ray 탭과 값을 일치시킨다 (row 없으면 no-op).
      if ('bone_age' in patch) {
        await syncXrayReadingBoneAge(visit.id, patch.bone_age ?? null);
        onXraySaved();
        setXrayRefreshKey((k) => k + 1);
      }
    } catch (e) {
      logger.error('measurement save failed', e);
    }
  };

  // 측정 "저장" 버튼: 입력된 드래프트(키/몸무게/뼈나이)를 한 번에 저장.
  const saveMeasurement = async () => {
    const patch: Partial<Pick<HospitalMeasurement, 'height' | 'weight' | 'bone_age'>> = {};
    if (heightDraft != null) patch.height = heightDraft;
    if (weightDraft != null) patch.weight = weightDraft;
    // 뼈나이는 편집됐으면 draft 를 그대로 저장 — boneAgeDraft 가 null 이면(0,0 입력)
    // bone_age 를 null 로 비워 "측정 안 함"으로 만든다.
    if (boneAgeTouched) patch.bone_age = boneAgeDraft ?? null;
    if (Object.keys(patch).length === 0) return;
    setSavingMeasure(true);
    try {
      await saveField(patch);
      setHeightDraft(null);
      setWeightDraft(null);
      setBoneAgeDraft(null);
      setBoneAgeTouched(false);
      setSavedMeasure(true);
      setTimeout(() => setSavedMeasure(false), 2000);
    } finally {
      setSavingMeasure(false);
    }
  };

  // Tab state — the visit's data was formerly a vertical stack of every
  // section at once; splitting into tabs keeps the middle pane focused on
  // one aspect at a time while the left column still drives visit selection.
  type TabKey = 'clinical' | 'xray' | 'lab' | 'lifestyle';
  const [tab, setTab] = useState<TabKey>('clinical');

  // Summary badge shape: text + flag so empty/populated states can be styled
  // differently in the tab bar (e.g. muted red for missing data).
  type TabSummary = { text: string; empty: boolean };
  const tabs: Array<{ key: TabKey; label: string; summary?: TabSummary }> = [
    { key: 'clinical', label: '진료 내역' },
    {
      key: 'xray',
      label: 'X-ray 검사',
      summary: hasXrayImage === false ? { text: '없음', empty: true } : undefined,
    },
    {
      key: 'lab',
      label: 'Lab 테스트',
      summary:
        labFileCount == null
          ? undefined
          : labFileCount > 0
            ? { text: String(labFileCount), empty: false }
            : { text: '없음', empty: true },
    },
    { key: 'lifestyle', label: '생활습관' },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pb-24">
      {/* Header + Tab bar stay pinned while the active tab's content scrolls. */}
      <div className="sticky top-0 z-10 flex shrink-0 flex-col gap-2 bg-slate-50 pb-1 pt-0">
        <div className="flex items-baseline justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-900">{visit.visit_date}</span>
            <span className="text-[11px] text-slate-500">
              CA {chronoAge.years}년 {chronoAge.months}개월
            </span>
            {effectiveBoneAge != null && (
              <span className="text-[11px] text-slate-500">BA {effectiveBoneAge.toFixed(1)}</span>
            )}
            {pah != null && (
              <span className="text-[11px] text-indigo-600">PAH {pah.toFixed(1)}</span>
            )}
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-200 bg-slate-50">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                'relative -mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ' +
                (active
                  ? 'border-indigo-500 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700')
              }
            >
              <span>{t.label}</span>
              {t.summary != null && (
                <span
                  className={
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold ' +
                    (t.summary.empty
                      ? 'bg-rose-50 text-rose-500 ring-1 ring-rose-100'
                      : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100')
                  }
                >
                  {t.summary.text}
                </span>
              )}
            </button>
          );
        })}
        </div>
      </div>

      {tab === 'clinical' && (
        <>
          <Section title="측정" accent="emerald">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[3fr_3fr_6fr_4fr]">
              {/* 자동(blur) 저장 끔(autoSave=false) — 아래 "저장" 버튼으로 한 번에
                  저장. 입력은 onLocal 로 부모 draft 에 실시간 반영(PAH 미리보기). */}
              <NumberField
                label="키 (cm)"
                value={m?.height ?? null}
                step={0.1}
                autoSave={false}
                onSave={(v) => saveField({ height: v ?? undefined })}
                onLocal={setHeightDraft}
              />
              <NumberField
                label="몸무게 (kg)"
                value={m?.weight ?? null}
                step={0.1}
                autoSave={false}
                onSave={(v) => saveField({ weight: v ?? undefined })}
                onLocal={setWeightDraft}
              />
              {/* 뼈나이: 년/개월 2칸 입력. 내부적으로 소수점 년(bone_age =
                  년 + 개월/12)으로 변환·저장. 저장 시 hospital_measurements.bone_age
                  + (있으면) xray_readings.bone_age_result 같이 동기화. */}
              <BoneAgeYMField
                value={effectiveBoneAge}
                autoSave={false}
                onSave={(v) => saveField({ bone_age: v ?? undefined })}
                onLocal={(v) => {
                  setBoneAgeDraft(v);
                  setBoneAgeTouched(true);
                }}
              />
              {/* 예측 성인키: BA + 키로 자동 계산 (read-only). */}
              <div className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                <div className="flex items-center gap-1">
                  <span>예측 성인키</span>
                  <HelpTip text="키·뼈나이 기반 자동 계산" />
                </div>
                <div className="flex h-9 items-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-sm font-bold text-indigo-900">
                  {pah != null ? `${pah.toFixed(1)} cm` : '—'}
                </div>
              </div>
            </div>
            {/* 측정 저장 버튼 — 키/몸무게/뼈나이 드래프트를 한 번에 저장. */}
            <div className="mt-3 flex items-center justify-end gap-2">
              {savedMeasure && (
                <span className="text-[12px] font-semibold text-emerald-600">✓ 저장됨</span>
              )}
              <button
                type="button"
                onClick={saveMeasurement}
                disabled={!measureDirty || savingMeasure}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savingMeasure ? '저장 중…' : '저장'}
              </button>
            </div>
          </Section>

          <Section title="처방" accent="violet">
            <PrescriptionsBlock visitId={visit.id} childId={child.id} />
          </Section>

          <Section title="메모" accent="sky">
            <VisitNotesField visit={visit} />
          </Section>

          <Section title="판독문 원본" accent="indigo">
            <PandokmunPages child={child} visitId={visit.id} />
          </Section>
        </>
      )}

      {tab === 'xray' && (
        <Section title="X-ray" accent="indigo">
          <XrayPanel
            child={child}
            visit={visit}
            measurements={measurements}
            collapsed={false}
            onToggleCollapse={() => {
              /* no-op inside VisitDetailPanel; zoom button handles expansion */
            }}
            onSaved={onXraySaved}
            embedded
            onNationalityChange={onNationalityChange}
            onLiveChange={setLiveXray}
            refreshKey={xrayRefreshKey}
          />
        </Section>
      )}

      {tab === 'lab' && (
        <Section title="검사 (Lab)" accent="sky">
          <LabSection
            visitId={visit.id}
            childId={child.id}
            visitDate={visit.visit_date}
          />
        </Section>
      )}

      {tab === 'lifestyle' && (
        <Section title="생활 습관 (진료 전 30일)" accent="emerald">
          <LifestylePanel childId={child.id} anchorDate={visit.visit_date} />
        </Section>
      )}
    </div>
  );
}

/** Editable textarea bound to visits.notes. Saves onBlur when the value
 *  changes so the user can free-type without intermediate network calls. */
function VisitNotesField({ visit }: { visit: Visit }) {
  // Fallback to measurement.notes (OCR memo imported there) when the visit
  // row itself has no memo yet, so historical data renders without a backfill.
  const initial = visit.notes ?? '';
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-sync when the selected visit changes.
  useEffect(() => {
    setValue(visit.notes ?? '');
    setSaved(false);
  }, [visit.id, visit.notes]);

  const commit = async () => {
    if (value === (visit.notes ?? '')) return;
    setSaving(true);
    try {
      await updateVisit(visit.id, { notes: value || null });
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      logger.error('visit notes save failed', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        rows={3}
        placeholder="진료 메모 (자동 저장)"
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200"
      />
      <div className="h-4 text-[11px] text-slate-400">
        {saving ? '저장 중…' : saved ? '✓ 저장됨' : ''}
      </div>
    </div>
  );
}

function Section({
  title,
  accent,
  children,
  collapsible = false,
  defaultCollapsed = false,
  summary,
}: {
  title: string;
  accent: 'emerald' | 'indigo' | 'sky' | 'violet';
  children: React.ReactNode;
  /** Render a collapse toggle in the header. Default false. */
  collapsible?: boolean;
  /** Initial collapsed state (only used when collapsible). Re-evaluated
   *  whenever the value changes — useful when parent recomputes based on
   *  whether data exists for the selected visit. */
  defaultCollapsed?: boolean;
  /** Small text shown next to the title summarizing the collapsed state
   *  (e.g. "이미지 없음" or "첨부 3"). */
  summary?: string;
}) {
  const bars: Record<typeof accent, string> = {
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-500',
    sky: 'bg-sky-500',
    violet: 'bg-violet-500',
  };
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  // Sync with parent-calculated default when it changes (e.g. new visit
  // selected and it has/doesn't have data for this section).
  useEffect(() => {
    if (!collapsible) return;
    setCollapsed(defaultCollapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCollapsed]);

  return (
    <section className="relative shrink-0 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-lg ${bars[accent]}`}
      />
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2 pl-5 text-[12px] font-semibold uppercase tracking-wide text-slate-700">
        <div className="flex items-baseline gap-2">
          <span>{title}</span>
          {summary && <span className="text-[10px] font-normal text-slate-400 normal-case tracking-normal">{summary}</span>}
        </div>
        {collapsible && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? '펼치기' : '접기'}
            aria-label={collapsed ? '펼치기' : '접기'}
            className="h-6 w-6 rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            {collapsed ? '▾' : '▴'}
          </button>
        )}
      </div>
      {!collapsed && <div className="px-4 py-3 pl-5">{children}</div>}
    </section>
  );
}

function NumberField({
  label,
  value,
  step = 1,
  onSave,
  onLocal,
  hint,
  autoSave = true,
}: {
  label: string;
  value: number | null;
  step?: number;
  onSave: (v: number | null) => void;
  /** 입력 즉시 부모에 push (저장은 아직 안 함). PAH 미리보기 같은 파생값을
   *  실시간 반영하고 싶을 때 사용. */
  onLocal?: (parsed: number | null) => void;
  /** Live helper line shown below the input. Receives the currently typed
   *  numeric value (parsed). Use for unit clarification etc. */
  hint?: (parsed: number | null) => string;
  /** false 면 onBlur 자동 저장을 끈다(외부 "저장" 버튼이 책임짐). 기본 true. */
  autoSave?: boolean;
}) {
  const [local, setLocal] = useState<string>(value == null ? '' : String(value));
  useEffect(() => setLocal(value == null ? '' : String(value)), [value]);
  const parsedLocal = local.trim() === '' ? null : Number(local);
  const safeParsed = parsedLocal != null && !Number.isNaN(parsedLocal) ? parsedLocal : null;
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
        value={local}
        onChange={(e) => {
          const v = e.target.value;
          setLocal(v);
          if (onLocal) {
            const trimmed = v.trim();
            const p = trimmed === '' ? null : Number(trimmed);
            onLocal(p != null && !Number.isNaN(p) ? p : null);
          }
        }}
        onBlur={() => {
          if (!autoSave) return; // 외부 "저장" 버튼이 저장 담당
          const trimmed = local.trim();
          const parsed = trimmed === '' ? null : Number(trimmed);
          if (parsed !== null && Number.isNaN(parsed)) return;
          const currentStr = value == null ? '' : String(value);
          if (trimmed !== currentStr) onSave(parsed);
        }}
      />
      {hint && (
        <span className="text-[10px] font-normal normal-case tracking-normal text-slate-400">
          {hint(safeParsed)}
        </span>
      )}
    </label>
  );
}

/** 뼈나이 입력 — 년/개월 2칸. 내부 저장값은 소수점 년(bone_age = 년 + 개월/12).
 *  임상 표기("13년 6개월")를 그대로 입력하게 해서 "13.2" 식 단위 혼동을 없앤다. */
function BoneAgeYMField({
  value,
  onSave,
  onLocal,
  autoSave = true,
}: {
  value: number | null;
  onSave: (v: number | null) => void;
  onLocal?: (parsed: number | null) => void;
  /** false 면 blur 자동 저장을 끈다(외부 "저장" 버튼이 책임짐). 기본 true. */
  autoSave?: boolean;
}) {
  // 편집(focus) 중이 아니면 표시값을 value(소수점 년)에서 직접 파생 → 측정칸이
  // 항상 헤더(effectiveBoneAge)와 같은 값을 년/개월로 보여준다. 편집 중에는
  // 로컬 draft 가 우선이라, 입력 도중 value 가 바뀌어도(=onLocal 이 PAH 미리보기용
  // boneAgeDraft 를 바꿔 effectiveBoneAge 가 흔들려도) 타이핑이 덮이지 않는다.
  const [draft, setDraft] = useState<{ y: string; m: string } | null>(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(null);
  }, [value, focused]);
  const shown = draft ?? splitBoneAgeYM(value);
  const y = shown.y;
  const mo = shown.m;

  const commit = () => {
    setFocused(false);
    if (!autoSave) return; // 외부 "저장" 버튼이 저장 담당 (draft 는 onLocal 로 전달됨)
    // 실제 입력(draft)이 없으면 단순 focus→blur 로는 저장하지 않는다(스냅 방지).
    // 입력했으면 무조건 onSave 한다. value(=effectiveBoneAge)는 onLocal 로 입력
    // 즉시 같이 변하므로 value 와 비교해 "변경 없음"으로 판단하면 저장이 누락된다.
    if (draft == null) return;
    onSave(parseBoneAgeDec(y, mo));
  };

  // type=number 스피너 화살표 제거([appearance:textfield] + webkit spin-button
  // none) → 좁은 칸에서 화살표가 먹던 오른쪽 공간이 비어 입력한 숫자가 보인다.
  const inputCls =
    'h-9 w-full rounded-lg border border-slate-200 bg-white pl-2 pr-7 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none';

  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
      <span className="text-center">뼈나이</span>
      <div className="flex items-stretch gap-1.5">
        <div className="relative flex-1">
          <input
            type="number"
            step={1}
            min={0}
            className={inputCls}
            value={y}
            onFocus={() => setFocused(true)}
            onChange={(e) => {
              setDraft({ y: e.target.value, m: mo });
              if (onLocal) onLocal(parseBoneAgeDec(e.target.value, mo));
            }}
            onBlur={commit}
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-normal normal-case text-slate-400">
            년
          </span>
        </div>
        <div className="relative flex-1">
          <input
            type="number"
            step={1}
            min={0}
            max={11}
            className={inputCls}
            value={mo}
            onFocus={() => setFocused(true)}
            onChange={(e) => {
              setDraft({ y, m: e.target.value });
              if (onLocal) onLocal(parseBoneAgeDec(y, e.target.value));
            }}
            onBlur={commit}
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-normal normal-case text-slate-400">
            개월
          </span>
        </div>
      </div>
    </div>
  );
}


function HelpTip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group">
      <span
        aria-label={text}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-500 normal-case tracking-normal hover:border-slate-400 hover:text-slate-700"
      >
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium normal-case tracking-normal text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

// ========================= Lab section =========================

type LabFile = { name: string; url: string };

function isImageFile(f: LabFile): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(f.name);
}

function LabSection({
  visitId,
  childId,
  visitDate,
}: {
  visitId: string;
  childId: string;
  visitDate: string;
}) {
  const [labs, setLabs] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const xs = await fetchLabTestsByVisit(visitId);
      setLabs(xs);
    } catch (e) {
      logger.error('fetch labs failed', e);
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const uploadOne = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return;
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `lab/${childId}/${visitId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('content-images')
      .upload(path, file, { upsert: false });
    if (upErr) throw upErr;
    const {
      data: { publicUrl },
    } = supabase.storage.from('content-images').getPublicUrl(path);
    await createLabTest({
      visit_id: visitId,
      child_id: childId,
      test_type: 'attachment',
      collected_date: visitDate,
      result_data: { files: [{ name: file.name, url: publicUrl }] },
    });
  };

  const uploadAll = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const f of files) {
        try {
          await uploadOne(f);
        } catch (e) {
          logger.error('lab upload failed', e);
        }
      }
      await reload();
    } finally {
      setUploading(false);
    }
  };

  const { armed, wrapperProps } = usePasteTarget({
    onPaste: (f) => uploadAll([f]),
  });

  const allFiles: LabFile[] = labs.flatMap(
    (l) => (l.result_data as unknown as { files?: LabFile[] })?.files ?? [],
  );
  const imageFiles = allFiles.filter(isImageFile);
  const pdfFiles = allFiles.filter((f) => !isImageFile(f));

  // Labs with parsed numeric panels (blood, IgG4, MAST, NK, OAP, hair).
  // Attachment-only rows are rendered via the images/pdf grids below, so we
  // skip them here to avoid a redundant "첨부" block.
  const structuredLabs = labs.filter((l) => {
    const rd = l.result_data as { panel_type?: string; items?: unknown[] } | null;
    if (!rd) return false;
    if (l.test_type === 'attachment') return false;
    return Array.isArray(rd.items) && rd.items.length > 0;
  });

  return (
    <div className="flex flex-col gap-3">
      {loading ? (
        <div className="text-xs text-slate-400">불러오는 중…</div>
      ) : (
        <>
          {/* Parsed panel results (blood / IgG4 / MAST / NK / OAP) */}
          {structuredLabs.map((lab) => {
            const panel = panelTypeOf(lab);
            const rd = lab.result_data as Record<string, unknown>;
            return (
              <div
                key={lab.id}
                className="rounded-lg border border-slate-200 bg-white"
              >
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600">
                  <span className="font-semibold uppercase tracking-wider">
                    {panel === 'blood'
                      ? '혈액'
                      : panel === 'food_intolerance'
                        ? 'IgG4 음식'
                        : panel === 'mast_allergy'
                          ? 'MAST'
                          : panel === 'nk_activity'
                            ? 'NK 활성도'
                            : panel === 'organic_acid'
                              ? '유기산'
                              : panel === 'hair_mineral'
                                ? '모발 중금속'
                                : '기타'}
                  </span>
                  <span>
                    {lab.collected_date ?? '—'}
                    {typeof rd.accession === 'string' && (
                      <span className="ml-2 text-slate-400">{rd.accession}</span>
                    )}
                  </span>
                </div>
                <div className="p-2">
                  <PanelContent panel={panel} data={rd} />
                </div>
              </div>
            );
          })}

          {imageFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {imageFiles.map((f, i) => (
                <button
                  key={`${f.url}-${i}`}
                  type="button"
                  onClick={() => setLightboxIdx(i)}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm transition hover:ring-2 hover:ring-sky-300"
                  title={f.name}
                >
                  <img
                    src={f.url}
                    alt={f.name}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          {pdfFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pdfFiles.map((f, i) => (
                <a
                  key={i}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                >
                  📎 {f.name}
                </a>
              ))}
            </div>
          )}

          {imageFiles.length === 0 && pdfFiles.length === 0 && structuredLabs.length === 0 && (
            <div className="text-xs text-slate-400">검사 기록이 없습니다.</div>
          )}
        </>
      )}

      <div
        {...wrapperProps}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const files = Array.from(e.dataTransfer.files ?? []);
          if (files.length > 0) uploadAll(files);
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-3 py-4 text-center text-xs font-medium transition ${
          armed
            ? 'border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100'
            : drag
              ? 'border-sky-500 bg-sky-50 text-sky-700'
              : 'border-slate-300 bg-slate-50/50 text-slate-500 hover:border-sky-300 hover:bg-sky-50/50'
        }`}
      >
        {uploading
          ? '업로드 중…'
          : armed
            ? '📋 붙여넣기 대기 중 — Ctrl+V'
            : '📎 검사 파일 첨부 (드래그 · 클릭 후 붙여넣기)'}
      </div>

      {lightboxIdx != null && (
        <LabLightbox
          files={imageFiles}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
}

function LabLightbox({
  files,
  startIndex,
  onClose,
}: {
  files: LabFile[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const prev = () => setIdx((i) => (i - 1 + files.length) % files.length);
  const next = () => setIdx((i) => (i + 1) % files.length);
  const prevRef = useRef(prev);
  const nextRef = useRef(next);
  prevRef.current = prev;
  nextRef.current = next;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prevRef.current();
      else if (e.key === 'ArrowRight') nextRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const file = files[idx];
  if (!file) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        className="mb-2 flex w-full max-w-5xl items-center justify-between text-xs text-white/80"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="truncate">
          {file.name}
          <span className="ml-2 opacity-70">
            {idx + 1} / {files.length}
          </span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded bg-white/10 hover:bg-white/20"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
      <div
        className="relative flex w-full max-w-5xl flex-1 items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={file.url}
          src={file.url}
          alt={file.name}
          className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
        />
        {files.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="이전"
              className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-slate-800 shadow hover:bg-white"
            >
              ←
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="다음"
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-slate-800 shadow hover:bg-white"
            >
              →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Mirrors the 판독문 review UI: one large page at a time with prev/next
 *  paging, a thumb strip below, and a full-screen viewer on click. Pulls the
 *  per-visit filename list + flat URL map from children.intake_survey.raw_files.
 */
function PandokmunPages({ child, visitId }: { child: Child; visitId: string }) {
  const rf = (child.intake_survey as {
    raw_files?: {
      pandokmun?: Array<{ filename: string; url: string }>;
      pandokmun_by_visit?: Record<string, string[]>;
    };
  } | null)?.raw_files;
  const filenames = rf?.pandokmun_by_visit?.[visitId] ?? [];
  const urlByName = useMemo(
    () => new Map((rf?.pandokmun ?? []).map((e) => [e.filename, e.url])),
    [rf],
  );
  const pages = filenames
    .map((fn) => ({ filename: fn, url: urlByName.get(fn) }))
    .filter((p): p is { filename: string; url: string } => !!p.url);

  // 라이트박스(전체 보기)는 이 환자의 "모든 회차" 판독문을 넘겨볼 수 있게 한다 —
  // 한 회차에 판독문이 1장뿐이어도 ←/→ 로 이전·다음 판독문 이동 가능.
  const allPages = useMemo(
    () =>
      (rf?.pandokmun ?? []).filter(
        (p): p is { filename: string; url: string } => !!p.url,
      ),
    [rf],
  );

  const [idx, setIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [lbIdx, setLbIdx] = useState(0); // 라이트박스 인덱스(allPages 기준)
  // Reset page pointer when switching visits.
  useEffect(() => {
    setIdx(0);
  }, [visitId]);

  // 라이트박스에서 ←/→ 로 전체 판독문 이동, Esc 로 닫기.
  const allCount = allPages.length;
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setLbIdx((i) => Math.max(0, i - 1));
      else if (e.key === 'ArrowRight') setLbIdx((i) => Math.min(allCount - 1, i + 1));
      else if (e.key === 'Escape') setZoomed(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed, allCount]);

  if (pages.length === 0) {
    return (
      <div className="text-xs text-slate-400">
        이 회차와 연결된 판독문 페이지가 없습니다.
      </div>
    );
  }

  const current = pages[Math.min(idx, pages.length - 1)];
  const canPrev = idx > 0;
  const canNext = idx < pages.length - 1;

  // 전체 보기 열기: 현재 보고 있는 페이지를 allPages 에서 찾아 거기서 시작.
  const openLightbox = () => {
    const i = allPages.findIndex((p) => p.filename === current.filename);
    setLbIdx(i >= 0 ? i : 0);
    setZoomed(true);
  };
  const lbCurrent = allPages[Math.min(lbIdx, Math.max(0, allPages.length - 1))] ?? current;
  const lbCanPrev = lbIdx > 0;
  const lbCanNext = lbIdx < allPages.length - 1;

  return (
    <div className="flex flex-col gap-2">
      {/* Top toolbar: prev / label / next / zoom-to-full */}
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
        >
          ◀
        </button>
        <span className="tabular-nums text-slate-600">
          {idx + 1} / {pages.length}
        </span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => setIdx((i) => Math.min(pages.length - 1, i + 1))}
          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
        >
          ▶
        </button>
        <span className="truncate text-slate-500">{current.filename}</span>
        <button
          type="button"
          onClick={openLightbox}
          className="ml-auto rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-700 hover:bg-slate-100"
        >
          전체 보기
        </button>
      </div>

      {/* Main image */}
      <div
        className="cursor-zoom-in overflow-hidden rounded-lg border border-slate-200 bg-white"
        onClick={openLightbox}
        title="클릭하여 전체 보기"
      >
        <img
          src={current.url}
          alt={current.filename}
          className="h-auto w-full object-contain"
        />
      </div>

      {/* Thumb strip (only when there's more than one page) */}
      {pages.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto">
          {pages.map((p, i) => (
            <button
              key={p.filename}
              type="button"
              onClick={() => setIdx(i)}
              className={
                'shrink-0 overflow-hidden rounded border bg-white transition ' +
                (i === idx
                  ? 'border-indigo-500 ring-2 ring-indigo-200'
                  : 'border-slate-200 hover:border-slate-400')
              }
              title={p.filename}
            >
              <img
                src={p.url}
                alt={p.filename}
                loading="lazy"
                className="h-16 w-12 object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen lightbox — ←/→ 키 또는 좌우 버튼으로 이전·다음, Esc/배경클릭 닫기 */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomed(false)}
        >
          {/* 닫기 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoomed(false);
            }}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
            aria-label="닫기"
          >
            ✕
          </button>

          {/* 이전 */}
          {allPages.length > 1 && (
            <button
              type="button"
              disabled={!lbCanPrev}
              onClick={(e) => {
                e.stopPropagation();
                setLbIdx((i) => Math.max(0, i - 1));
              }}
              className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20 disabled:opacity-25"
              aria-label="이전 판독문"
            >
              ‹
            </button>
          )}

          <img
            src={lbCurrent.url}
            alt={lbCurrent.filename}
            className="max-h-[95vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* 다음 */}
          {allPages.length > 1 && (
            <button
              type="button"
              disabled={!lbCanNext}
              onClick={(e) => {
                e.stopPropagation();
                setLbIdx((i) => Math.min(allPages.length - 1, i + 1));
              }}
              className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20 disabled:opacity-25"
              aria-label="다음 판독문"
            >
              ›
            </button>
          )}

          {/* 페이지 카운터 + 파일명 */}
          {allPages.length > 1 && (
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
              <span className="tabular-nums">
                {lbIdx + 1} / {allPages.length}
              </span>
              <span className="max-w-[50vw] truncate text-white/70">{lbCurrent.filename}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

