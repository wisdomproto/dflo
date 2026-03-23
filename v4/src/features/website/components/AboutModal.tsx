import { InfoModal } from './InfoModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PROFILE = [
  'IFBB Pro, USPTA, Level II Trainer',
  '현 연세 새봄의원 원장',
  '호르몬 치료 전문',
  'NABBA/WFF 의학 고문',
  '연세대학교 의학과 졸업',
  '연세대학교 의과대학원 대학원 졸업',
];

const FACILITIES = [
  { emoji: '🏥', title: '성장 전문 클리닉', desc: '성장호르몬 치료 · 성조숙증 관리 · 체형교정' },
  { emoji: '💪', title: '부설 GYM (운동센터)', desc: '전문 트레이너의 1:1 성장 운동 지도' },
  { emoji: '🔬', title: '정밀 검사 시스템', desc: '성장판 검사 · 골연령 측정 · 호르몬 검사' },
  { emoji: '📊', title: '성장 모니터링', desc: '정기적인 성장 추적 및 맞춤 치료 계획' },
];

export function AboutModal({ isOpen, onClose }: Props) {
  return (
    <InfoModal isOpen={isOpen} onClose={onClose} title="병원 · 원장님 소개">
      <div className="space-y-6">
        {/* Doctor section */}
        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
          <img src="/images/doctor.jpg" alt="채용현 원장"
            className="w-32 h-40 object-cover rounded-xl shadow-sm flex-shrink-0" />
          <div className="text-center sm:text-left">
            <p className="text-xl font-extrabold text-gray-900">채용현 <span className="text-base font-medium text-gray-500">대표원장</span></p>
            <p className="text-sm text-[#0F6E56] font-medium mt-2 leading-relaxed italic">
              "고객의 건강과 가치를 더하는 채용현 원장입니다."
            </p>
            <div className="mt-3 space-y-1">
              {PROFILE.map((p) => (
                <p key={p} className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#0F6E56] flex-shrink-0" />
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-100" />

        {/* Clinic introduction */}
        <div>
          <p className="text-base font-bold text-gray-900 mb-2">연세새봄의원</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            질병 치료에 국한되었던 기존 병원의 한계를 뛰어넘어, 고객의 정신적, 신체적 능력을 향상시켜주는 호르몬 전문 클리닉을 목표로 진료에 최선을 다하고 있습니다.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mt-2">
            고객에게 젊고 아름다운 신체와 능력 향상을 위해 최상의 의료 서비스를 제공하는 연세새봄의원과 함께 해주셔서 감사합니다.
          </p>
        </div>

        {/* Facilities */}
        <div>
          <p className="text-base font-bold text-gray-900 mb-3">시설 소개</p>
          <div className="grid grid-cols-2 gap-2">
            {FACILITIES.map((f) => (
              <div key={f.title} className="bg-gray-50 rounded-xl p-3.5 space-y-1">
                <span className="text-xl">{f.emoji}</span>
                <p className="text-sm font-semibold text-gray-800">{f.title}</p>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-[#E8F5F0] rounded-xl p-4 text-center">
          <p className="text-xs text-[#0F6E56] font-medium">상담 및 예약 문의</p>
          <a href="tel:02-3395-0999" className="text-xl font-black text-[#0F6E56] block mt-1">02-3395-0999</a>
          <p className="text-xs text-gray-500 mt-1">서울시 강남구 도산대로 328, 휘선빌딩 4층</p>
        </div>
      </div>
    </InfoModal>
  );
}
