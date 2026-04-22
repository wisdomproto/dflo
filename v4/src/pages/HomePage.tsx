// ================================================
// HomePage - 187 성장케어 v4
// 메인 대시보드 (로그인 후 첫 화면)
// ================================================

import { useEffect, useState, useRef } from 'react';
import Layout from '@/shared/components/Layout';
import Modal from '@/shared/components/Modal';
import ChildSelector from '@/shared/components/ChildSelector';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import GenderIcon from '@/shared/components/GenderIcon';
import { ChildFormModal } from '@/features/children/components/ChildFormModal';
import { useGrowthRecord } from '@/features/growth/hooks/useGrowthRecord';
import { GrowthModalContent } from '@/features/routine/components/GrowthModalContent';
import { SectionCarousel } from '@/features/website/components/SectionCarousel';
import { fetchSections } from '@/features/website/services/websiteSectionService';
import type { WebsiteSection } from '@/features/website/types/websiteSection';
import { useChildrenStore } from '@/stores/childrenStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { calculateAgeAtDate, formatAge } from '@/shared/utils/age';
import { toDateString } from '@/shared/utils/date';
import { calculateHeightPercentileLMS, calculateWeightPercentileLMS, predictAdultHeightLMS } from '@/shared/data/growthStandard';
import { fetchRoutine, upsertRoutine } from '@/features/routine/services/routineService';
import type { Child } from '@/shared/types';

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = !!user;
  const children = useChildrenStore((s) => s.children);
  const isLoading = useChildrenStore((s) => s.isLoading);
  const fetchChildren = useChildrenStore((s) => s.fetchChildren);
  const getSelectedChild = useChildrenStore((s) => s.getSelectedChild);
  const selectedChild = getSelectedChild();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Child | undefined>(undefined);
  const [predInfo, setPredInfo] = useState<{ height: number } | null>(null);
  const [showBmiInfo, setShowBmiInfo] = useState(false);
  const [showGrowthModal, setShowGrowthModal] = useState(false);

  // Website sections (R2 website.json) — 게스트/로그인 공통 표시
  const [sections, setSections] = useState<WebsiteSection[]>([]);

  const growth = useGrowthRecord(selectedChild ?? null);

  const openAddModal = () => { setEditTarget(undefined); setIsModalOpen(true); };
  const openEditModal = (child: Child) => { setEditTarget(child); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditTarget(undefined); };

  // 로그인 상태일 때만 자녀 데이터 fetch
  useEffect(() => {
    if (isLoggedIn) fetchChildren();
  }, [fetchChildren, isLoggedIn]);

  // 섹션은 게스트/로그인 모두 동일하게 표시.
  // 'app-home.json'에 저장된 내용을 우선 사용하고, 없으면 'website.json' fallback.
  useEffect(() => {
    fetchSections('app-home.json', 'website.json').then(setSections);
  }, []);

  const websiteSections = (
    <div className="flex flex-col gap-3">
      {sections.map((section, idx) => (
        <div key={section.id || idx} className="rounded-2xl overflow-hidden shadow-md bg-white border-2 border-purple-300">
          <SectionCarousel slides={section.slides} showNav={section.showNav ?? true} />
        </div>
      ))}
    </div>
  );

  return (
    <Layout title="187 성장케어">
      {isLoggedIn && (
        <div className="flex items-center justify-between px-4 pt-2">
          <ChildSelector />
          {children.length > 0 && (
            <button onClick={openAddModal}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full
                         bg-gradient-to-br from-primary to-secondary text-white text-lg leading-none
                         active:scale-90 transition-transform shadow-md shadow-primary/20"
              aria-label="자녀 추가">+</button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 px-3 py-3">
        {isLoggedIn && (isLoading ? (
          <LoadingSpinner />
        ) : children.length === 0 ? (
          <EmptyState onAdd={openAddModal} />
        ) : selectedChild ? (
          <>
            <GrowthSummaryCard
              child={selectedChild}
              onEdit={() => openEditModal(selectedChild)}
              onShowPrediction={(h) => setPredInfo({ height: h })}
              onShowBmiInfo={() => setShowBmiInfo(true)}
              onShowGrowth={() => setShowGrowthModal(true)}
            />
          </>
        ) : null)}

        {websiteSections}
      </div>

      <Modal isOpen={!!predInfo} onClose={() => setPredInfo(null)} title="예측 성인키란?">
        {selectedChild && predInfo && (
          <PredictionInfoContent height={predInfo.height} birthDate={selectedChild.birth_date} gender={selectedChild.gender} />
        )}
      </Modal>

      <Modal isOpen={showBmiInfo} onClose={() => setShowBmiInfo(false)} title="BMI란?">
        <BmiInfoContent />
      </Modal>

      <Modal isOpen={showGrowthModal} onClose={() => setShowGrowthModal(false)} title="성장 기록" size="lg">
        {selectedChild && growth.latestMeas && (
          <GrowthModalContent
            latestHeight={growth.latestMeas.height}
            latestWeight={growth.latestMeas.weight}
            gender={selectedChild.gender}
            latestLMS={growth.latestLMS}
            bpPrediction={growth.bpPrediction}
            mph={growth.mph}
            chartPoints={growth.chartPoints}
            tableRows={growth.tableRows}
          />
        )}
      </Modal>

      <ChildFormModal isOpen={isModalOpen} onClose={closeModal} editChild={editTarget} />
    </Layout>
  );
}

// ── EmptyState ──

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 animate-[fadeIn_0.4s_ease-out]">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
        <span className="text-4xl">👶</span>
      </div>
      <div className="text-center">
        <p className="text-gray-700 font-semibold">등록된 자녀가 없습니다</p>
        <p className="text-gray-400 text-sm mt-1">아이를 등록하고 성장을 관리해보세요</p>
      </div>
      <button onClick={onAdd}
        className="mt-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-3 text-sm font-bold text-white
                   active:scale-95 transition-transform shadow-lg shadow-primary/25">
        아이를 등록해주세요
      </button>
    </div>
  );
}

// ── Chevron ──

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={dir === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
  </svg>
);

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/** 연령별 BMI 평가 (소아청소년 간이 기준) */
function getBmiLabel(bmi: number, ageYears: number): { text: string; color: string } {
  let low: number, high: number, over: number;
  if (ageYears < 6) { low = 13.5; high = 17; over = 18.5; }
  else if (ageYears < 12) { low = 14; high = 20; over = 23; }
  else { low = 16; high = 23; over = 25; }

  if (bmi < low) return { text: '저체중', color: 'text-blue-500' };
  if (bmi <= high) return { text: '정상', color: 'text-green-600' };
  if (bmi <= over) return { text: '과체중 주의', color: 'text-amber-500' };
  return { text: '비만 주의', color: 'text-red-500' };
}

// ── GrowthSummaryCard ──

function GrowthSummaryCard({ child, onEdit, onShowPrediction, onShowBmiInfo, onShowGrowth }: {
  child: Child & { latestMeasurement?: { height: number; weight?: number } };
  onEdit: () => void;
  onShowPrediction: (height: number) => void;
  onShowBmiInfo: () => void;
  onShowGrowth: () => void;
}) {
  const addToast = useUIStore((s) => s.addToast);
  const [date, setDate] = useState(new Date());
  const [editHeight, setEditHeight] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const dateRef = useRef<HTMLInputElement>(null);
  const prevRef = useRef({ height: '', weight: '' });

  const todayStr = toDateString(new Date());
  const isToday = toDateString(date) === todayStr;

  // 날짜 변경 시 루틴 데이터 로드
  useEffect(() => {
    let cancelled = false;
    fetchRoutine(child.id, toDateString(date)).then((r) => {
      if (cancelled) return;
      if (r) {
        const h = r.daily_height ? String(r.daily_height) : '';
        const w = r.daily_weight ? String(r.daily_weight) : '';
        setEditHeight(h); setEditWeight(w);
        prevRef.current = { height: h, weight: w };
      } else {
        if (toDateString(date) === todayStr && child.latestMeasurement) {
          const h = String(child.latestMeasurement.height);
          const w = child.latestMeasurement.weight ? String(child.latestMeasurement.weight) : '';
          setEditHeight(h); setEditWeight(w);
          prevRef.current = { height: h, weight: w };
        } else {
          setEditHeight(''); setEditWeight('');
          prevRef.current = { height: '', weight: '' };
        }
      }
    });
    return () => { cancelled = true; };
  }, [child.id, date, todayStr, child.latestMeasurement]);

  const handleBlurSave = async (field: 'height' | 'weight') => {
    const cur = { height: editHeight, weight: editWeight };
    if (cur[field] === prevRef.current[field]) return;
    if (!cur.height && !cur.weight) return;
    try {
      await upsertRoutine({
        child_id: child.id, routine_date: toDateString(date),
        daily_height: cur.height ? parseFloat(cur.height) : undefined,
        daily_weight: cur.weight ? parseFloat(cur.weight) : undefined,
        growth_injection: false,
      });
      prevRef.current = { ...cur };
      addToast('success', '저장됨');
    } catch { addToast('error', '저장 실패'); }
  };

  const h = editHeight ? parseFloat(editHeight) : 0;
  const w = editWeight ? parseFloat(editWeight) : 0;
  const age = calculateAgeAtDate(child.birth_date, date);
  const heightPct = h > 0 ? calculateHeightPercentileLMS(h, age.decimal, child.gender) : null;
  const weightPct = w > 0 ? calculateWeightPercentileLMS(w, age.decimal, child.gender) : null;
  const predicted = h > 0 ? predictAdultHeightLMS(h, age.decimal, child.gender) : null;
  const validPredicted = predicted != null && predicted > 0 ? predicted : null;
  const predPercentile = validPredicted ? calculateHeightPercentileLMS(validPredicted, 18, child.gender) : null;
  const bmi = h > 0 && w > 0 ? w / ((h / 100) ** 2) : null;
  const bmiLabel = bmi ? getBmiLabel(bmi, age.decimal) : null;

  const shiftDate = (d: number) => setDate((p) => { const n = new Date(p); n.setDate(n.getDate() + d); return n; });
  const dateLabel = `${date.getMonth() + 1}월 ${date.getDate()}일 (${DAY_NAMES[date.getDay()]})`;

  const gradientClass = child.gender === 'male' ? 'from-blue-500 to-indigo-600' : 'from-pink-400 to-rose-500';
  const accentColor = child.gender === 'male' ? 'text-blue-600' : 'text-pink-600';
  const accentBg = child.gender === 'male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600';

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg animate-[fadeIn_0.3s_ease-out]">
      {/* 그라데이션 헤더 */}
      <div className={`bg-gradient-to-br ${gradientClass} px-5 pt-4 pb-3 relative`}>
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <GenderIcon gender={child.gender} size="md" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{child.name}</h2>
              <p className="text-xs text-white/70">{formatAge(age)}</p>
            </div>
          </div>
          <button onClick={onEdit}
            className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white/80 active:bg-white/25 transition-colors"
            aria-label="자녀 정보 수정">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 날짜 네비게이션 */}
      <div className="bg-white px-3 py-2.5 flex items-center gap-1 border-b border-gray-100 relative">
        <button onClick={() => shiftDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 active:bg-gray-100">
          <Chevron dir="left" />
        </button>
        <button onClick={() => dateRef.current?.showPicker?.()} className="flex-1 text-center text-sm font-bold text-gray-800 active:text-primary transition-colors">
          {dateLabel}
        </button>
        <button onClick={() => shiftDate(1)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 active:bg-gray-100">
          <Chevron dir="right" />
        </button>
        {!isToday && (
          <button onClick={() => setDate(new Date())} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold active:bg-primary/20">
            오늘
          </button>
        )}
        <input ref={dateRef} type="date" value={toDateString(date)}
          onChange={(e) => { if (e.target.value) setDate(new Date(e.target.value + 'T00:00:00')); }}
          className="absolute opacity-0 w-0 h-0 pointer-events-none" />
      </div>

      {/* 측정값 + 통계 */}
      <div className="bg-white px-5 py-4 space-y-3">
        {/* 키 + 체중 한 줄 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 flex-1">
            <span className="text-sm">📏</span>
            <input type="number" inputMode="decimal" step="0.1" value={editHeight}
              onChange={(e) => setEditHeight(e.target.value)} onBlur={() => handleBlurSave('height')} placeholder="-"
              className="w-14 text-base font-bold text-gray-900 border-b-2 border-gray-200 focus:border-primary outline-none text-center bg-transparent transition-colors" />
            <span className="text-[11px] text-gray-400">cm</span>
            {heightPct != null && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-0.5 ${accentBg}`}>
                {heightPct.toFixed(0)}th
              </span>
            )}
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-1 flex-1">
            <span className="text-sm">⚖️</span>
            <input type="number" inputMode="decimal" step="0.1" value={editWeight}
              onChange={(e) => setEditWeight(e.target.value)} onBlur={() => handleBlurSave('weight')} placeholder="-"
              className="w-14 text-base font-bold text-gray-900 border-b-2 border-gray-200 focus:border-primary outline-none text-center bg-transparent transition-colors" />
            <span className="text-[11px] text-gray-400">kg</span>
            {weightPct != null && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-0.5 ${accentBg}`}>
                {weightPct.toFixed(0)}th
              </span>
            )}
          </div>
          <button onClick={onShowGrowth}
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform ${accentBg}`}
            aria-label="성장 기록">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l4-4 4 4 4-6 4 4" />
              <path strokeLinecap="round" d="M3 17h18" />
            </svg>
          </button>
        </div>

        {/* BMI + 멘트 */}
        {bmi != null && bmiLabel && (
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <span className="text-sm">📊</span>
            <span className="text-xs text-gray-500">BMI</span>
            <span className="text-sm font-bold text-gray-800">{bmi.toFixed(1)}</span>
            <span className={`text-xs font-medium ml-auto ${bmiLabel.color}`}>{bmiLabel.text}</span>
            <button onClick={onShowBmiInfo}
              className="w-5 h-5 rounded-full bg-gray-300/60 text-gray-500 text-[11px] font-bold flex items-center justify-center active:bg-gray-300 flex-shrink-0">
              ?
            </button>
          </div>
        )}

        {/* 예측 성인키 */}
        {validPredicted && (
          <div className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: `linear-gradient(135deg, ${child.gender === 'male' ? '#EBF4FF' : '#FFF5F7'}, ${child.gender === 'male' ? '#E0EAFF' : '#FFE4EC'})` }}>
            <div className="flex items-center gap-2">
              <span className="text-base">🎯</span>
              <span className="text-xs font-medium text-gray-500">예측 성인키</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-lg font-extrabold ${accentColor}`}>{validPredicted}</span>
              <span className="text-xs text-gray-400">cm</span>
              {predPercentile != null && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${accentBg}`}>
                  {predPercentile.toFixed(0)}th
                </span>
              )}
              <button onClick={() => onShowPrediction(h)}
                className="w-5 h-5 rounded-full bg-gray-300/60 text-gray-500 text-[11px] font-bold flex items-center justify-center active:bg-gray-300 ml-1">
                ?
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── PredictionInfoContent ──

function PredictionInfoContent({ height, birthDate, gender }: {
  height: number; birthDate: string; gender: 'male' | 'female';
}) {
  const age = calculateAgeAtDate(birthDate, new Date());
  const percentile = calculateHeightPercentileLMS(height, age.decimal, gender);
  const predicted = predictAdultHeightLMS(height, age.decimal, gender);
  const predPercentile = predicted > 0 ? calculateHeightPercentileLMS(predicted, 18, gender) : null;
  const genderLabel = gender === 'male' ? '남아' : '여아';

  return (
    <div className="space-y-4 text-sm text-gray-700">
      <div className="rounded-xl bg-blue-50 p-3 space-y-1">
        <p className="font-semibold text-blue-800">LMS 방법 (현재 백분위 유지 기준)</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          <span className="font-semibold">2017년 소아청소년 표준 성장도표</span>(질병관리청)의 LMS 데이터를 기반으로,
          현재 키를 또래 {genderLabel} 기준 백분위(%)로 변환한 뒤,
          성인(만 18세)까지 같은 백분위를 유지한다고 가정하여 계산합니다.
        </p>
      </div>
      <div className="space-y-2.5">
        <h4 className="font-semibold text-gray-800">계산 과정</h4>
        <ol className="list-decimal list-inside space-y-2 text-xs text-gray-600 leading-relaxed">
          <li>
            현재 나이(만 {age.decimal.toFixed(1)}세)의 {genderLabel} 성장 기준(LMS)에서 키 {height}cm의 Z-점수를 계산합니다.
            <span className="ml-1 text-primary font-medium">→ {percentile.toFixed(1)}th 백분위</span>
          </li>
          <li>
            만 18세 {genderLabel} 성장 기준(LMS)에 같은 Z-점수를 적용하여 성인키를 역산합니다.
            {predicted > 0 && (
              <span className="ml-1 text-primary font-medium">→ {predicted}cm</span>
            )}
            {predPercentile != null && (
              <span className="ml-1 text-primary font-medium">({predPercentile.toFixed(0)}th)</span>
            )}
          </li>
        </ol>
      </div>
      <div className="rounded-xl bg-amber-50 p-3">
        <p className="text-xs text-amber-700 leading-relaxed">
          <span className="font-semibold">참고:</span> 이 예측은 현재 백분위가 성인까지 유지된다는 가정에 기반합니다.
          실제 성인키는 영양, 운동, 수면, 사춘기 시기 등에 따라 달라질 수 있습니다.
          정확한 예측을 위해 골연령(뼈 나이) 검사를 함께 참고하세요.
        </p>
      </div>
    </div>
  );
}

// ── BmiInfoContent ──

function BmiInfoContent() {
  const rows = [
    { label: '저체중', desc: '또래 평균보다 마른 편입니다. 영양 섭취를 점검해 보세요.', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '정상', desc: '또래에 맞는 건강한 체중입니다. 현재 생활습관을 유지하세요.', color: 'text-green-600', bg: 'bg-green-50' },
    { label: '과체중 주의', desc: '또래 평균보다 체중이 높은 편입니다. 식습관과 운동량을 점검해 보세요.', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: '비만 주의', desc: '또래 기준 비만 범위입니다. 전문의 상담을 권장합니다.', color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-4 text-sm text-gray-700">
      <div className="rounded-xl bg-blue-50 p-3 space-y-1">
        <p className="font-semibold text-blue-800">BMI (체질량지수)</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          체중(kg)을 키(m)의 제곱으로 나눈 값입니다. 소아청소년은 성인과 달리
          <span className="font-semibold"> 나이와 성별</span>에 따라 정상 범위가 다릅니다.
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-gray-800">판정 기준</h4>
        {rows.map((r) => (
          <div key={r.label} className={`flex items-start gap-2 rounded-xl ${r.bg} px-3 py-2`}>
            <span className={`text-xs font-bold whitespace-nowrap mt-0.5 ${r.color}`}>{r.label}</span>
            <span className="text-xs text-gray-600 leading-relaxed">{r.desc}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-gray-50 p-3 space-y-1">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-semibold">계산식:</span> BMI = 체중(kg) / (키(m))²
        </p>
        <p className="text-xs text-gray-400 leading-relaxed">
          본 판정은 연령별 간이 기준이며, 정확한 소아 비만 진단은 BMI 백분위수와 전문의 상담이 필요합니다.
        </p>
      </div>
    </div>
  );
}

