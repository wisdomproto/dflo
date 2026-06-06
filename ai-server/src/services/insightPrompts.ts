import type { CohortStats } from './clinicalStats.js';

/** 집계 통계 → 합성(전형) 사례 서사 생성 프롬프트. 실존 개인 아님 + 효과단정 금지. */
export function buildCompositeCasePrompt(category: string, stats: CohortStats): string {
  return `당신은 소아 성장클리닉의 교육 콘텐츠 작성자입니다. 아래는 "${category}" 유형 환자 ${stats.n}명의 비식별 집계 통계입니다.
이 통계를 바탕으로 이 유형을 대표하는 **합성(전형적) 사례** 한 단락을 작성하세요.

## 집계 통계
- 코호트 수: ${stats.n}명
- 평균 키 성장: ${stats.avgGrowthCm}cm
- 평균 초진 뼈나이: ${stats.avgInitialBoneAge ?? '정보없음'}
- 성별 분포: ${JSON.stringify(stats.genderSplit)}
- 자주 적용된 관리/약물(코드): ${stats.commonMeds.slice(0, 6).join(', ')}

## 필수 규칙
1. **실존 개인이 아닌 합성(가상) 전형 사례**임을 전제로 작성. 특정 환자를 묘사하지 마세요.
2. **치료 효과를 단정·보장하지 마세요** (의료광고법). "보통 이런 관리 흐름을 거칩니다" 같은 교육적 서술만.
3. 나이는 구간으로(예: "8~9세"), 수치는 일반화. 재식별 가능한 디테일 금지.
4. 한국어 3~4문장.`;
}
