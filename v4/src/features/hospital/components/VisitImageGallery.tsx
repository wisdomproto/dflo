import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchVisitImagesByVisit,
  fetchVisitImageSignedUrls,
  type VisitImage,
} from '@/features/hospital/services/visitImageService';
import { ZoomModal } from '@/shared/components/ZoomModal';
import { ZoomableImg } from '@/shared/components/ZoomableImg';

interface Props {
  visitId: string;
  /** MIME-safe drag payload identifier — the target drop zone listens for
   *  this type on dataTransfer and extracts the signed URL of the dragged
   *  thumbnail.  Keep this the same across the app so panels can mix/match. */
  dragType?: string;
}

const DEFAULT_DRAG_TYPE = 'application/x-xray-image-url';

/**
 * Horizontal thumbnail strip for every image attached to a visit.
 * Click → open in a zoom modal (with prev/next navigation).
 * Drag → dataTransfer carries the image's signed URL so another panel
 * (e.g. `XrayPanel` patient pane) can adopt it as its own image.
 */
export function VisitImageGallery({ visitId, dragType = DEFAULT_DRAG_TYPE }: Props) {
  const [rows, setRows] = useState<VisitImage[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomIdx, setZoomIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRows([]);
    setUrls({});
    (async () => {
      try {
        const list = await fetchVisitImagesByVisit(visitId);
        if (cancelled) return;
        setRows(list);
        const paths = list.map((r) => r.image_path);
        const signed = paths.length ? await fetchVisitImageSignedUrls(paths) : {};
        if (!cancelled) setUrls(signed);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '불러오기 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visitId]);

  const hasImages = rows.length > 0;

  const scroll = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const orderedUrls = useMemo(
    () => rows.map((r) => urls[r.image_path]).filter(Boolean) as string[],
    [rows, urls],
  );

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
        이미지 불러오는 중…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        {error}
      </div>
    );
  }
  if (!hasImages) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
        이 회차에 저장된 이미지가 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            회차 이미지 ({rows.length})
          </div>
          <div className="text-[10px] text-slate-400">
            클릭=크게 보기 · 드래그하여 환자 X-ray로 지정
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => scroll(-300)}
            aria-label="왼쪽으로 스크롤"
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 px-2 py-1 text-sm font-bold text-slate-700 shadow hover:bg-white"
          >
            ‹
          </button>
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scroll-smooth rounded-lg border border-slate-200 bg-slate-50 p-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            {rows.map((r, i) => {
              const url = urls[r.image_path];
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setZoomIdx(i)}
                  draggable={!!url}
                  onDragStart={(e) => {
                    if (!url) return;
                    e.dataTransfer.setData(dragType, url);
                    e.dataTransfer.setData('text/plain', url);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  title={r.source_file ?? r.image_path}
                  className="group relative h-28 w-28 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-900 transition hover:ring-2 hover:ring-indigo-400"
                >
                  {url ? (
                    <img
                      src={url}
                      alt={`image ${i + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                      로딩…
                    </div>
                  )}
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[9px] font-mono text-white">
                    #{r.image_index ?? i + 1}
                  </div>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => scroll(300)}
            aria-label="오른쪽으로 스크롤"
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 px-2 py-1 text-sm font-bold text-slate-700 shadow hover:bg-white"
          >
            ›
          </button>
        </div>
      </div>

      {zoomIdx !== null && orderedUrls[zoomIdx] && (
        <ZoomModal
          onClose={() => setZoomIdx(null)}
          title={`이미지 ${zoomIdx + 1} / ${orderedUrls.length}`}
          maxWidth="min(1400px, 95vw)"
        >
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <div className="relative h-full w-full min-h-[70vh] overflow-hidden rounded bg-slate-900">
              <ZoomableImg src={orderedUrls[zoomIdx]} alt={`이미지 ${zoomIdx + 1}`} />
              {zoomIdx > 0 && (
                <button
                  type="button"
                  onClick={() => setZoomIdx(zoomIdx - 1)}
                  aria-label="이전"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-lg font-bold text-slate-800 shadow hover:bg-white"
                >
                  ←
                </button>
              )}
              {zoomIdx < orderedUrls.length - 1 && (
                <button
                  type="button"
                  onClick={() => setZoomIdx(zoomIdx + 1)}
                  aria-label="다음"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-lg font-bold text-slate-800 shadow hover:bg-white"
                >
                  →
                </button>
              )}
            </div>
          </div>
        </ZoomModal>
      )}
    </>
  );
}

export const XRAY_IMAGE_DRAG_TYPE = DEFAULT_DRAG_TYPE;
