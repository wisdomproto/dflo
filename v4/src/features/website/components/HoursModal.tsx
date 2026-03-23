import { InfoModal } from './InfoModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const HOURS = [
  { day: '월 / 화 / 금', time: '오전 09:00 ~ 오후 06:30', active: true },
  { day: '수요일', time: '오전 11:00 ~ 오후 09:00', active: true, note: '야간진료' },
  { day: '목요일', time: 'OFF', active: false },
  { day: '토요일', time: '오전 09:00 ~ 오후 03:30', active: true },
  { day: '점심시간', time: '오후 01:00 ~ 오후 02:00', active: false },
  { day: '일 / 공휴일', time: '휴진', active: false },
];

export function HoursModal({ isOpen, onClose }: Props) {
  return (
    <InfoModal isOpen={isOpen} onClose={onClose} title="진료시간 안내">
      <div className="space-y-5">
        {/* Clinic photo */}
        <img src="/images/clinic-interior.jpg" alt="연세새봄의원 내부"
          className="w-full h-44 object-cover rounded-xl" />

        {/* Hours table */}
        <div className="space-y-2">
          {HOURS.map((h) => (
            <div key={h.day}
              className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                h.active ? 'bg-gray-50' : 'bg-red-50/50'
              }`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">{h.day}</span>
                {h.note && (
                  <span className="text-[10px] font-semibold bg-[#0F6E56] text-white rounded-full px-2 py-0.5">{h.note}</span>
                )}
              </div>
              <span className={`text-sm ${h.active ? 'text-gray-600' : 'text-red-400 font-medium'}`}>{h.time}</span>
            </div>
          ))}
        </div>

        {/* Notice */}
        <p className="text-xs text-gray-400 text-center">* 매주 목요일, 일요일 및 공휴일은 휴진합니다.</p>

        {/* Contact */}
        <div className="bg-[#E8F5F0] rounded-xl p-4 text-center">
          <p className="text-xs text-[#0F6E56] font-medium">상담 및 예약 문의</p>
          <a href="tel:02-3395-0999" className="text-xl font-black text-[#0F6E56] block mt-1">02-3395-0999</a>
        </div>
      </div>
    </InfoModal>
  );
}
