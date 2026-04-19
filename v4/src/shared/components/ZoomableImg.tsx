import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  alt: string;
  className?: string;
}

type Point = { x: number; y: number };
type Stroke = { color: string; size: number; points: Point[] };

const PEN_COLOR = '#ef4444'; // red
const PEN_SIZE = 2.5;

/**
 * Image with three modes driven by a small toolbar:
 *   - Pan/Zoom (default): mouse wheel zooms in/out (15% per tick), drag
 *     pans while zoomed.
 *   - Draw: free-hand overlay on top of image. Strokes are kept separately
 *     for the normal view vs the zoomed view ("따로 그리면 될듯").
 *   - Clear: wipe strokes of the CURRENT view only.
 *
 * Coords are stored in container-space (0..w, 0..h of the wrapper). When the
 * wrapper resizes, the canvas DPI stays pinned, so strokes redraw correctly.
 */
export function ZoomableImg({ src, alt, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Continuous zoom level. 1 = fit, >1 = zoomed in.
  const [zoomLevel, setZoomLevel] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const pan = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const [tool, setTool] = useState<'pan' | 'draw'>('pan');
  const [normalStrokes, setNormalStrokes] = useState<Stroke[]>([]);
  const [zoomedStrokes, setZoomedStrokes] = useState<Stroke[]>([]);
  const drawing = useRef<Stroke | null>(null);

  const zoomed = zoomLevel > 1.001;
  const currentStrokes = zoomed ? zoomedStrokes : normalStrokes;
  const setCurrentStrokes = zoomed ? setZoomedStrokes : setNormalStrokes;

  const ZOOM_MIN = 1;
  const ZOOM_MAX = 8;

  // Release pan on mouseup anywhere.
  useEffect(() => {
    const onUp = () => {
      pan.current = null;
      setPanning(false);
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  // Mouse wheel → zoom in/out. Bind natively with passive:false so we can
  // preventDefault() and stop the page from scrolling while the cursor is
  // over the image wrapper.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e: WheelEvent) => {
      if (tool === 'draw') return;
      e.preventDefault();
      e.stopPropagation();
      const direction = e.deltaY < 0 ? 1 : -1; // up → in, down → out
      const factor = direction > 0 ? 1.15 : 1 / 1.15;
      setZoomLevel((z) => {
        const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z * factor));
        if (next <= ZOOM_MIN + 0.001) setOffset({ x: 0, y: 0 });
        return next;
      });
    };
    wrap.addEventListener('wheel', onWheel, { passive: false });
    return () => wrap.removeEventListener('wheel', onWheel);
  }, [tool]);

  // Size canvas to wrapper + repaint on any stroke/state change.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (const stroke of currentStrokes) {
      drawStroke(ctx, stroke);
    }
    if (drawing.current) drawStroke(ctx, drawing.current);
  }, [currentStrokes, zoomed, zoomLevel]);

  // Repaint on resize.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      // Trigger a re-run of the layout effect via state.
      setNormalStrokes((s) => [...s]);
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const toContainerCoord = (e: React.MouseEvent): Point => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const cursor =
    tool === 'draw'
      ? 'crosshair'
      : zoomed
        ? panning
          ? 'grabbing'
          : 'grab'
        : 'default';

  return (
    <div
      ref={wrapRef}
      className={`relative h-full w-full overflow-hidden ${className ?? ''}`}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        if (tool === 'draw') {
          e.preventDefault();
          e.stopPropagation();
          drawing.current = {
            color: PEN_COLOR,
            size: PEN_SIZE,
            points: [toContainerCoord(e)],
          };
          // Force a repaint.
          setCurrentStrokes((s) => [...s]);
          return;
        }
        if (!zoomed) return;
        e.preventDefault();
        pan.current = {
          sx: e.clientX,
          sy: e.clientY,
          ox: offset.x,
          oy: offset.y,
        };
        setPanning(true);
      }}
      onMouseMove={(e) => {
        if (tool === 'draw' && drawing.current) {
          drawing.current.points.push(toContainerCoord(e));
          // Incremental paint of just the latest segment.
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) drawStroke(ctx, drawing.current);
          return;
        }
        if (!zoomed || !pan.current) return;
        setOffset({
          x: pan.current.ox + (e.clientX - pan.current.sx),
          y: pan.current.oy + (e.clientY - pan.current.sy),
        });
      }}
      onMouseUp={(e) => {
        if (tool === 'draw' && drawing.current) {
          const s = drawing.current;
          drawing.current = null;
          if (s.points.length > 1) {
            setCurrentStrokes((prev) => [...prev, s]);
          }
          e.stopPropagation();
        }
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="h-full w-full select-none object-contain"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: panning ? 'none' : 'transform 180ms ease',
          pointerEvents: 'none',
        }}
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0"
      />
      <Toolbar
        tool={tool}
        onToolChange={setTool}
        onClear={() => setCurrentStrokes([])}
        zoomed={zoomed}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ cursor }}
      />
    </div>
  );
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (s.points.length === 0) return;
  ctx.save();
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(s.points[0].x, s.points[0].y);
  for (let i = 1; i < s.points.length; i++) {
    ctx.lineTo(s.points[i].x, s.points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function Toolbar({
  tool,
  onToolChange,
  onClear,
  zoomed,
}: {
  tool: 'pan' | 'draw';
  onToolChange: (t: 'pan' | 'draw') => void;
  onClear: () => void;
  zoomed: boolean;
}) {
  return (
    <div className="absolute left-1 top-1 z-10 flex gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToolChange(tool === 'pan' ? 'draw' : 'pan');
        }}
        title={tool === 'pan' ? '그리기 모드로 전환' : '이동/확대 모드로 전환'}
        className={`pointer-events-auto h-6 rounded px-1.5 text-[11px] font-semibold shadow ${
          tool === 'draw'
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-white/90 text-slate-700 hover:bg-white'
        }`}
      >
        {tool === 'draw' ? '✏️ 그리기' : '🖱 이동'}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        title={zoomed ? '확대 뷰 그림 지우기' : '그림 지우기'}
        className="pointer-events-auto h-6 rounded bg-white/90 px-1.5 text-[11px] font-semibold text-slate-700 shadow hover:bg-white"
      >
        🗑
      </button>
    </div>
  );
}
