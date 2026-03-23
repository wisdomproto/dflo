import { InfoModal } from './InfoModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function LocationModal({ isOpen, onClose }: Props) {
  return (
    <InfoModal isOpen={isOpen} onClose={onClose} title="병원 위치">
      <div className="space-y-5">
        {/* Map image */}
        <img src="/images/clinic-map.png" alt="연세새봄의원 약도"
          className="w-full rounded-xl border border-gray-100" />

        {/* Address */}
        <div className="space-y-1">
          <p className="text-base font-bold text-gray-900">연세새봄의원</p>
          <p className="text-sm text-gray-600">서울시 강남구 도산대로 328, 휘선빌딩 (스타벅스 건물) 4층</p>
        </div>

        {/* Transport info */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
            <span className="text-lg">🚇</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">지하철 이용시</p>
              <p className="text-xs text-gray-500 mt-0.5">압구정로데오역 5번 출구 도보 8분 | 강남구청역 3-1번 출구 도보 10분</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
            <span className="text-lg">🚌</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">버스 이용시</p>
              <p className="text-xs text-gray-500 mt-0.5">지선 3011, 4212, 4412 | 간선 145, 342, 440, 301, 472</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
            <span className="text-lg">🅿️</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">주차안내</p>
              <p className="text-xs text-gray-500 mt-0.5">주차장은 건물 뒤편에 있으며 발레파킹이 가능합니다.</p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-[#E8F5F0] rounded-xl p-4 text-center">
          <p className="text-xs text-[#0F6E56] font-medium">상담 및 예약 문의</p>
          <a href="tel:02-3395-0999" className="text-xl font-black text-[#0F6E56] block mt-1">02-3395-0999</a>
        </div>
      </div>
    </InfoModal>
  );
}
