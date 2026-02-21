// ================================================
// HomePage - 187 성장케어 v4
// 메인 대시보드 (로그인 후 첫 화면)
// ================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/shared/components/Layout';
import Card from '@/shared/components/Card';
import Modal from '@/shared/components/Modal';
import ChildSelector from '@/shared/components/ChildSelector';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import GenderIcon from '@/shared/components/GenderIcon';
import { SwipeableSection } from '@/shared/components/SwipeableSection';
import { ChildFormModal } from '@/features/children/components/ChildFormModal';
import { GrowthGuideSwipeCard } from '@/features/content/components/GrowthGuideSwipeCard';
import { RecipeSwipeCard } from '@/features/content/components/RecipeSwipeCard';
import { GrowthCaseSwipeCard } from '@/features/content/components/GrowthCaseSwipeCard';
import { RecipeDetail } from '@/features/content/components/RecipeDetail';
import { CaseDetail } from '@/features/content/components/CaseDetail';
import { GuideDetail } from '@/features/content/components/GuideDetail';
import { useHomeContent } from '@/features/content/hooks/useHomeContent';
import { useChildrenStore } from '@/stores/childrenStore';
import { calculateAge, formatAge } from '@/shared/utils/age';
import { calculateMidParentalHeight } from '@/shared/utils/growth';
import {
  calculateHeightPercentileLMS,
  predictAdultHeightLMS,
} from '@/shared/data/growthStandard';
import type { Child, Recipe, GrowthCase, GrowthGuide } from '@/shared/types';

type DetailItem =
  | { type: 'recipe'; data: Recipe }
  | { type: 'case'; data: GrowthCase }
  | { type: 'guide'; data: GrowthGuide };

export default function HomePage() {
  const navigate = useNavigate();
  const children = useChildrenStore((s) => s.children);
  const isLoading = useChildrenStore((s) => s.isLoading);
  const fetchChildren = useChildrenStore((s) => s.fetchChildren);
  const getSelectedChild = useChildrenStore((s) => s.getSelectedChild);
  const selectedChild = getSelectedChild();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Child | undefined>(undefined);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const { guides, recipes, cases, isLoading: contentLoading } = useHomeContent();

  const openAddModal = () => { setEditTarget(undefined); setIsModalOpen(true); };
  const openEditModal = (child: Child) => { setEditTarget(child); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditTarget(undefined); };

  useEffect(() => { fetchChildren(); }, [fetchChildren]);

  const detailTitle = detail?.type === 'recipe' ? detail.data.title
    : detail?.type === 'case' ? `차트 #${detail.data.patient_name} 성장 사례`
    : detail?.type === 'guide' ? detail.data.title : '';

  return (
    <Layout title="187 성장케어">
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

        <div className="flex flex-col gap-4 px-4 py-4">
        {isLoading ? <LoadingSpinner /> : children.length === 0 ? (
          <EmptyState onAdd={openAddModal} />
        ) : selectedChild ? (
          <>
            <GrowthSummaryCard
              name={selectedChild.name}
              gender={selectedChild.gender}
              birthDate={selectedChild.birth_date}
              height={selectedChild.latestMeasurement?.height}
              weight={selectedChild.latestMeasurement?.weight}
              onEdit={() => openEditModal(selectedChild)}
              onShowInfo={() => setShowInfo(true)}
            />

            <SwipeableSection
              title="아이 성장 가이드"
              emoji="📚"
              isLoading={contentLoading}
              onSeeAll={() => navigate('/info?tab=guides')}
            >
              {guides.map((g) => (
                <GrowthGuideSwipeCard key={g.id} guide={g} onClick={() => setDetail({ type: 'guide', data: g })} />
              ))}
            </SwipeableSection>

            <SwipeableSection
              title="오늘의 건강 레시피"
              emoji="🥗"
              isLoading={contentLoading}
              onSeeAll={() => navigate('/info?tab=recipes')}
            >
              {recipes.map((r) => (
                <RecipeSwipeCard key={r.id} recipe={r} onClick={() => setDetail({ type: 'recipe', data: r })} />
              ))}
            </SwipeableSection>

            <SwipeableSection
              title="성장 관리 사례"
              emoji="📋"
              isLoading={contentLoading}
              onSeeAll={() => navigate('/info?tab=cases')}
            >
              {cases.map((c) => (
                <GrowthCaseSwipeCard key={c.id} caseData={c} onClick={() => setDetail({ type: 'case', data: c })} />
              ))}
            </SwipeableSection>

            {selectedChild.father_height && selectedChild.mother_height && (
              <ParentHeightCard
                fatherHeight={selectedChild.father_height}
                motherHeight={selectedChild.mother_height}
                gender={selectedChild.gender}
              />
            )}
          </>
        ) : null}
      </div>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detailTitle} size="lg">
        {detail?.type === 'recipe' && <RecipeDetail recipe={detail.data} />}
        {detail?.type === 'case' && <CaseDetail caseData={detail.data} />}
        {detail?.type === 'guide' && <GuideDetail guide={detail.data} />}
      </Modal>

      <Modal isOpen={showInfo} onClose={() => setShowInfo(false)} title="예측 성인키란?">
        {selectedChild && (
          <PredictionInfoContent
            height={selectedChild.latestMeasurement?.height}
            birthDate={selectedChild.birth_date}
            gender={selectedChild.gender}
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

// ── GrowthSummaryCard ──

function GrowthSummaryCard({ name, gender, birthDate, height, weight, onEdit, onShowInfo }: {
  name: string; gender: 'male' | 'female'; birthDate: string;
  height?: number; weight?: number; onEdit?: () => void; onShowInfo?: () => void;
}) {
  const age = calculateAge(birthDate);
  const percentile = height != null ? calculateHeightPercentileLMS(height, age.decimal, gender) : null;
  const predicted = height != null ? predictAdultHeightLMS(height, age.decimal, gender) : null;
  const validPredicted = predicted != null && predicted > 0 ? predicted : null;

  const gradientClass = gender === 'male'
    ? 'from-blue-500 to-indigo-600'
    : 'from-pink-400 to-rose-500';

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg animate-[fadeIn_0.3s_ease-out]">
      {/* 상단 그라데이션 영역 */}
      <div className={`bg-gradient-to-br ${gradientClass} px-5 pt-5 pb-4 relative`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-6 -translate-x-6" />

        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <GenderIcon gender={gender} size="lg" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{name}</h2>
              <p className="text-xs text-white/70">{formatAge(age)}</p>
            </div>
          </div>
          {onEdit && (
            <button onClick={onEdit}
              className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center
                         text-white/80 active:bg-white/25 transition-colors"
              aria-label="자녀 정보 수정">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 하단 흰색 영역 */}
      <div className="bg-white px-5 py-4">
        {height != null ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatBubble label="키" value={`${height}`} unit="cm" emoji="📏" />
              <StatBubble label="몸무게" value={weight != null ? `${weight}` : '-'} unit={weight != null ? 'kg' : ''} emoji="⚖️" />
            </div>
            {validPredicted && (
              <button onClick={onShowInfo}
                className={`w-full rounded-xl bg-gradient-to-r ${gradientClass} bg-opacity-5 px-4 py-3
                           active:scale-[0.99] transition-transform`}
                style={{ background: `linear-gradient(135deg, ${gender === 'male' ? '#EBF4FF' : '#FFF5F7'}, ${gender === 'male' ? '#E0EAFF' : '#FFE4EC'})` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <span className="text-xs font-medium text-gray-500">예측 성인키</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xl font-extrabold ${gender === 'male' ? 'text-blue-600' : 'text-pink-600'}`}>
                      {validPredicted}
                    </span>
                    <span className="text-xs text-gray-400">cm</span>
                    {percentile != null && (
                      <span className="text-[10px] font-medium text-gray-400 ml-1">
                        상위 {(100 - percentile).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-3 gap-1">
            <span className="text-2xl">📐</span>
            <p className="text-sm text-gray-400">아직 측정 기록이 없습니다</p>
            <p className="text-xs text-gray-300">데일리 루틴에서 키/몸무게를 입력해보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBubble({ label, value, unit, emoji }: { label: string; value: string; unit: string; emoji: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-3 flex items-center gap-3">
      <span className="text-xl">{emoji}</span>
      <div>
        <p className="text-[10px] text-gray-400 font-medium">{label}</p>
        <p className="text-base font-bold text-gray-900">
          {value}<span className="text-xs text-gray-400 font-normal ml-0.5">{unit}</span>
        </p>
      </div>
    </div>
  );
}

// ── PredictionInfoContent ──

function PredictionInfoContent({ height, birthDate, gender }: {
  height?: number; birthDate: string; gender: 'male' | 'female';
}) {
  const age = calculateAge(birthDate);
  const percentile = height != null ? calculateHeightPercentileLMS(height, age.decimal, gender) : null;
  const predicted = height != null ? predictAdultHeightLMS(height, age.decimal, gender) : null;
  const genderLabel = gender === 'male' ? '남아' : '여아';

  return (
    <div className="space-y-4 text-sm text-gray-700">
      <div className="rounded-xl bg-blue-50 p-3 space-y-1">
        <p className="font-semibold text-blue-800">LMS 방법 (현재 백분위 유지 기준)</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          현재 키를 또래 {genderLabel} 기준 백분위(%)로 변환한 뒤,
          성인(만 18세)까지 같은 백분위를 유지한다고 가정하여 계산합니다.
        </p>
      </div>
      <div className="space-y-2.5">
        <h4 className="font-semibold text-gray-800">계산 과정</h4>
        <ol className="list-decimal list-inside space-y-2 text-xs text-gray-600 leading-relaxed">
          <li>
            현재 나이(만 {age.decimal.toFixed(1)}세)의 {genderLabel} 성장 기준(LMS)에서 키 {height}cm의 Z-점수를 계산합니다.
            {percentile != null && (
              <span className="ml-1 text-primary font-medium">→ 백분위 {percentile.toFixed(1)}%</span>
            )}
          </li>
          <li>
            만 18세 {genderLabel} 성장 기준(LMS)에 같은 Z-점수를 적용하여 성인키를 역산합니다.
            {predicted != null && predicted > 0 && (
              <span className="ml-1 text-primary font-medium">→ {predicted}cm</span>
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

// ── ParentHeightCard ──

function ParentHeightCard({ fatherHeight, motherHeight, gender }: {
  fatherHeight: number; motherHeight: number; gender: 'male' | 'female';
}) {
  const mph = calculateMidParentalHeight(fatherHeight, motherHeight, gender);
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">👨‍👩‍👧</span>
        <h3 className="text-sm font-semibold text-gray-700">부모평균키 (MPH)</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-blue-50 py-3 text-center">
          <p className="text-lg mb-0.5">👨</p>
          <p className="text-[10px] text-gray-400">아빠</p>
          <p className="text-sm font-bold text-gray-800">{fatherHeight}<span className="text-[10px] text-gray-400 font-normal">cm</span></p>
        </div>
        <div className="rounded-xl bg-pink-50 py-3 text-center">
          <p className="text-lg mb-0.5">👩</p>
          <p className="text-[10px] text-gray-400">엄마</p>
          <p className="text-sm font-bold text-gray-800">{motherHeight}<span className="text-[10px] text-gray-400 font-normal">cm</span></p>
        </div>
        <div className={`rounded-xl py-3 text-center ${gender === 'male' ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : 'bg-gradient-to-br from-pink-50 to-rose-50'}`}>
          <p className="text-lg mb-0.5">🎯</p>
          <p className="text-[10px] text-gray-400">예측키</p>
          <p className={`text-sm font-bold ${gender === 'male' ? 'text-blue-600' : 'text-pink-600'}`}>{mph}<span className="text-[10px] font-normal opacity-60">cm</span></p>
        </div>
      </div>
    </Card>
  );
}
