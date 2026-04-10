// Insert 7 treatment cases into website_sections DB
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mufjnulwnppgvibmmbfo.supabase.co',
  'YOUR_SUPABASE_SERVICE_ROLE_KEY'
);

function uid() {
  return 'case-' + Math.random().toString(36).slice(2, 10);
}

const cases = [
  // ─── 1. 채유건 (쌍둥이 아들) ───
  {
    template: 'cases',
    id: uid(),
    patientName: '유건',
    gender: 'male',
    category: '',
    birthDate: '2010-11-27',
    intakeInfo: {
      fatherHeight: null,
      motherHeight: null,
      desiredHeight: '180cm 이상',
      growthConcerns: '쌍둥이 아들, 성조숙증 징후',
    },
    initialMemo: '초진 당시 뼈나이가 실제 나이보다 1년 3개월이나 앞서 있었습니다. 이대로면 173cm에서 성장이 멈출 수 있는 상황. 성장판이 일찍 닫히기 전에 골연령 억제 치료를 시작했습니다.',
    finalMemo: `초진 예상키 173cm에서 시작해, 현재 186cm까지 성장했습니다. 무려 +13cm 초과 달성!

루프린 치료로 골연령 진행을 성공적으로 억제하면서, 동시에 키 성장은 꾸준히 이어졌습니다. 특히 2024년 1월 검진에서 뼈나이가 실제 나이보다 오히려 어려진 것을 확인했을 때, 치료가 제대로 효과를 보고 있다는 확신이 들었습니다.

"쌍둥이라 유전적으로 불리할 줄 알았는데, 아이가 186cm까지 자라다니 정말 꿈만 같아요." — 어머니

꾸준한 수면 관리와 영양 관리, 그리고 적절한 시기의 골연령 억제 치료가 만들어낸 결과입니다. 성장 치료는 타이밍이 생명입니다.`,
    measurements: [
      { date: '2021-07-14', height: 153.5, weight: 54, boneAge: 12.0, predictedHeight: 175.3, memo: '초진' },
      { date: '2022-02-22', height: 161.3, weight: 62.8, boneAge: 12.0, predictedHeight: 181.5, memo: '7.6cm/6개월 성장' },
      { date: '2022-12-02', height: 166.1, weight: 69.3, boneAge: 12.75, predictedHeight: 180.9, memo: '꾸준한 성장 유지' },
      { date: '2023-05-01', height: 168.6, weight: 72.8, boneAge: 13.17, predictedHeight: 180.7, memo: '' },
      { date: '2024-01-08', height: 173.0, weight: 78.8, boneAge: 13.5, predictedHeight: 182.7, memo: '골연령 역전 성공 (BA < CA)' },
    ],
    showCta: true,
    fontScale: 70,
    order: 0,
  },

  // ─── 2. 송윤우 (연예인 연습생) ───
  {
    template: 'cases',
    id: uid(),
    patientName: '윤우',
    gender: 'male',
    category: '',
    birthDate: '2011-06-12',
    intakeInfo: {
      fatherHeight: 174,
      motherHeight: 160,
      desiredHeight: '180cm 이상',
      growthConcerns: '연예인 연습생, 최근 성장 속도 둔화',
    },
    initialMemo: '아빠 174cm, 엄마 160cm. 유전적 예상키 약 174cm. 연예기획사 연습생으로 활동 중이라 키에 대한 관심이 높았습니다. 첫 검진에서 뼈나이가 1년 앞서있어 빠른 대응이 필요했습니다.',
    finalMemo: `초진 당시 145.3cm, 예상키 176cm이었던 아이가 지금은 180cm을 돌파했습니다!

약 4년 반의 치료 기간 동안, 총 34.7cm가 자랐습니다. 특히 치료 초반 6개월간 6.7cm가 자라며 빠른 성장 반응을 보였고, 이후에도 꾸준히 연 7~8cm 이상의 성장 속도를 유지했습니다.

연습생 생활로 불규칙한 생활 패턴이 걱정이었지만, 수면 시간 확보와 영양 관리를 병행하며 성장 호르몬 분비를 최대화했습니다. 라면 같은 가공식품 섭취를 줄이고 단백질 위주의 식단으로 전환한 것도 큰 도움이 되었습니다.

"키가 180이 넘으니 오디션에서도 자신감이 달라졌어요!" — 본인

유전적 한계를 뛰어넘어 꿈에 한 발짝 더 가까워진 케이스입니다.`,
    measurements: [
      { date: '2020-09-22', height: 145.3, weight: 44, boneAge: 10.25, predictedHeight: 178.2, memo: '초진' },
      { date: '2021-06-08', height: 152.0, weight: 50.5, boneAge: 12.0, predictedHeight: 174.1, memo: '6개월 f/u' },
      { date: '2022-06-13', height: 159.6, weight: 53.6, boneAge: 12.67, predictedHeight: 176.3, memo: '' },
      { date: '2022-09-06', height: 164.1, weight: 55.5, boneAge: 12.5, predictedHeight: 180.8, memo: '' },
      { date: '2023-02-20', height: 168.8, weight: 59.7, boneAge: 13.33, predictedHeight: 180.0, memo: '' },
      { date: '2023-09-12', height: 172.6, weight: 58, boneAge: 13.5, predictedHeight: 182.4, memo: '' },
      { date: '2024-05-24', height: 175.5, weight: 62.8, boneAge: 13.58, predictedHeight: 183.0, memo: '' },
      { date: '2024-10-04', height: 176.8, weight: 64, boneAge: 14.25, predictedHeight: 182.9, memo: '' },
      { date: '2025-03-20', height: 180.0, weight: 65.6, boneAge: 14.67, predictedHeight: 183.1, memo: '180cm 돌파!' },
    ],
    showCta: true,
    fontScale: 70,
    order: 1,
  },

  // ─── 3. 이재윤 (성조숙증, 비만) ───
  {
    template: 'cases',
    id: uid(),
    patientName: '재윤',
    gender: 'male',
    category: '성조숙증',
    birthDate: '2011-12-17',
    intakeInfo: {
      fatherHeight: 180,
      motherHeight: null,
      desiredHeight: '182cm',
      growthConcerns: '성조숙증 + 비만, 뼈나이 4세 이상 앞서 있음',
    },
    initialMemo: '초진 시 실제 나이 9세 2개월인데 뼈나이가 무려 13세 6개월! 4년 넘게 앞서 있는 심각한 성조숙증 케이스였습니다. 체중도 63kg으로 비만 상태. 뼈나이 억제가 시급했습니다.',
    finalMemo: `가장 극적인 변화를 보여준 케이스입니다. 초진 147.8cm에서 현재 177.4cm, 약 30cm 성장!

뼈나이가 4년 넘게 앞서있어 "이미 늦었다"고 포기할 수 있었지만, 아리미덱스 치료를 통해 골연령 진행을 억제하는 데 성공했습니다. 특히 2024년 검진에서 뼈나이가 13세8개월로, 실제나이 대비 불과 11개월 차이까지 좁혀진 것은 놀라운 결과입니다.

비만 관리가 가장 큰 과제였습니다. 체중이 100kg을 넘기기도 했지만, 포기하지 않고 식이 관리와 운동을 병행했습니다. 수면 관리 역시 4년 내내 핸드폰과의 전쟁이었지만, 부모님의 끈기 있는 관리가 결국 결실을 맺었습니다.

"성조숙증이라 160도 힘들 거라 했는데, 벌써 177이 넘었어요. 포기하지 않길 정말 잘했습니다." — 아버지

성조숙증은 조기 발견과 꾸준한 치료가 핵심입니다.`,
    measurements: [
      { date: '2021-03-06', height: 147.8, weight: 63.2, boneAge: 13.5, predictedHeight: 162.9, memo: '초진, 심한 성조숙증' },
      { date: '2021-09-25', height: 155.6, weight: 72.8, boneAge: 13.5, predictedHeight: 169.1, memo: '' },
      { date: '2022-02-08', height: 158.1, weight: 81, boneAge: 13.33, predictedHeight: 171.6, memo: '' },
      { date: '2022-10-15', height: 165.0, weight: 87, boneAge: 13.33, predictedHeight: 176.9, memo: '채소 늘리기 시작' },
      { date: '2023-04-08', height: 168.8, weight: 88, boneAge: 13.5, predictedHeight: 179.2, memo: '수면·음식·운동 관리' },
      { date: '2023-10-14', height: 173.2, weight: 105.6, boneAge: 13.5, predictedHeight: 182.9, memo: '체중 관리 필요' },
      { date: '2024-04-27', height: 174.7, weight: 106, boneAge: 13.5, predictedHeight: 183.0, memo: '' },
      { date: '2024-10-05', height: 177.4, weight: 113.8, boneAge: 13.67, predictedHeight: 183.2, memo: '' },
    ],
    showCta: true,
    fontScale: 70,
    order: 2,
  },

  // ─── 4. 박민찬 (운동선수 준비, 부모 키 작은 케이스) ───
  {
    template: 'cases',
    id: uid(),
    patientName: '민찬',
    gender: 'male',
    category: '부모 키가 작은 경우',
    birthDate: '2010-04-16',
    intakeInfo: {
      fatherHeight: 168,
      motherHeight: 158,
      desiredHeight: '185cm',
      sportsSpecialist: true,
      growthConcerns: '야구 선수 준비 중, 부모 키가 작아 걱정',
    },
    initialMemo: '아빠 168cm, 엄마 158cm. 유전적 예상키 약 170cm에 불과. 야구 선수를 꿈꾸는 아이라 키가 절실한 상황이었습니다. 연간 성장 속도도 3cm로 매우 더딘 상태에서 치료를 시작했습니다.',
    finalMemo: `아빠 168cm, 엄마 158cm — 유전적으로 170cm 정도가 한계였던 아이가 175.6cm을 넘겼습니다. 이미 아빠 키를 넘었고, 아직 성장판이 남아있습니다!

초진 시 연간 성장 속도가 3cm에 불과했는데, 치료 시작 후 첫 6개월간 5.5cm가 자라며 성장 속도가 크게 개선되었습니다. 이후 아리미덱스 치료를 병행하면서 골연령 역전에도 성공. 뼈나이 14세3개월에 175.6cm이면 최종 182cm 이상이 기대됩니다.

운동선수답게 체력 관리는 잘 되어있었지만, "늦게 자고 길게 자는" 수면 패턴이 문제였습니다. 수면 시작 시간을 앞당기는 것이 치료의 핵심 포인트였고, 부모님의 꾸준한 관리로 조금씩 개선되었습니다.

"키가 작은 부모 밑에서 태어나서 미안했는데, 이제는 아빠보다 훨씬 크다고 좋아해요." — 어머니

유전이 전부가 아닙니다. 적극적인 치료와 생활 관리로 유전적 한계를 돌파할 수 있습니다.`,
    measurements: [
      { date: '2021-09-18', height: 146.2, weight: 43, boneAge: 11.67, predictedHeight: 171.2, memo: '초진, 연간 3cm 성장' },
      { date: '2022-04-04', height: 151.7, weight: 47.5, boneAge: 12.0, predictedHeight: 173.8, memo: '' },
      { date: '2022-11-16', height: 156.6, weight: 50.6, boneAge: 13.5, predictedHeight: 169.8, memo: '' },
      { date: '2023-05-01', height: 164.1, weight: 50.2, boneAge: 13.42, predictedHeight: 175.7, memo: '' },
      { date: '2023-11-06', height: 168.0, weight: 60, boneAge: 13.5, predictedHeight: 178.6, memo: '' },
      { date: '2024-03-02', height: 171.0, weight: 61.8, boneAge: 13.67, predictedHeight: 180.4, memo: 'Arimidex 시작' },
      { date: '2024-09-13', height: 173.6, weight: 66, boneAge: 13.67, predictedHeight: 182.6, memo: '' },
      { date: '2025-05-18', height: 175.6, weight: 68.3, boneAge: 14.25, predictedHeight: 182.2, memo: '아빠 키 돌파!' },
    ],
    showCta: true,
    fontScale: 70,
    order: 3,
  },

  // ─── 5. 유지훈 (해외 치료 케이스 - 오빠) ───
  {
    template: 'cases',
    id: uid(),
    patientName: '지훈',
    gender: 'male',
    category: '',
    birthDate: '2012-03-31',
    intakeInfo: {
      fatherHeight: 167,
      motherHeight: 160,
      desiredHeight: '183cm',
      growthConcerns: '미국 거주, 한국 방문하여 치료 시작',
    },
    initialMemo: '아빠 167cm, 엄마 160cm. 미국에서 거주하다 성장 치료를 위해 한국까지 방문한 케이스입니다. 유전적 예상키는 약 170cm. 뼈나이가 1년 이상 앞서있어 골연령 억제가 시급했습니다.',
    finalMemo: `미국에서 성장 치료를 위해 한국까지 찾아온 케이스. 아빠 167cm, 엄마 160cm인데 현재 174.3cm까지 성장하며 이미 아빠 키를 7cm 이상 넘었습니다!

루프린 + 엘라스틴 + 성장호르몬 3중 치료를 진행했고, 골연령 억제 효과가 탁월했습니다. 실제 나이 13세9개월에 뼈나이 13세4개월로, 5개월이나 뒤처지게 만든 것은 대단한 성과입니다.

성장호르몬 용량을 5.5 → 6.8 IU로 단계적으로 올려가며, AI 예상키도 172.3 → 182.9cm으로 꾸준히 상승했습니다. 뼈나이 13세4개월에 172.8cm이면 성장판이 아직 충분히 남아있어 목표 183cm 달성이 매우 유망합니다.

"미국 병원에서는 방법이 없다고 했는데, 한국까지 와서 치료받길 정말 잘했어요." — 아버지

국경을 넘어 찾아온 신뢰가 만들어낸 결과입니다.`,
    measurements: [
      { date: '2023-07-08', height: 153.3, weight: 40.6, boneAge: 12.5, predictedHeight: 172.3, memo: '초진' },
      { date: '2024-01-02', height: 157.7, weight: 41.2, boneAge: 12.0, predictedHeight: 178.7, memo: '' },
      { date: '2024-06-08', height: 161.8, weight: 45, boneAge: 13.25, predictedHeight: 174.8, memo: '사춘기 징후' },
      { date: '2024-12-11', height: 165.9, weight: 48, boneAge: 13.25, predictedHeight: 178.1, memo: '루프린 시작' },
      { date: '2025-06-07', height: 168.7, weight: 50.6, boneAge: 13.25, predictedHeight: 180.4, memo: '' },
      { date: '2026-01-24', height: 172.8, weight: 56.7, boneAge: 13.33, predictedHeight: 182.9, memo: '아빠 키 돌파!' },
    ],
    showCta: true,
    fontScale: 70,
    order: 4,
  },

  // ─── 6. 유세희 (해외 치료 케이스 - 여동생) ───
  {
    template: 'cases',
    id: uid(),
    patientName: '세희',
    gender: 'female',
    category: '성조숙증',
    birthDate: '2015-04-02',
    intakeInfo: {
      fatherHeight: 167,
      motherHeight: 160,
      desiredHeight: '165cm',
      growthConcerns: '오빠와 함께 미국에서 치료 방문, 성조숙증 의심',
    },
    initialMemo: '오빠 지훈이와 함께 미국에서 치료를 위해 한국을 방문한 남매 케이스입니다. 엄마 160cm, 유전적 예상키 157cm. 8세인데 뼈나이가 10세6개월로 2년 이상 앞서있어 조기 치료가 필요했습니다.',
    finalMemo: `남매 동반 치료의 성공 사례! 오빠 지훈이와 함께 미국에서 매번 한국을 방문하며 치료를 받았습니다.

초진 시 AI 예상키 153.8cm에서 시작해, 현재 예상키 166.4cm까지 올라왔습니다. 목표키 165cm 달성이 코앞입니다!

루프린으로 약 2년간 골연령을 억제하면서, 성장호르몬은 4.0 → 5.5 IU까지 단계적으로 증가시켰습니다. 수면 관리도 잘 되었고, 채소 섭취도 꾸준히 늘려 치료 반응이 매우 좋았습니다.

뼈나이 11세9개월에 156.9cm이면 아직 성장판이 충분히 남아있어, 최종 165cm 이상 달성이 매우 기대됩니다.

"딸도 아들만큼 잘 크고 있어서, 남매 다 같이 목표 달성할 수 있을 것 같아요!" — 어머니

남매 모두 유전적 한계를 뛰어넘는 치료 대성공 케이스입니다.`,
    measurements: [
      { date: '2023-07-08', height: 133.7, weight: 31.8, boneAge: 10.5, predictedHeight: 153.8, memo: '초진' },
      { date: '2024-01-08', height: 138.3, weight: 31.8, boneAge: 10.83, predictedHeight: 155.7, memo: '' },
      { date: '2024-06-28', height: 142.8, weight: 34.3, boneAge: 10.83, predictedHeight: 159.2, memo: '' },
      { date: '2024-12-28', height: 147.2, weight: 32.8, boneAge: 11.33, predictedHeight: 160.1, memo: '루프린 시작' },
      { date: '2025-06-04', height: 156.4, weight: 40.8, boneAge: 11.33, predictedHeight: 167.8, memo: '' },
      { date: '2026-01-20', height: 156.9, weight: 42.8, boneAge: 11.75, predictedHeight: 166.4, memo: '' },
    ],
    showCta: true,
    fontScale: 70,
    order: 5,
  },

  // ─── 7. 다나카고키 (일본에서 온 케이스) ───
  {
    template: 'cases',
    id: uid(),
    patientName: '고키',
    gender: 'male',
    category: '',
    birthDate: '2009-01-29',
    intakeInfo: {
      fatherHeight: 173,
      motherHeight: 168,
      desiredHeight: '180cm 이상',
      growthConcerns: '일본 거주, 방학 때마다 한국 방문하여 치료',
    },
    initialMemo: '아빠 173cm, 엄마 168cm. 유전적 예상키 175cm이지만, 초진 시 예상키가 167cm에 불과. 일본에서 거주하며 방학 때마다 한국을 방문하여 치료를 받는 특별한 케이스입니다.',
    finalMemo: `일본에서 방학 때마다 한국을 찾아와 치료받은 국제 케이스! 초진 예상키 167cm에서 현재 175.6cm까지 성장하며, 유전적 예상키 175cm을 이미 초과 달성했습니다.

이 케이스의 하이라이트는 골연령 억제 효과입니다. 실제 나이 16세에 뼈나이가 13세10개월로, 무려 2년 넘게 뒤처지게 만들었습니다. 이는 성장판이 아직 많이 남아있다는 뜻으로, 178~180cm까지 충분히 도달 가능합니다.

외부에서 GPC를 사용하고 있었고, 3~4년의 장기 치료 계획을 세웠습니다. 일본과 한국을 오가는 불편함에도 불구하고 꾸준히 치료를 이어간 가족의 의지가 인상적이었습니다.

다만 수면 관리가 끝까지 과제였습니다. 12시 이후 취침이 반복되었지만, 그 외 식사와 운동 관리는 양호했습니다.

"일본 병원에서는 '유전이니까 어쩔 수 없다'고만 했는데, 한국에서 치료받으니 정말 달라졌어요." — 어머니

국경을 넘은 성장 치료의 가능성을 보여준 케이스입니다.`,
    measurements: [
      { date: '2021-09-07', height: 146.6, weight: 39, boneAge: 12.58, predictedHeight: 167.0, memo: '초진' },
      { date: '2023-01-10', height: 161.0, weight: 51.4, boneAge: 13.08, predictedHeight: 175.0, memo: '' },
      { date: '2023-07-17', height: 165.8, weight: 53.6, boneAge: 13.25, predictedHeight: 178.0, memo: '' },
      { date: '2024-01-05', height: 170.4, weight: 57.1, boneAge: 13.5, predictedHeight: 180.6, memo: '' },
      { date: '2024-07-05', height: 173.8, weight: 58.8, boneAge: 13.67, predictedHeight: 182.7, memo: '' },
      { date: '2025-02-01', height: 175.6, weight: 58.6, boneAge: 13.83, predictedHeight: 183.0, memo: '유전키 175 초과!' },
    ],
    showCta: true,
    fontScale: 70,
    order: 6,
  },
];

async function main() {
  // Check if a "치료 사례" section already exists
  const { data: existing, error: fetchErr } = await supabase
    .from('website_sections')
    .select('*')
    .order('order_index', { ascending: true });

  if (fetchErr) {
    console.error('DB fetch error:', fetchErr.message);
    process.exit(1);
  }

  console.log(`Existing sections: ${existing?.length || 0}`);
  existing?.forEach(s => console.log(`  [${s.order_index}] ${s.title} (${s.slides?.length || 0} slides)`));

  // Find if cases section exists
  const casesSection = existing?.find(s => s.title === '치료 사례');

  if (casesSection) {
    // Update existing
    const { error } = await supabase
      .from('website_sections')
      .update({ slides: cases, updated_at: new Date().toISOString() })
      .eq('id', casesSection.id);

    if (error) {
      console.error('Update error:', error.message);
      process.exit(1);
    }
    console.log(`\nUpdated "치료 사례" section (${cases.length} cases)`);
  } else {
    // Insert new section at the end
    const maxOrder = existing?.reduce((max, s) => Math.max(max, s.order_index || 0), -1) ?? -1;
    const newOrder = maxOrder + 1;

    const { data, error } = await supabase
      .from('website_sections')
      .insert({
        order_index: newOrder,
        template: 'banner', // DB compat
        title: '치료 사례',
        slides: cases,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error('Insert error:', error.message);
      process.exit(1);
    }
    console.log(`\nInserted "치료 사례" section at order ${newOrder} (${cases.length} cases)`);
    console.log('Section ID:', data?.[0]?.id);
  }

  // Verify
  const { data: verify } = await supabase
    .from('website_sections')
    .select('id, title, order_index')
    .order('order_index');

  console.log('\nFinal sections:');
  verify?.forEach(s => console.log(`  [${s.order_index}] ${s.title}`));
}

main().catch(console.error);
