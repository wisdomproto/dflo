// Center X-ray viewing panel for a selected visit.
// Fetches xray_readings by visit, resolves signed URLs for private images,
// shows patient X-ray alongside matched atlas references.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchXrayReadingsByVisit,
  getXrayImageSignedUrl,
} from '@/features/bone-age/services/xrayReadingService';
import type { Visit, XrayReading } from '@/shared/types';

interface Props {
  childId: string;
  visit: Visit;
  onClose: () => void;
}

export function XrayPanel({ childId, visit, onClose }: Props) {
  const [readings, setReadings] = useState<XrayReading[] | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchXrayReadingsByVisit(visit.id)
      .then(async (list) => {
        if (cancelled) return;
        setReadings(list);
        const pairs = await Promise.all(
          list
            .filter((r) => r.image_path)
            .map(async (r) => {
              try {
                return [r.id, await getXrayImageSignedUrl(r.image_path!)] as const;
              } catch {
                return [r.id, ''] as const;
              }
            }),
        );
        if (!cancelled) {
          setSignedUrls(Object.fromEntries(pairs));
        }
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'X-ray 불러오기 실패'),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [visit.id]);

  const latest = useMemo(() => readings?.[0] ?? null, [readings]);

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div>
          <div className="text-[11px] text-slate-500">X-ray · {visit.visit_date}</div>
          {latest && (
            <div className="text-sm font-semibold text-slate-900">
              뼈나이
              {latest.bone_age_result != null
                ? ` ${latest.bone_age_result.toFixed(1)}`
                : ' —'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/patients/${childId}/visits/${visit.id}/bone-age`}
            className="rounded bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
          >
            판독 편집
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">불러오는 중…</div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-red-500">{error}</div>
        ) : !readings || readings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            이 회차에 저장된 X-ray 판독이 없습니다.
            <div className="mt-2">
              <Link
                to={`/admin/patients/${childId}/visits/${visit.id}/bone-age`}
                className="text-[12px] font-medium text-slate-700 underline"
              >
                새 판독 등록 →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {readings.map((r) => (
              <ReadingBlock key={r.id} reading={r} signedUrl={signedUrls[r.id]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReadingBlock({
  reading,
  signedUrl,
}: {
  reading: XrayReading;
  signedUrl?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <div className="grid grid-cols-3 gap-2">
        <Pane label="환자 X-ray">
          {signedUrl ? (
            <img
              src={signedUrl}
              alt="X-ray"
              className="h-full w-full rounded bg-slate-100 object-contain"
            />
          ) : (
            <Placeholder text={reading.image_path ? '로딩 중' : '이미지 없음'} />
          )}
        </Pane>
        <Pane label={`Younger · ${reading.atlas_match_younger ?? '—'}`}>
          {reading.atlas_match_younger ? (
            <img
              src={`/atlas/${reading.atlas_match_younger}`}
              alt={reading.atlas_match_younger}
              className="h-full w-full rounded bg-slate-100 object-contain"
            />
          ) : (
            <Placeholder text="—" />
          )}
        </Pane>
        <Pane label={`Older · ${reading.atlas_match_older ?? '—'}`}>
          {reading.atlas_match_older ? (
            <img
              src={`/atlas/${reading.atlas_match_older}`}
              alt={reading.atlas_match_older}
              className="h-full w-full rounded bg-slate-100 object-contain"
            />
          ) : (
            <Placeholder text="—" />
          )}
        </Pane>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
        <span>
          <span className="text-slate-500">촬영일</span>{' '}
          <span className="font-medium text-slate-800">{reading.xray_date}</span>
        </span>
        <span>
          <span className="text-slate-500">BA</span>{' '}
          <span className="font-medium text-slate-800">
            {reading.bone_age_result != null
              ? reading.bone_age_result.toFixed(1)
              : '—'}
          </span>
        </span>
        {reading.doctor_memo && (
          <span className="w-full text-slate-700">메모 · {reading.doctor_memo}</span>
        )}
      </div>
    </div>
  );
}

function Pane({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-medium text-slate-500">{label}</div>
      <div className="aspect-square">{children}</div>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded bg-slate-50 text-[11px] text-slate-400">
      {text}
    </div>
  );
}
