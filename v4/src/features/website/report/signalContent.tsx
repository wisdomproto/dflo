import type { ReactNode } from 'react';
import type { BlockId } from './types';

export interface SignalBlock {
  title: string; // h4 text incl. emoji
  body: ReactNode; // <p> inner (may contain <b>)
  src: ReactNode; // 근거 line inner (contains pmid <a>)
  help: ReactNode; // 🏥 병원에서는 … inner (may contain <b>)
  youtube?: { label: string; url: string }[];
}

export const SIGNAL_CONTENT: Record<BlockId, SignalBlock> = {
  sleep: {
    title: '😴 수면 부족',
    body: (
      <>
        성장호르몬은 하루 분비량의 상당 부분이 <b>깊은 잠(서파수면) 중 박동성으로</b> 분비됩니다.
        취침이 늦거나 수면이 부족하면 이 분비 기회가 줄어들어, 오래 자는 것보다{' '}
        <b>질 높은 숙면</b>이 중요합니다.
      </>
    ),
    src: (
      <>
        근거:{' '}
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/4575024/"
          target="_blank"
          rel="noopener noreferrer"
        >
          [4]
        </a>{' '}
        NEJM 1973 · 성장호르몬 분비 조절
      </>
    ),
    help: (
      <>
        수면 습관을 문진으로 점검하고, 필요 시 <b>성장호르몬 축(IGF-1) 혈액검사</b>로 분비 상태를
        확인합니다. 숙면을 방해하는 원인(비염·아데노이드 등)을 찾아 교정 방향을 제시하고, 아이에
        맞는 수면 습관 관리도 함께 진행합니다.
      </>
    ),
  },

  inflammation: {
    title: '🤧 만성 비염·알러지',
    body: (
      <>
        염증이 오래 지속되면 <b>성장에 쓸 에너지가 염증 대응에 소모</b>되어 키 성장으로 갈 에너지가
        부족해질 수 있습니다. 코막힘은 밤잠을 방해해 성장호르몬 분비도 저하시킵니다.
      </>
    ),
    src: (
      <>
        근거:{' '}
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/41305596/"
          target="_blank"
          rel="noopener noreferrer"
        >
          [12]
        </a>{' '}
        Nutrients 2025 · 만성 염증과 성장
      </>
    ),
    help: (
      <>
        <b>정밀 혈액검사(알러지·염증 지표)로 원인을 파악</b>하고, 염증을 관리해 성장으로 갈 에너지를
        회복하도록 돕습니다.
      </>
    ),
  },

  nutrition: {
    title: '🥩 영양 불균형',
    body: (
      <>
        키와 근육이 자라려면 <b>단백질·칼슘·아연·비타민D</b>가 충분해야 하며, 이 영양소가 IGF-1
        분비와 성장판 연골 형성을 돕습니다. 칼로리만 높은 &apos;속 빈 강정&apos; 식사는 성장에
        불리합니다. 또한 <b>특정 음식 알러지</b>가 있으면 소화·흡수 저하와 만성 염증을 통해 성장을
        방해할 수 있습니다.
      </>
    ),
    src: (
      <>
        근거:{' '}
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/15277169/"
          target="_blank"
          rel="noopener noreferrer"
        >
          [7]
        </a>{' '}
        AJCN 2004 ·{' '}
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/16848703/"
          target="_blank"
          rel="noopener noreferrer"
        >
          [8]
        </a>{' '}
        Annu Rev Nutr 2006
      </>
    ),
    help: (
      <>
        혈액검사로 <b>결핍 영양소와 음식 알러지(IgE/IgG)</b>를 확인하고, 아이에게 맞는{' '}
        <b>맞춤형 식단을 설계·관리</b>합니다. 세부 식습관까지 함께 점검합니다.
      </>
    ),
  },

  exercise: {
    title: '🏃 운동 부족',
    body: (
      <>
        <b>줄넘기·농구·배구처럼 점프 동작이 많은 운동</b>은 성장판을 효과적으로 자극합니다. 오래
        앉아 생기는 자세 불균형도 함께 교정하는 것이 좋습니다.
      </>
    ),
    src: (
      <>
        근거:{' '}
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/11874228/"
          target="_blank"
          rel="noopener noreferrer"
        >
          [9]
        </a>{' '}
        JBMR 2002 · 점프 운동과 뼈 성장
      </>
    ),
    help: <>자세를 평가하고 아이 상태에 맞는 <b>성장 운동·자세 교정 가이드</b>를 제시합니다.</>,
    youtube: [
      { label: '목·등 스트레칭', url: 'https://www.youtube.com/watch?v=-DULXNYk3Sg' },
      { label: '복부·허벅지 스트레칭', url: 'https://www.youtube.com/watch?v=RzuXWJJf7bY' },
      { label: '옆구리·허벅지 스트레칭', url: 'https://www.youtube.com/watch?v=cBYdbmVwB0E' },
      { label: '엉덩이 스트레칭', url: 'https://www.youtube.com/watch?v=kcgO4-ifJqE' },
      { label: '등 근육운동', url: 'https://www.youtube.com/watch?v=U62yLjlBSE8' },
      { label: '엉덩이 근육운동', url: 'https://www.youtube.com/watch?v=bqjB7pRbIfw' },
    ],
  },

  puberty: {
    title: '⏳ 사춘기 진행 중',
    body: (
      <>
        사춘기가 시작되면 성장 속도가 빨라졌다가{' '}
        <b>성장판이 닫히며 성장이 마무리</b>됩니다. 현재 어느 단계인지, 성장판이 얼마나 남았는지
        파악하는 것이 이 시기 관리의 핵심입니다.
      </>
    ),
    src: (
      <>
        근거:{' '}
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/15073143/"
          target="_blank"
          rel="noopener noreferrer"
        >
          [5]
        </a>{' '}
        Hum Reprod Update 2004 · 사춘기와 성인키
      </>
    ),
    help: (
      <>
        <b>뼈나이 X-ray와 성호르몬 검사</b>로 사춘기 단계와 성장판 잔여 시간을 정확히 평가해, 현재
        필요한 관리를 안내합니다.
      </>
    ),
  },

  genetics: {
    title: '🧬 유전 잠재 범위',
    body: (
      <>
        키는 유전 영향이 크지만(약 70~80%), 유전은 <b>&apos;하나의 점&apos;이 아니라 &apos;범위&apos;</b>를
        정합니다. 그 범위 안에서 위·아래는 수면·영양·운동·사춘기 관리가 좌우합니다.
      </>
    ),
    src: (
      <>
        근거:{' '}
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/36224396/"
          target="_blank"
          rel="noopener noreferrer"
        >
          [1]
        </a>{' '}
        Nature 2022 · 키 유전
      </>
    ),
    help: (
      <>
        뼈나이로 남은 성장 시간을 확인하고 수면·영양·운동을 최적화해{' '}
        <b>유전 범위 상단을 목표로 관리</b>합니다. 필요 시 의학적 개입의 도움 여부도 함께
        상담합니다.
      </>
    ),
  },

  obesity: {
    title: '⚖️ 과체중·비만',
    body: (
      <>
        지방조직은 렙틴·에스트로겐을 높여 <b>사춘기를 앞당기는 경향</b>이 있으며, 이른 사춘기는
        성장판을 일찍 닫아 최종키에 불리하게 작용할 수 있습니다. 또한 비만은 만성 염증과 호르몬
        교란을 통해 성장호르몬 작용을 방해합니다.
      </>
    ),
    src: (
      <>
        근거:{' '}
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/22290357/"
          target="_blank"
          rel="noopener noreferrer"
        >
          [6]
        </a>{' '}
        Nat Rev Endocrinol 2012 · 비만과 성발달
      </>
    ),
    help: (
      <>
        뼈나이와 대사·호르몬 검사로 사춘기 진행과 비만의 영향을 평가하고, 체중·식이 관리 방향을
        제시합니다.
      </>
    ),
  },

  growthVelocity: {
    title: '📉 성장 속도 저하',
    body: (
      <>
        학령기의 정상 성장 속도는 대략 <b>연 5~6cm</b>입니다. 지속적으로 연 4cm 미만으로 자란다면
        성장호르몬 결핍·갑상선 기능 저하·만성 질환 등 원인을 확인하는 것이 필요합니다.
      </>
    ),
    src: (
      <>
        근거:{' '}
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/18782877/"
          target="_blank"
          rel="noopener noreferrer"
        >
          [11]
        </a>{' '}
        JCEM 2008 · 저신장 평가 합의안
      </>
    ),
    help: (
      <>
        성장 곡선 추적과 함께 <b>성장호르몬·갑상선 혈액검사와 뼈나이</b>로 성장 지연의 원인을
        감별합니다.
      </>
    ),
  },

  sga: {
    title: '👶 저출생·조산 (SGA)',
    body: (
      <>
        작게 태어난 아이의 일부는 <b>만 2~4세까지 또래 평균을 따라잡지 못하고</b> 저신장이 이어질 수
        있습니다. 이 경우 영양·수면 관리와 함께 성장 속도를 정기적으로 확인하는 것이 중요합니다.
      </>
    ),
    src: (
      <>
        근거:{' '}
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/7949620/"
          target="_blank"
          rel="noopener noreferrer"
        >
          [10]
        </a>{' '}
        Acta Paediatr 1994 · SGA 성장
      </>
    ),
    help: (
      <>
        성장 속도를 정기적으로 추적하고, 따라잡기 성장이 지연될 경우 원인 평가와 관리 방향을
        안내합니다.
      </>
    ),
  },

  stress: {
    title: '😔 스트레스',
    body: (
      <>
        만성적인 스트레스는 <b>성장호르몬 분비를 방해</b>합니다. 과도한 학업 부담·수면 부족·정서적
        긴장이 이어지면 성장에 불리할 수 있어, 충분한 대화와 정서적 안정이 성장에도 도움이 됩니다.
      </>
    ),
    src: (
      <>
        근거:{' '}
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/8709732/"
          target="_blank"
          rel="noopener noreferrer"
        >
          [13]
        </a>{' '}
        Lancet 1996 · 심리사회적 저신장
      </>
    ),
    help: (
      <>
        성장에 영향을 줄 수 있는 스트레스·수면 요인을 함께 점검하고 생활 관리 방향을 안내합니다.
      </>
    ),
  },
};
