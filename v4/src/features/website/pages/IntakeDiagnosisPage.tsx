// ================================================
// IntakeDiagnosisPage - 초진 정보 입력 (AI 진단용)
// 예상키 측정 후 "더 정확한 진단" 버튼으로 진입
// 성별에 따라 사춘기 관련 질문 분기
// ================================================

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface CalcState {
  gender: 'male' | 'female';
  currentHeight: number;
  age: number;
  predictedHeight: number;
}

interface IntakeForm {
  // 기본 정보 (calculator에서 전달)
  childName: string;
  birthDate: string;

  // 출생 정보
  gestationalWeeks: string;
  birthWeight: string;
  birthNote: string;

  // 현재 상태
  currentWeight: string;
  yearlyGrowth: string;
  grade: string;
  heightRank: string;

  // 가족 정보
  fatherHeight: string;
  motherHeight: string;
  desiredHeight: string;

  // 생활 습관
  sleepTime: string;
  wakeTime: string;
  exerciseFrequency: string;
  milkDaily: string;
  mealRegularity: string;

  // 사춘기 (남)
  voiceChange: string;
  facialHair: string;

  // 사춘기 (여)
  menarche: string;
  breastDevelopment: string;

  // 공통 사춘기
  pubertyStage: string;
  growthPattern: string;

  // 의료 이력
  pastConditions: string;
  pastClinicExperience: boolean;
  currentMedications: string;

  // 보호자 의견
  growthConcerns: string;
  additionalNotes: string;
}

const emptyForm: IntakeForm = {
  childName: '',
  birthDate: '',
  gestationalWeeks: '',
  birthWeight: '',
  birthNote: '',
  currentWeight: '',
  yearlyGrowth: '',
  grade: '',
  heightRank: '',
  fatherHeight: '',
  motherHeight: '',
  desiredHeight: '',
  sleepTime: '',
  wakeTime: '',
  exerciseFrequency: '',
  milkDaily: '',
  mealRegularity: '',
  voiceChange: '',
  facialHair: '',
  menarche: '',
  breastDevelopment: '',
  pubertyStage: '',
  growthPattern: '',
  pastConditions: '',
  pastClinicExperience: false,
  currentMedications: '',
  growthConcerns: '',
  additionalNotes: '',
};

export default function IntakeDiagnosisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const calcState = location.state as CalcState | null;

  const gender = calcState?.gender || 'male';
  const isMale = gender === 'male';
  const [form, setForm] = useState<IntakeForm>(emptyForm);
  const [step, setStep] = useState(0); // 0: 기본, 1: 출생, 2: 현재, 3: 가족, 4: 생활습관, 5: 사춘기, 6: 의료, 7: 완료

  const update = (key: keyof IntakeForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const steps = [
    '기본 정보',
    '출생 정보',
    '현재 상태',
    '가족 정보',
    '생활 습관',
    '사춘기 평가',
    '의료 이력',
    '완료',
  ];

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = () => {
    // TODO: AI 진단 연동 (RAG)
    // 지금은 데이터 수집까지만
    const data = {
      ...form,
      gender,
      currentHeight: calcState?.currentHeight,
      age: calcState?.age,
      predictedHeight: calcState?.predictedHeight,
    };
    console.log('Intake data:', data);
    next(); // go to completion step
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0F6E56] text-white px-4 py-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/website')} className="text-white/80 hover:text-white text-sm">
            ← 돌아가기
          </button>
          <h1 className="text-base font-bold">🔬 AI 성장 진단</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex items-center gap-1 mb-1">
          {steps.map((_s, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${
              i <= step ? 'bg-[#0F6E56]' : 'bg-gray-200'
            }`} />
          ))}
        </div>
        <p className="text-xs text-gray-500 text-center">{steps[step]} ({step + 1}/{steps.length})</p>
      </div>

      {/* Calculator result summary */}
      {calcState && step < steps.length - 1 && (
        <div className="max-w-lg mx-auto px-4 mt-3">
          <div className={`rounded-xl p-3 flex items-center gap-3 ${isMale ? 'bg-blue-50' : 'bg-pink-50'}`}>
            <span className="text-2xl">{isMale ? '👦' : '👧'}</span>
            <div className="flex-1">
              <p className="text-xs text-gray-500">예상키 측정 결과</p>
              <p className={`text-lg font-black ${isMale ? 'text-blue-600' : 'text-pink-600'}`}>
                {calcState.predictedHeight.toFixed(1)}cm
              </p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>현재 {calcState.currentHeight}cm</p>
              <p>만 {calcState.age.toFixed(1)}세</p>
            </div>
          </div>
        </div>
      )}

      {/* Form content */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {step === 0 && (
          <FormSection title="👶 기본 정보">
            <Field label="아이 이름" value={form.childName}
              onChange={(v) => update('childName', v)} placeholder="김○○" />
            <Field label="생년월일" value={form.birthDate} type="date"
              onChange={(v) => update('birthDate', v)} />
          </FormSection>
        )}

        {step === 1 && (
          <FormSection title="🏥 출생 정보">
            <Field label="임신 주수" value={form.gestationalWeeks} type="number"
              onChange={(v) => update('gestationalWeeks', v)} placeholder="38" suffix="주" />
            <Field label="출생 시 몸무게" value={form.birthWeight} type="number"
              onChange={(v) => update('birthWeight', v)} placeholder="3.5" suffix="kg" />
            <Field label="출생 시 특이사항" value={form.birthNote}
              onChange={(v) => update('birthNote', v)} placeholder="없음" />
          </FormSection>
        )}

        {step === 2 && (
          <FormSection title="📏 현재 상태">
            <Field label="현재 몸무게" value={form.currentWeight} type="number"
              onChange={(v) => update('currentWeight', v)} placeholder="40" suffix="kg" />
            <Field label="최근 1년간 성장 (cm)" value={form.yearlyGrowth}
              onChange={(v) => update('yearlyGrowth', v)} placeholder="5~6" />
            <Field label="학년" value={form.grade}
              onChange={(v) => update('grade', v)} placeholder="초4" />
            <Field label="반에서 키 순서 (앞에서)" value={form.heightRank}
              onChange={(v) => update('heightRank', v)} placeholder="3번째" />
          </FormSection>
        )}

        {step === 3 && (
          <FormSection title="👨‍👩‍👧 가족 정보">
            <Field label="아버지 키" value={form.fatherHeight} type="number"
              onChange={(v) => update('fatherHeight', v)} placeholder="175" suffix="cm" />
            <Field label="어머니 키" value={form.motherHeight} type="number"
              onChange={(v) => update('motherHeight', v)} placeholder="160" suffix="cm" />
            <Field label="희망 키" value={form.desiredHeight}
              onChange={(v) => update('desiredHeight', v)} placeholder="180" suffix="cm" />
          </FormSection>
        )}

        {step === 4 && (
          <FormSection title="🌙 생활 습관">
            <Field label="취침 시간" value={form.sleepTime} type="time"
              onChange={(v) => update('sleepTime', v)} />
            <Field label="기상 시간" value={form.wakeTime} type="time"
              onChange={(v) => update('wakeTime', v)} />
            <SelectField label="운동 빈도" value={form.exerciseFrequency}
              onChange={(v) => update('exerciseFrequency', v)}
              options={['거의 안 함', '주 1~2회', '주 3~4회', '매일']} />
            <SelectField label="우유/유제품 섭취" value={form.milkDaily}
              onChange={(v) => update('milkDaily', v)}
              options={['거의 안 먹음', '가끔 (주 2~3회)', '매일 1잔', '매일 2잔 이상']} />
            <SelectField label="식사 규칙성" value={form.mealRegularity}
              onChange={(v) => update('mealRegularity', v)}
              options={['불규칙', '대체로 규칙적', '매우 규칙적']} />
          </FormSection>
        )}

        {step === 5 && (
          <FormSection title={`🧬 사춘기 평가 (${isMale ? '남아' : '여아'})`}>
            {isMale ? (
              <>
                <SelectField label="변성기 (목소리 변화)" value={form.voiceChange}
                  onChange={(v) => update('voiceChange', v)}
                  options={['아직 없음', '시작됨', '완료됨']} />
                <SelectField label="수염/체모" value={form.facialHair}
                  onChange={(v) => update('facialHair', v)}
                  options={['없음', '솜털 정도', '뚜렷하게 있음']} />
              </>
            ) : (
              <>
                <SelectField label="초경 여부" value={form.menarche}
                  onChange={(v) => update('menarche', v)}
                  options={['아직 없음', '시작됨 (최근 6개월 내)', '1년 이상 됨']} />
                <SelectField label="유방 발달" value={form.breastDevelopment}
                  onChange={(v) => update('breastDevelopment', v)}
                  options={['발달 전', '봉우리 시작', '뚜렷한 발달']} />
              </>
            )}
            <SelectField label="전반적 사춘기 단계" value={form.pubertyStage}
              onChange={(v) => update('pubertyStage', v)}
              options={['사춘기 전', '초기 (막 시작)', '중기', '후기 (거의 완료)']} />
            <SelectField label="최근 성장 양상" value={form.growthPattern}
              onChange={(v) => update('growthPattern', v)}
              options={['꾸준히 자라는 중', '최근 급성장', '성장 속도가 느려짐', '거의 안 자라는 것 같음']} />
          </FormSection>
        )}

        {step === 6 && (
          <FormSection title="💊 의료 이력 & 기타">
            <Field label="과거 질환 (천식, 아토피 등)" value={form.pastConditions}
              onChange={(v) => update('pastConditions', v)} placeholder="없음" />
            <div className="flex items-center gap-3 py-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.pastClinicExperience}
                  onChange={(e) => update('pastClinicExperience', e.target.checked)}
                  className="w-4 h-4 rounded accent-[#0F6E56]" />
                <span className="text-sm text-gray-700">성장 클리닉 방문 경험 있음</span>
              </label>
            </div>
            <Field label="현재 복용 약/영양제" value={form.currentMedications}
              onChange={(v) => update('currentMedications', v)} placeholder="비타민D, 칼슘 등" />
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">
                키가 잘 안 크는 원인 (보호자 생각)
              </label>
              <textarea value={form.growthConcerns}
                onChange={(e) => update('growthConcerns', e.target.value)}
                rows={2} placeholder="수면 부족, 편식, 운동 부족 등"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">추가 메모</label>
              <textarea value={form.additionalNotes}
                onChange={(e) => update('additionalNotes', e.target.value)}
                rows={2} placeholder="기타 궁금한 점이나 참고사항"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] resize-none" />
            </div>
          </FormSection>
        )}

        {step === steps.length - 1 && (
          <div className="text-center py-12 space-y-4">
            <span className="text-5xl">✅</span>
            <h2 className="text-xl font-bold text-gray-800">정보 입력 완료!</h2>
            <p className="text-sm text-gray-500">
              입력하신 정보를 바탕으로<br />
              AI 성장 분석 리포트를 준비하겠습니다.
            </p>
            <div className="bg-amber-50 rounded-xl p-4 text-left">
              <p className="text-xs font-bold text-amber-800 mb-1">📋 입력된 정보 요약</p>
              <p className="text-xs text-amber-700">
                {form.childName || '이름 미입력'} · {isMale ? '남아' : '여아'} · 만 {calcState?.age.toFixed(1)}세
              </p>
              <p className="text-xs text-amber-700">
                현재 {calcState?.currentHeight}cm · 예상키 {calcState?.predictedHeight.toFixed(1)}cm
              </p>
              <p className="text-xs text-amber-700">
                아버지 {form.fatherHeight || '-'}cm · 어머니 {form.motherHeight || '-'}cm
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              🔬 AI 진단 기능은 곧 추가됩니다
            </p>
            <button onClick={() => navigate('/website')}
              className="mt-4 px-8 py-3 bg-[#0F6E56] text-white rounded-xl font-bold hover:bg-[#0D5A47] active:scale-[0.98] transition-all">
              홈으로 돌아가기
            </button>
          </div>
        )}

        {/* Navigation buttons */}
        {step < steps.length - 1 && (
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={prev}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 active:scale-[0.98] transition-all">
                ← 이전
              </button>
            )}
            {step < 6 ? (
              <button onClick={next}
                className="flex-1 py-3 rounded-xl bg-[#0F6E56] text-white font-semibold text-sm hover:bg-[#0D5A47] active:scale-[0.98] transition-all">
                다음 →
              </button>
            ) : (
              <button onClick={handleSubmit}
                className="flex-1 py-3 rounded-xl bg-[#0F6E56] text-white font-semibold text-sm hover:bg-[#0D5A47] active:scale-[0.98] transition-all">
                🔬 진단 요청하기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Sub-components ----

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type, suffix }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; suffix?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <input type={type || 'text'} step={type === 'number' ? 'any' : undefined}
          value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
        {suffix && <span className="text-sm text-gray-500 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]">
        <option value="">선택해주세요</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
