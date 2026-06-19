// 광고용 훅 스토리 프롬프트 빌더 (순수). route가 generateText로 실행한다.
import type { Track } from './types.js';

export interface StorySeed { reelId: number; title: string; track: Track; }

const CTA: Record<Track, string> = {
  engagement: '프로필에서 더 많은 정보 보기 / 팔로우 유도 (낮은 약속)',
  homepage: '홈페이지에서 우리 아이 18세 예측키 1분 무료 측정',
  conversion: 'LINE으로 1:1 무료 상담',
};

export function buildStoryPrompt(seed: StorySeed): string {
  return `너는 187 성장클리닉(한국 성장 전문 의료)의 태국 시장 광고 카피라이터다.
아래 주제로 인스타그램/페이스북 릴스용 **광고 소재 훅 스토리**를 작성하라.

주제(기존 자산 #${seed.reelId}): "${seed.title}"
도착지/CTA: ${CTA[seed.track]}

[출력 형식]
🎬 훅 (첫 3초, 스크롤 멈추는 한 줄)
📖 내러티브 아크: 도입 → 문제(공감/공포) → 반전(솔루션 암시) → CTA
💬 핵심 자막 카피 3~4줄
🔘 CTA 문구
각 항목을 **태국어**와 **한국어** 둘 다 작성.

[필수 제약]
- 화자 = 남성 한국인 의사. 태국어는 격식·정중체(1인칭 ผม, 종결 ครับ). 여성형(ค่ะ/คะ/ดิฉัน/ฉัน) 금지.
- 의료광고 규정: 효과 보장·"최고/유일" 단정 금지, 개인차·전문의 상담 명시.
- 광고는 짧고 강하게. 교육 나열이 아니라 훅 중심.
- 기존 자산 #${seed.reelId}을(를) 변형하는 전제.`;
}
