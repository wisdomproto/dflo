import { useState } from 'react';
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

const FACILITY_IMAGES = [
  { src: '/images/facility-1.jpg', label: '2층 대기실' },
  { src: '/images/facility-2.jpg', label: '2층 진료실' },
  { src: '/images/facility-3.jpg', label: '2층 외관' },
  { src: '/images/facility-4.jpg', label: '3층 운동센터' },
  { src: '/images/facility-5.jpg', label: '3층 트레이닝' },
  { src: '/images/facility-6.jpg', label: '3층 GYM' },
];

const YOUTUBE_VIDEO_ID = 'WkBRUFXOGPo';

export function AboutModal({ isOpen, onClose }: Props) {
  const [facilityIdx, setFacilityIdx] = useState(0);

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

        <hr className="border-gray-100" />

        {/* Clinic introduction */}
        <div>
          <p className="text-base font-bold text-gray-900 mb-2">연세새봄의원</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            질병 치료에 국한되었던 기존 병원의 한계를 뛰어넘어, 고객의 정신적, 신체적 능력(Performance &amp; Look)을 향상시켜주는 호르몬 전문 클리닉을 목표로 진료에 최선을 다하고 있습니다.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mt-2">
            고객에게 젊고 아름다운 신체와 능력 향상을 위해 최상의 의료 서비스를 제공하는 연세새봄의원과 함께 해주셔서 감사합니다.
          </p>
        </div>

        <hr className="border-gray-100" />

        {/* YouTube video */}
        <div>
          <p className="text-base font-bold text-gray-900 mb-3">병원 소개 영상</p>
          <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}`}
              title="연세새봄의원 소개"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Facility images */}
        <div>
          <p className="text-base font-bold text-gray-900 mb-3">시설 소개</p>
          <div className="relative rounded-xl overflow-hidden">
            <img
              src={FACILITY_IMAGES[facilityIdx].src}
              alt={FACILITY_IMAGES[facilityIdx].label}
              className="w-full h-48 sm:h-56 object-cover transition-opacity"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
              <p className="text-sm font-semibold text-white">{FACILITY_IMAGES[facilityIdx].label}</p>
            </div>
            {/* Prev/Next */}
            <button onClick={() => setFacilityIdx((i) => (i - 1 + FACILITY_IMAGES.length) % FACILITY_IMAGES.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-gray-700 hover:bg-white shadow">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => setFacilityIdx((i) => (i + 1) % FACILITY_IMAGES.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-gray-700 hover:bg-white shadow">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {FACILITY_IMAGES.map((_, i) => (
              <button key={i} onClick={() => setFacilityIdx(i)}
                className={`rounded-full transition-all ${i === facilityIdx ? 'w-5 h-1.5 bg-[#0F6E56]' : 'w-1.5 h-1.5 bg-gray-200'}`} />
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
