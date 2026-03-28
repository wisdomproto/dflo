import { InfoModal } from './InfoModal';
import { CaseDetail } from '@/features/content/components/CaseDetail';
import type { GrowthCase } from '@/shared/types';

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/_ZxneSb';

interface Props {
  caseData: GrowthCase | null;
  onClose: () => void;
}

export function CaseDetailModal({ caseData, onClose }: Props) {
  if (!caseData) return null;

  return (
    <InfoModal isOpen={!!caseData} onClose={onClose} title={`${caseData.patient_name} 성장 사례`}>
      <CaseDetail caseData={caseData} />

      {/* CTA */}
      <div className="mt-6">
        <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#0F6E56] py-3.5
                     text-white font-bold text-sm hover:bg-[#0D5A47] active:scale-[0.98] transition-all">
          <span>💬</span> 우리 아이도 상담 받아보기
        </a>
      </div>
    </InfoModal>
  );
}
