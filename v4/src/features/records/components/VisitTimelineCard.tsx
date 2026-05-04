import { useEffect, useMemo, useState } from 'react';
import type { PatientVisitRecord } from '@/features/records/services/patientRecordsService';
import type { Child, XrayReading } from '@/shared/types';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { heightAtSamePercentile } from '@/shared/data/growthStandard';
import { LabDetailModal } from '@/features/records/components/LabDetailModal';
import { panelTypeOf, type PanelType } from '@/features/hospital/components/LabHistoryPanel';
import { getXrayImageSignedUrl } from '@/features/bone-age/services/xrayReadingService';

interface Props {
  record: PatientVisitRecord;
  index: number; // 회차 번호 (역순 — 1=가장 오래된 회차)
  totalVisits: number;
  child: Child;
}

function formatDateKo(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const wd = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')} (${wd})`;
}

const PANEL_LABELS: Record<PanelType, string> = {
  blood: '혈액검사',
  food_intolerance: '음식 알레르기 (IgG4)',
  mast_allergy: 'MAST 알레르기',
  nk_activity: 'NK세포 활성도',
  organic_acid: '유기산',
  hair_mineral: '모발 중금속',
  attachment: '검사 결과지',
  unknown: '기타 검사',
};

type TabKey = 'prescription' | 'lab' | 'xray' | 'memo';

export function VisitTimelineCard({ record, index, totalVisits, child }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [labModal, setLabModal] = useState<{ open: boolean; panel?: PanelType }>({ open: false });
  const { visit, measurement, prescriptions, labTests, xrayReadings } = record;

  const visitNo = totalVisits - index;

  const visitAge = calculateAgeAtDate(child.birth_date, new Date(visit.visit_date)).decimal;

  const hasMeasurement = !!measurement;
  const hasBoneAge = measurement?.bone_age != null;
  const noteText = visit.notes?.trim();

  // PAH: DB값 우선, 없으면 BA 측정된 회차에서 LMS 기반 계산
  let pahValue: number | null = null;
  if (measurement?.pah && measurement.pah > 0) {
    pahValue = measurement.pah;
  } else if (hasBoneAge && measurement?.height) {
    const computed = heightAtSamePercentile(measurement.height, measurement.bone_age!, 18, child.gender);
    if (computed > 0) pahValue = Math.round(computed * 10) / 10;
  }

  // panel별 그룹화 (요약 칩용)
  const labsByPanel = labTests.reduce((acc, l) => {
    const p = panelTypeOf(l);
    acc.set(p, (acc.get(p) || 0) + 1);
    return acc;
  }, new Map<PanelType, number>());

  // X-ray: image_path 가 있는 reading 만 환자에게 노출
  const xrayWithImage = useMemo(
    () => xrayReadings.filter((r) => !!r.image_path),
    [xrayReadings],
  );

  // 데이터가 있는 탭만 동적으로 구성
  const tabs: { key: TabKey; label: string; emoji: string; count?: number }[] = [];
  if (prescriptions.length > 0) tabs.push({ key: 'prescription', label: '처방', emoji: '💊', count: prescriptions.length });
  if (labTests.length > 0) tabs.push({ key: 'lab', label: '검사', emoji: '🧪', count: labTests.length });
  if (xrayWithImage.length > 0) tabs.push({ key: 'xray', label: 'X-ray', emoji: '🦴', count: xrayWithImage.length });
  if (noteText) tabs.push({ key: 'memo', label: '메모', emoji: '📝' });

  const [activeTab, setActiveTab] = useState<TabKey | null>(tabs[0]?.key ?? null);
  // 펼칠 때마다 첫 번째 사용 가능한 탭으로 초기화
  useEffect(() => {
    if (expanded && tabs.length > 0 && (!activeTab || !tabs.some((t) => t.key === activeTab))) {
      setActiveTab(tabs[0].key);
    }
  }, [expanded, tabs, activeTab]);

  return (
    <div
      className={`rounded-2xl shadow-sm overflow-hidden border ${
        hasBoneAge
          ? 'bg-amber-50/40 border-amber-200'
          : 'bg-white border-gray-100'
      }`}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`w-full text-left px-4 py-3 transition-colors ${
          hasBoneAge ? 'active:bg-amber-100/40' : 'active:bg-gray-50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold text-gray-400">#{visitNo}회차</span>
              <span className="text-sm font-bold text-gray-800">
                {formatDateKo(visit.visit_date)}
              </span>
              <span className="text-[11px] text-gray-500">
                만 <span className="font-semibold">{visitAge.toFixed(1)}</span>세
              </span>
            </div>

            {/* 측정값 한 줄 */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-gray-600">
              {measurement?.height != null && (
                <span>📏 <span className="font-semibold text-gray-800">{measurement.height}</span> cm</span>
              )}
              {measurement?.weight != null && (
                <span>⚖️ <span className="font-semibold text-gray-800">{measurement.weight}</span> kg</span>
              )}
              {hasBoneAge && (
                <span className="text-amber-600">🦴 뼈나이 <span className="font-semibold">{measurement!.bone_age!.toFixed(1)}</span>세</span>
              )}
              {pahValue != null && (
                <span className="text-indigo-600">🎯 예측키 <span className="font-semibold">{pahValue}</span>cm</span>
              )}
              {!hasMeasurement && (
                <span className="text-gray-400">측정 기록 없음</span>
              )}
            </div>

            {/* 요약 배지 */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {prescriptions.length > 0 && (
                <Badge color="emerald">처방 {prescriptions.length}</Badge>
              )}
              {labTests.length > 0 && (
                <Badge color="cyan">검사 {labTests.length}</Badge>
              )}
              {noteText && <Badge color="slate">메모</Badge>}
            </div>
          </div>

          <span className={`shrink-0 mt-1 text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          {tabs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">추가 기록이 없습니다</p>
          ) : (
            <>
              {/* 탭 바 — 가로 스크롤 가능 */}
              <div className="flex gap-1 px-3 pt-3 pb-2 overflow-x-auto scrollbar-hide">
                {tabs.map((t) => {
                  const active = t.key === activeTab;
                  return (
                    <button
                      key={t.key}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab(t.key);
                      }}
                      className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-white text-gray-500 border border-gray-200 active:bg-gray-100'
                      }`}
                    >
                      <span className="mr-1">{t.emoji}</span>
                      {t.label}
                      {t.count != null && (
                        <span className={`ml-1 ${active ? 'text-white/80' : 'text-gray-400'}`}>{t.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 탭 내용 */}
              <div className="px-4 pb-3">
                {activeTab === 'prescription' && (
                  <div className="space-y-1.5">
                    {prescriptions.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm border border-gray-100"
                      >
                        <span className="font-medium text-gray-800 truncate">{p.medication_name}</span>
                        {p.dose && (
                          <span className="text-xs text-gray-500 shrink-0 ml-2">
                            {p.dose}
                            {p.medication_unit ? ` ${p.medication_unit}` : ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'lab' && (
                  <div>
                    <div className="flex flex-wrap gap-1.5">
                      {[...labsByPanel.entries()].map(([panel, count]) => (
                        <button
                          key={panel}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLabModal({ open: true, panel });
                          }}
                          className="text-xs px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100 active:bg-cyan-100 transition-colors flex items-center gap-1"
                        >
                          {PANEL_LABELS[panel]} <span className="font-semibold">{count}</span>
                          <span className="text-[10px] text-cyan-500">›</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLabModal({ open: true });
                      }}
                      className="mt-2 text-xs font-semibold text-cyan-700 active:text-cyan-900"
                    >
                      📋 검사 결과 자세히 보기
                    </button>
                  </div>
                )}

                {activeTab === 'xray' && <XrayTabContent readings={xrayWithImage} />}

                {activeTab === 'memo' && noteText && (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-3 border border-gray-100">
                    {noteText}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <LabDetailModal
        isOpen={labModal.open}
        onClose={() => setLabModal({ open: false })}
        labTests={labTests}
        initialPanel={labModal.panel}
      />
    </div>
  );
}

// ── X-ray 갤러리 (signed URL fetch + 라이트박스) ──

function XrayTabContent({ readings }: { readings: XrayReading[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      readings.map(async (r) => {
        try {
          const url = await getXrayImageSignedUrl(r.image_path!);
          return [r.id, url] as const;
        } catch {
          return [r.id, ''] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const m: Record<string, string> = {};
      for (const [id, url] of pairs) if (url) m[id] = url;
      setUrls(m);
    });
    return () => {
      cancelled = true;
    };
  }, [readings]);

  if (readings.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {readings.map((r) => {
          const url = urls[r.id];
          return (
            <button
              key={r.id}
              onClick={(e) => {
                e.stopPropagation();
                if (url) setLightbox(url);
              }}
              className="shrink-0 w-32 h-40 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 active:opacity-80 transition-opacity"
            >
              {url ? (
                <img src={url} alt="X-ray" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">로딩…</div>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-gray-400">탭하면 크게 볼 수 있습니다.</p>

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setLightbox(null);
          }}
        >
          <img src={lightbox} alt="X-ray 확대" className="max-w-full max-h-full object-contain" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center backdrop-blur-sm"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

const BADGE_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  slate: 'bg-slate-50 text-slate-600 border-slate-100',
};

function Badge({ color, children }: { color: keyof typeof BADGE_COLORS; children: React.ReactNode }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${BADGE_COLORS[color]}`}>
      {children}
    </span>
  );
}

