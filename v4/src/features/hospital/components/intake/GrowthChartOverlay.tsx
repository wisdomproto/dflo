import { useEffect, useMemo, useRef, useState } from 'react';
import type { Child, HospitalMeasurement } from '@/shared/types';
import { predictAdultHeightByBonePercentile } from '@/features/bone-age/lib/growthPrediction';
import { calculateAgeAtDate } from '@/shared/utils/age';

interface Props {
  child: Child;
  measurement: HospitalMeasurement | null;
  /** ISO date used as "기준일". */
  referenceDate: string;
  /** Live-editing bone age from the X-ray panel (overrides measurement.bone_age
   *  before the user hits 저장). */
  liveBoneAge?: number | null;
  /** Live-editing predicted adult height from the X-ray panel. */
  livePredictedAdult?: number | null;
}

/**
 * Free-placement, resizable, editable text box rendered on top of the growth
 * chart. Header is hidden; the box is a clean translucent text panel. A small
 * floating toolbar appears only while the user is clicking/editing the box.
 *
 *   - Drag anywhere on the panel (outside the text area) to move it
 *   - Drag the bottom-right handle to resize
 *   - Click the text area to enter editing mode and reveal the toolbar
 *   - Toolbar: A− / A+ font size, ↺ sync from live data, × close editing
 *
 * Bone Age + PAH are derived from the current measurement/X-ray panel so the
 * box always reflects the latest BA entered upstream.
 */
export function GrowthChartOverlay({
  child,
  measurement,
  referenceDate,
  liveBoneAge,
  livePredictedAdult,
}: Props) {
  const computed = useMemo(
    () => computeTexts(child, measurement, referenceDate, liveBoneAge, livePredictedAdult),
    [child, measurement, referenceDate, liveBoneAge, livePredictedAdult],
  );

  // Per-patient persistence (text/pos/size/fontSize) but always keep BA/PAH
  // lines in sync by re-running computeTexts when the user never edited
  // manually (we track an "edited" flag).
  const storageKey = `intake.chart.overlay.${child.id}`;
  const initial = loadState(storageKey);

  const [text, setText] = useState<string>(initial?.text ?? computed);
  const lastComputed = useRef<string>(initial?.lastComputed ?? computed);
  const [size, setSize] = useState<{ w: number; h: number }>(
    initial?.size ?? { w: 280, h: 0 }, // h:0 → auto from content
  );
  const [pos, setPos] = useState<{ x: number; y: number } | null>(initial?.pos ?? null);
  const [fontSize, setFontSize] = useState<number>(initial?.fontSize ?? 12);
  const [editing, setEditing] = useState(false);

  // Keep text in sync with live data unless the user has manually edited it.
  // "Edited" is derived: if the currently-displayed text differs from the
  // previously-computed snapshot, the user changed it. Otherwise we update.
  useEffect(() => {
    if (text === lastComputed.current) {
      setText(computed);
    }
    lastComputed.current = computed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed]);

  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const resize = useRef<{ sx: number; sy: number; ow: number; oh: number } | null>(null);

  // Anchor to lower-right on first mount.
  useEffect(() => {
    if (pos != null) return;
    const el = containerRef.current;
    if (!el) return;
    const parent = el.offsetParent as HTMLElement | null;
    if (!parent) return;
    const pw = parent.clientWidth;
    const ph = parent.clientHeight;
    const h = el.offsetHeight || 100;
    setPos({ x: Math.max(0, pw - size.w - 16), y: Math.max(0, ph - h - 16) });
  }, [pos, size.w]);

  useEffect(() => {
    if (!pos) return;
    saveState(storageKey, { text, pos, size, fontSize, lastComputed: lastComputed.current });
  }, [storageKey, text, pos, size, fontSize]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (drag.current) {
        setPos({
          x: Math.max(0, drag.current.ox + (e.clientX - drag.current.sx)),
          y: Math.max(0, drag.current.oy + (e.clientY - drag.current.sy)),
        });
      } else if (resize.current) {
        setSize({
          w: Math.max(180, resize.current.ow + (e.clientX - resize.current.sx)),
          h: Math.max(60, resize.current.oh + (e.clientY - resize.current.sy)),
        });
      }
    };
    const onUp = () => {
      drag.current = null;
      resize.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Dismiss toolbar when clicking outside.
  useEffect(() => {
    if (!editing) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target as Node)) return;
      setEditing(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [editing]);

  const startDrag = (e: React.MouseEvent) => {
    if (!pos) return;
    // Only start dragging from non-text areas.
    if ((e.target as HTMLElement).closest('textarea,button,.gc-handle')) return;
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
  };

  return (
    <div
      ref={containerRef}
      className="group absolute z-20 select-none"
      style={{
        left: pos?.x ?? -9999,
        top: pos?.y ?? -9999,
        width: size.w,
        visibility: pos ? 'visible' : 'hidden',
        // 8px transparent frame around the textarea acts as a drag handle so
        // the user can click the edge to move the memo without losing the
        // ability to click into the text for editing.
        padding: 8,
        cursor: 'move',
      }}
      onMouseDown={startDrag}
      title="테두리를 드래그하여 이동"
    >
      {/* Floating toolbar — only while the box is active. */}
      {editing && (
        <div
          className="absolute -top-9 left-1/2 z-10 flex w-max max-w-none -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white/95 px-1.5 py-1 shadow-md backdrop-blur"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.max(8, s - 1))}
            className="h-6 w-6 rounded text-[11px] text-slate-600 hover:bg-slate-100"
            title="글자 작게"
          >
            A−
          </button>
          <span className="w-6 text-center text-[10px] text-slate-500">{fontSize}</span>
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.min(22, s + 1))}
            className="h-6 w-6 rounded text-[11px] text-slate-600 hover:bg-slate-100"
            title="글자 크게"
          >
            A+
          </button>
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <button
            type="button"
            onClick={() => {
              lastComputed.current = computed;
              setText(computed);
            }}
            className="h-6 rounded px-2 text-[11px] text-slate-600 hover:bg-slate-100"
            title="현재 데이터로 다시 채우기"
          >
            ↺ 초기화
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="h-6 w-6 rounded text-[12px] text-slate-500 hover:bg-slate-100"
            title="닫기"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hover/active dashed outline to signal the drag frame. Sits just
          outside the textarea so it doesn't interfere with editing. */}
      <div
        className={
          'pointer-events-none absolute inset-1 rounded-xl border border-dashed transition ' +
          (editing ? 'border-indigo-300' : 'border-transparent group-hover:border-slate-300')
        }
      />

      {/* Auto-growing textarea — single source; no separate display/edit states
          so no scroll, no header. Height always fits the content exactly. */}
      <AutoGrowTextarea
        value={text}
        fontSize={fontSize}
        active={editing}
        fixedHeight={size.h > 0 ? size.h : undefined}
        onFocus={() => setEditing(true)}
        onChange={(v) => setText(v)}
      />

      {/* Bottom-right corner resize handle — only visible while the box is
          active (editing) so it doesn't add visual clutter at rest. */}
      {editing && (
        <div
          className="gc-handle absolute bottom-0 right-0 z-20 h-4 w-4 cursor-nwse-resize rounded-br-xl"
          onMouseDown={(e) => {
            const el = containerRef.current?.querySelector('textarea') as HTMLTextAreaElement | null;
            const currentH = el?.offsetHeight ?? size.h;
            resize.current = { sx: e.clientX, sy: e.clientY, ow: size.w, oh: currentH };
            e.preventDefault();
            e.stopPropagation();
          }}
          title="드래그하여 크기 조정"
        >
          <svg viewBox="0 0 10 10" className="h-full w-full text-indigo-400">
            <path d="M10 0 L10 10 L0 10 Z" fill="currentColor" />
            <path d="M6 10 L10 6 M3 10 L10 3" stroke="white" strokeWidth="0.8" fill="none" />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * Transparent-ish textarea that auto-resizes to its content on every change.
 * Hides scroll bars; height follows content so everything is visible at once.
 */
function AutoGrowTextarea({
  value,
  fontSize,
  active,
  onFocus,
  onChange,
  fixedHeight,
}: {
  value: string;
  fontSize: number;
  active: boolean;
  onFocus: () => void;
  onChange: (v: string) => void;
  /** When set, use this height exactly (user-resized). When undefined, grow
   *  to fit the content. */
  fixedHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (fixedHeight != null) {
      el.style.height = `${fixedHeight}px`;
    } else {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value, fontSize, fixedHeight]);

  return (
    <textarea
      ref={ref}
      value={value}
      onFocus={onFocus}
      onChange={(e) => onChange(e.target.value)}
      style={{ fontSize, lineHeight: 1.55 }}
      className={
        'w-full resize-none rounded-xl bg-white/90 p-3 font-mono text-slate-800 shadow-md ring-1 backdrop-blur outline-none transition ' +
        (fixedHeight != null ? 'overflow-auto ' : 'overflow-hidden ') +
        (active ? 'ring-indigo-300' : 'ring-slate-200 hover:ring-slate-300')
      }
    />
  );
}

// --- helpers ---

function computeTexts(
  child: Child,
  m: HospitalMeasurement | null,
  referenceDate: string,
  liveBoneAge?: number | null,
  livePredictedAdult?: number | null,
): string {
  const ca = calculateAgeAtDate(child.birth_date, new Date(referenceDate)).decimal;
  // Prefer live X-ray panel values over the saved measurement so the box
  // reflects the current working BA/PAH even before 저장.
  const ba = liveBoneAge ?? m?.bone_age ?? null;
  const mph = midParentalHeight(child);
  const pahCalc =
    m?.height != null && ba != null
      ? predictAdultHeightByBonePercentile(
          m.height,
          ba,
          child.gender === 'male' ? 'M' : 'F',
          child.nationality ?? 'KR',
        )
      : null;
  const pah = livePredictedAdult ?? (pahCalc != null && pahCalc > 0 ? pahCalc : null);
  const desired = child.desired_height ?? null;

  return [
    `Chronologic age : ${ca.toFixed(1)} (기준일: ${referenceDate})`,
    `Bone Age : ${ba != null ? ba.toFixed(1) : '—'}`,
    `MPH : ${mph != null ? mph.toFixed(1) : '—'}`,
    `Bone-age based PAH : ${pah != null ? pah.toFixed(1) : '—'}`,
    `Desired Height : ${desired != null ? desired.toFixed(0) : '—'}`,
  ].join('\n');
}

function midParentalHeight(child: Child): number | null {
  const f = child.father_height;
  const m = child.mother_height;
  if (f == null || m == null) return null;
  const bias = child.gender === 'male' ? 6.5 : -6.5;
  return (f + m) / 2 + bias;
}

type Persisted = {
  text: string;
  pos: { x: number; y: number };
  size: { w: number; h: number };
  fontSize: number;
  lastComputed?: string;
  /** @deprecated kept for backward compat */
  edited?: boolean;
};

function loadState(key: string): Persisted | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(key: string, v: Persisted) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* noop */
  }
}
