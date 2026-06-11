export interface RxPaperRef { title: string; journal?: string; year?: number | null; url?: string; pop_group?: string; abstract?: string; key_finding?: string; }
export interface RxPromptInput {
  profile: string;        // 환자 프로필 한 줄
  labText: string;        // 검사결과 텍스트 (피검사/알러지)
  cohortMeds: string[];   // legend 로 주석된 코호트 빈출 약물
  papers: RxPaperRef[];   // 근거 논문 (retrieval)
  bookPassages?: { chapter: string; content: string }[]; // 원장 저서 발췌 (1차 권위)
}
export function buildRxPrompt(i: RxPromptInput): string {
  const papers = i.papers.length
    ? i.papers.map((p, n) => {
        const head = `[${n + 1}] ${p.title} (${p.journal ?? ''} ${p.year ?? ''})${p.pop_group ? ` · 인구:${p.pop_group}` : ''}`;
        const kf = p.key_finding ? `\n   핵심: ${p.key_finding}` : '';
        const ab = p.abstract ? `\n   초록: ${p.abstract.slice(0, 600)}` : '';
        return head + kf + ab;
      }).join('\n')
    : '(관련 논문 없음)';
  const book = i.bookPassages && i.bookPassages.length
    ? i.bookPassages.map((b) => `[${b.chapter}] ${b.content}`).join('\n\n')
    : '';
  return `당신은 소아 성장클리닉 원장의 진료 의사결정을 보조하는 AI입니다. 신규/현재 환자의 검사 결과를 보고 처방/관리 추천안을 제시하세요.

[병원 약물 코드 힌트] 에이큐_G=성장호르몬, 루프린=GnRH agonist(사춘기억제), 아리미덱스=aromatase inhibitor, 멜라토닌/5-HTP=수면 보조. 성장치료 핵심축: 성장호르몬+GnRH억제+아로마타제억제.
[중요] 수면은 성장호르몬 분비에 직결. 검사·문진에서 수면 문제 단서가 보이면 다뤄라.

## 환자 프로필
${i.profile}

## 검사 결과 (피검사/알러지 등)
${i.labText || '(검사결과 미입력)'}

## 이 클리닉에서 유사 프로필 환자에게 자주 처방된 약물 (참고)
${i.cohortMeds.length ? i.cohortMeds.join(', ') : '(데이터 부족)'}

${book ? `## 원장님의 진료 철학·방침 (저서 「우리 아이 키 성장 바이블」 — 이 클리닉의 1차 기준)
${book}

` : ''}## 근거 논문 (이 추천을 뒷받침; 본문에서 [번호]로 인용)
${papers}

## 규칙
1. (위 "원장님의 진료 철학·방침" 발췌가 있으면) 그 접근·방침을 **1차 기준**으로 우선 따르고, 국제 논문은 이를 뒷받침하는 보조 근거로 쓴다.
2. 자율 처방 아님 — "원장 검토용 추천안", 최종 결정은 의사.
3. 각 추천에 검사 소견과의 임상 근거 + 가능하면 위 논문 [번호] 인용.
4. 수치 표준 관련 주장은 아시아 인구 근거 우선, 비아시아/인구불명 근거면 그 한계를 명시.
5. 신뢰도(높음/중간/낮음) + 향후 추적검사 계획.
6. 성장과 무관한 동반질환(예: ADHD 등 환자 요구사항)은 성장 레지멘에서 제외.
7. 한국어, 의사가 빠르게 훑게 구조화(마크다운).`;
}
