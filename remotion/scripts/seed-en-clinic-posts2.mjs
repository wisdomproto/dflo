// 영어 블로그 2차 3편(#906~908) — 구글 「관련 질문」이 알려준 자리를 채운다.
//   node scripts/seed-en-clinic-posts2.mjs [--dry]
//
// 근거: `growth clinic in korea` 계열 두 질의의 「관련 질문」에 공통으로 뜬 것 —
//   Is 14 too late for growth hormone? / Do South Koreans take growth hormones? /
//   Is there any treatment for height growth? / Is there a growth clinic for children in Korea?
// 그리고 AI 개요가 「유형 목록」으로 답할 때 **개인 전문 클리닉 칸에 이름이 하나도 없다**
// (대학병원만 이름이 박히고, 개인 클리닉 문단은 언론 기사로 뭉뚱그려진다). 그 칸을 노린다.
//
// 🚨 의료광고: **타 병원 이름을 쓰지 않는다**(의료법 56조 비교광고). #908 은 유형만 설명하고
// 우리가 어디에 속하는지만 밝힌다. 전문의약품 이름 금지. 금액 미기재(사용자 방침) —
// 다만 「보험이 되는 경우와 안 되는 경우」는 제도 사실이라 쓴다(금액이 아니다).
import { rest } from './lib/reelDb.mjs';

const DRY = process.argv.includes('--dry');
const IMG = 'Flat 2D vector illustration, 16:9, pastel tones with mint accent, no text in image. ';

const POSTS = [
  {
    title: '[EN] 14세면 늦었나 — 답은 뼈나이에 있다',
    category: '성장과학',
    keywords: ['is 14 too late for growth hormone', 'too late to grow taller', 'growth plates closed', 'bone age', 'can a 14 year old still grow'],
    en: {
      seoTitle: 'Is 14 Too Late for Growth Treatment? What Bone Age Says',
      slug: 'is-14-too-late-growth-hormone-bone-age',
      h1: 'Is 14 Too Late? Why the Birthday Is the Wrong Number to Look At',
      metaDescription:
        'Whether a 14-year-old still has time is not answered by their age. It is answered by how much growth plate is left — which is a question an X-ray can settle in an afternoon.',
      primaryKeyword: 'is 14 too late for growth hormone',
      secondaryKeywords: ['can a 14 year old still grow taller', 'growth plates closed', 'bone age test', 'too late to grow taller', 'growth plate closure age'],
      sections: [
        {
          heading: 'The Question Underneath “Is 14 Too Late?”',
          html:
            '<p>Parents who ask whether <strong>14 is too late for growth hormone</strong> are usually not asking about hormones at all. They are asking whether they have missed something, and whether there is any point looking into it now.</p>' +
            '<p>The honest answer is that fourteen tells you almost nothing. We have seen fourteen-year-olds with years of growth left and fourteen-year-olds whose plates were nearly shut. Same birthday, entirely different situation.</p>' +
            '<p>What decides it is how much growth plate remains — and that is measurable rather than guessable.</p>',
          imagePrompt: IMG + 'Two calendars side by side both showing the same age, with two very different hourglasses beneath them — one still full, one nearly empty.',
          imageUrl: '',
        },
        {
          heading: 'What the Growth Plates Actually Are',
          html:
            '<p>Long bones grow at a layer of cartilage near each end called the growth plate. While that cartilage is open, bone can still be added and a child gets taller. When it hardens into bone, the process is finished and no treatment reopens it.</p>' +
            '<p>The plates do not close on a birthday. They close on their own schedule, driven largely by sex hormones — which is why a child who entered puberty early can finish growing years before a classmate the same age.</p>' +
            '<p>So the real question is not <em>how old is this child</em> but <em>how far along are the plates</em>.</p>',
          imagePrompt: IMG + 'A simplified long bone cross-section showing a soft cartilage band near one end, with a second version alongside where that band has hardened.',
          imageUrl: '',
        },
        {
          heading: 'How a Wrist X-Ray Answers It',
          html:
            '<p>A hand-and-wrist radiograph is the standard way to read this. The bones of the hand mature in a known sequence, so the image gives a <strong>bone age</strong> — a biological age that can run ahead of or behind the calendar.</p>' +
            '<p>A fourteen-year-old with a bone age of twelve has more room than the birthday suggests. One with a bone age of sixteen has considerably less. Both look exactly the same standing in a doorway.</p>' +
            '<p>It is a quick, low-dose study available at most hospitals, and it settles a question families have often been carrying for years.</p>',
          imagePrompt: IMG + 'A hand X-ray outline beside a simple dial that can point either ahead of or behind a marked centre point.',
          imageUrl: '',
        },
        {
          heading: 'What Still Helps When Time Is Short',
          html:
            '<p>When the plates are closing, the arithmetic changes. Adding growth becomes harder; <em>preserving the remaining window</em> becomes the thing that matters.</p>' +
            '<p>That is why puberty timing gets attention in the later teens. If the process is running fast, slowing it can leave more of the window open — which affects the final number more than anything added on top would.</p>' +
            '<p>The other axes still apply, and they apply immediately. Sleep quality, nutrition and absorption, posture and activity — none of them require a prescription, and all of them are working for or against a child every night.</p>' +
            '<p>Whether any medical treatment is appropriate is decided by test results and examination, not by age alone.</p>',
          imagePrompt: IMG + 'A narrowing funnel with a small clock inside it, and four small icons feeding into the funnel: a moon, a plate, a shoe, a spine.',
          imageUrl: '',
        },
        {
          heading: 'When It Genuinely Is Too Late',
          html:
            '<p>It is worth saying plainly: sometimes the answer is that the window has closed.</p>' +
            '<p>If the X-ray shows fused growth plates, no hormone, supplement or programme will add height. Anyone who tells a family otherwise at that point is selling something.</p>' +
            '<p>Knowing that is not a wasted trip. Families who get a clear answer stop spending money and attention on things that cannot work, and the child stops being measured against a target that is no longer reachable.</p>' +
            '<p>Growth depends on the individual child, and this article is general information rather than a diagnosis.</p>',
          imagePrompt: IMG + 'A closed door with a small calm checkmark beside it, drawn plainly rather than dramatically.',
          imageUrl: '',
        },
        {
          heading: 'What to Do This Month, Not Next Year',
          html:
            '<p>If your child is in the middle teens and you are unsure, the sequence is short.</p>' +
            '<p><strong>Measure properly and write it down.</strong> Height at the same time of day, against a wall, without shoes. Compare it with a measurement from twelve months ago if you have one — growth over the last year says more than any single number.</p>' +
            '<p><strong>Get a wrist X-ray.</strong> It is available locally almost anywhere and gives the answer that age cannot.</p>' +
            '<p><strong>Then decide.</strong> With bone age and growth velocity in hand, the question stops being «is it too late» and becomes a specific one about a specific child.</p>' +
            '<p>Waiting a year to see what happens is the one option that costs something that cannot be recovered.</p>',
          imagePrompt: IMG + 'Three numbered steps in a row: a wall ruler, a hand X-ray, and a simple decision fork.',
          imageUrl: '',
        },
      ],
      faq: [
        {
          q: 'Can a 14-year-old still grow taller?',
          a: 'Often yes, but it depends entirely on whether the growth plates are still open. A wrist X-ray shows this directly, and two children of the same age can be years apart. Age alone does not answer the question.',
        },
        {
          q: 'How do I know if the growth plates have closed?',
          a: 'A hand-and-wrist X-ray shows the plates and gives a bone age. It is a quick, low-dose study available at most hospitals, and it is the only reliable way to know rather than guess.',
        },
        {
          q: 'If time is short, what actually makes a difference?',
          a: 'Preserving the remaining window matters more than adding to it. Puberty progression, sleep quality, nutrition and absorption all affect how much of that window stays open. What is appropriate for a particular child is decided from test results and examination.',
        },
      ],
    },
  },

  {
    title: '[EN] 한국에서 성장호르몬은 누가 처방받나 — 보험 기준',
    category: '성장과학',
    keywords: ['do south koreans take growth hormones', 'growth hormone korea', 'growth hormone insurance korea', 'who qualifies growth hormone', 'growth hormone treatment children'],
    en: {
      seoTitle: 'Growth Hormone in Korea: Who Actually Gets Prescribed It',
      slug: 'growth-hormone-in-korea-who-gets-it',
      h1: 'Growth Hormone in Korea — Who It Is For, and Who It Is Not For',
      metaDescription:
        'Korea prescribes growth hormone widely, but the line between a covered medical diagnosis and an elective request is sharper than most families expect. What separates the two.',
      primaryKeyword: 'do south koreans take growth hormones',
      secondaryKeywords: ['growth hormone korea', 'growth hormone insurance coverage korea', 'who qualifies for growth hormone', 'growth hormone treatment for children'],
      sections: [
        {
          heading: 'Yes — And That Is Exactly Why the Question Matters',
          html:
            '<p>Growth hormone is prescribed widely in Korea, and coverage of that fact in the press is what most people outside the country have read. What the coverage rarely explains is <strong>who it is actually for</strong>.</p>' +
            '<p>There is a clear line between a diagnosed medical condition and an elective request to be taller, and the two are treated differently — clinically and administratively.</p>' +
            '<p>Families arriving from abroad usually want to know which side of that line their child falls on. That is a testable question, not an opinion.</p>',
          imagePrompt: IMG + 'A single vertical dividing line with a stethoscope icon on one side and a simple ruler icon on the other.',
          imageUrl: '',
        },
        {
          heading: 'The Covered Side — A Diagnosis, Not a Height',
          html:
            '<p>Korea’s national health insurance covers growth hormone treatment when a recognised medical condition is diagnosed. The conditions are specific, and the criteria are set nationally rather than by each clinic.</p>' +
            '<p>Growth hormone deficiency is the clearest case: the body is not producing enough, and replacing it treats the deficiency. Certain chromosomal and developmental conditions, and children born small for gestational age who have not caught up, are also recognised.</p>' +
            '<p>What matters is that all of these are diagnoses. Being short is not one — a child in the lowest percentiles with no underlying condition does not qualify on height alone.</p>',
          imagePrompt: IMG + 'A clipboard with three checked boxes and one unchecked box below a divider line.',
          imageUrl: '',
        },
        {
          heading: 'The Elective Side — And What It Is Reasonable to Expect',
          html:
            '<p>Outside those criteria, treatment is possible but paid privately, and this is where families deserve a straight answer.</p>' +
            '<p>The evidence for growth hormone in children who are short without a deficiency is more modest than the enthusiasm around it suggests. It is not nothing, and it is not the transformation the number of headlines implies.</p>' +
            '<p>Which is why the useful conversation is not «can we get it» — in a private setting the answer is often yes — but «what would it actually do for this child, and is there something else limiting growth that would do more».</p>' +
            '<p>Any clinic promising a specific number of centimetres is describing an outcome nobody can guarantee.</p>',
          imagePrompt: IMG + 'A balance scale with a small upward arrow on one side and a question mark on the other.',
          imageUrl: '',
        },
        {
          heading: 'What Gets Checked Before Anything Is Prescribed',
          html:
            '<p>Regardless of which side a child falls on, the workup comes first.</p>' +
            '<ul>' +
            '<li><strong>Bone age</strong> — a wrist X-ray showing how much growth plate remains</li>' +
            '<li><strong>Hormone panel</strong> — growth hormone markers, thyroid function, and where relevant sex hormones</li>' +
            '<li><strong>General blood work</strong> — liver and kidney function and blood glucose, which decide what is safe to prescribe</li>' +
            '<li><strong>Growth history</strong> — height over time, because velocity says more than a single measurement</li>' +
            '</ul>' +
            '<p>These are repeated at intervals during treatment. A plan that is not working should be visible in the numbers within months, and that is the point of measuring rather than assuming.</p>',
          imagePrompt: IMG + 'Four small circular icons in a row: a hand X-ray, a hormone flask, a blood vial, and a rising line chart.',
          imageUrl: '',
        },
        {
          heading: 'Side Effects, Stated Plainly',
          html:
            '<p>Reactions at the injection site are the most common. Temporary headache or swelling have also been reported. Most of what is seen is mild.</p>' +
            '<p>The reason for scheduled re-testing is that changes in blood values can appear before anything is felt. If something is found, the plan is adjusted or stopped.</p>' +
            '<p>A clinic that will not discuss this plainly before starting is worth a second look. Treatment that runs for years should come with a stated stopping point.</p>',
          imagePrompt: IMG + 'A calendar strip with repeating small checkpoint marks and one clear stop marker.',
          imageUrl: '',
        },
        {
          heading: 'What Families From Abroad Usually Want to Know First',
          html:
            '<p>Two questions come up almost every time.</p>' +
            '<p><strong>Does our child qualify?</strong> That is answered by the workup above, and most of it can be done where you live — a local wrist X-ray and blood test, reviewed together on a video call.</p>' +
            '<p><strong>Is it worth coming at all?</strong> Sometimes the honest answer is that there is time and nothing to start yet. Finding that out from home is a reasonable outcome, and it costs a local X-ray.</p>' +
            '<p>Whether treatment is appropriate, and by what method, is decided from test results and examination. The same approach is not applied to every child.</p>',
          imagePrompt: IMG + 'A laptop showing a video call, with a small X-ray image and a growth chart resting beside it.',
          imageUrl: '',
        },
      ],
      faq: [
        {
          q: 'Do South Koreans take growth hormone?',
          a: 'It is prescribed widely, but the line between a covered medical diagnosis and a privately paid elective request is sharp. National insurance applies to recognised conditions such as growth hormone deficiency, not to height alone.',
        },
        {
          q: 'Does my child qualify for treatment?',
          a: 'That is decided by bone age, hormone levels and growth history rather than by height. Most of that workup can be done locally and reviewed on a video call before anyone travels.',
        },
        {
          q: 'What are the known side effects?',
          a: 'Injection-site reactions are the most common, with temporary headache or swelling also reported. Most are mild. Scheduled re-testing exists because some changes show in blood values before they are felt.',
        },
      ],
    },
  },

  {
    title: '[EN] 한국 성장클리닉의 종류 — 어디로 가야 하나',
    category: '성장과학',
    keywords: ['types of growth clinic korea', 'growth clinic korea', 'university hospital vs private clinic', 'is there any treatment for height growth', 'child growth clinic'],
    en: {
      seoTitle: 'Types of Growth Clinics in Korea — and Which Suits Your Child',
      slug: 'types-of-growth-clinics-in-korea',
      h1: 'The Three Kinds of Growth Clinic in Korea',
      metaDescription:
        'University hospital growth centres, private growth clinics, and traditional Korean medicine clinics do different things. Which one fits depends on what is actually limiting a child.',
      primaryKeyword: 'types of growth clinic korea',
      secondaryKeywords: ['growth clinic korea', 'university hospital or private clinic', 'is there any treatment for height growth', 'child growth clinic seoul'],
      sections: [
        {
          heading: 'Three Kinds, Doing Three Different Things',
          html:
            '<p>Families searching for a <strong>growth clinic in Korea</strong> quickly find that «growth clinic» covers several quite different things. Knowing which is which saves a wasted appointment.</p>' +
            '<p>Broadly there are three: growth centres inside university and general hospitals, private clinics specialising in children’s growth, and traditional Korean medicine clinics.</p>' +
            '<p>They are not ranked. They are suited to different situations, and the right one depends on what is actually limiting a particular child.</p>',
          imagePrompt: IMG + 'Three simple building silhouettes of different shapes in a row, equal in height, on a plain baseline.',
          imageUrl: '',
        },
        {
          heading: 'University and General Hospital Growth Centres',
          html:
            '<p>These sit inside large hospitals, usually within pediatric endocrinology, and they are where medically defined short stature belongs.</p>' +
            '<p>If a diagnosable condition is suspected — a hormone deficiency, a chromosomal condition, something systemic — this is the setting with the specialists and the diagnostic depth to establish it, and where nationally covered treatment is administered.</p>' +
            '<p>The trade-off is practical rather than clinical. Appointments are scheduled far apart, visits are short, and the child may not see the same doctor twice. For a condition that needs establishing, that is fine. For year-by-year management, it is harder.</p>',
          imagePrompt: IMG + 'A large hospital building outline with a small pediatric department badge, drawn plainly.',
          imageUrl: '',
        },
        {
          heading: 'Private Growth Clinics',
          html:
            '<p>These focus specifically on children’s growth, and their strength is continuity — the same doctor following the same child across years, with visits close enough together that a stalled plan is visible in months rather than at the next annual review.</p>' +
            '<p>That matters because growth is measured in centimetres per year. Frequency is not a convenience; it is what makes a change detectable while there is still time to act on it.</p>' +
            '<p>Scope is the other difference. A dedicated growth practice tends to look past growth hormone alone — at puberty timing, sleep, inflammation, absorption, posture — because those are what limit many children who have no diagnosable deficiency at all.</p>' +
            '<p><strong>187 Growth Clinic, at Yonsei Saebom Medical Clinic in Gangnam, Seoul, is this kind of practice.</strong> Bone age and blood work come first, and the plan follows the results.</p>',
          imagePrompt: IMG + 'A repeating timeline of small clinic visits with a growth line rising alongside it.',
          imageUrl: '',
        },
        {
          heading: 'Traditional Korean Medicine (Hanbang) Clinics',
          html:
            '<p>Korean medicine clinics also treat children’s growth, typically with herbal formulas, acupuncture and posture or spinal work.</p>' +
            '<p>Families sometimes use these alongside medical treatment rather than instead of it. If you do, it is worth telling both sides — herbal preparations are not inert, and anyone prescribing should know what else a child is taking.</p>' +
            '<p>What applies here applies anywhere: ask what will be measured, how often, and what result would change the plan.</p>',
          imagePrompt: IMG + 'A simple mortar and pestle beside a small posture silhouette, understated.',
          imageUrl: '',
        },
        {
          heading: 'Which One Fits',
          html:
            '<p>A rough guide rather than a rule.</p>' +
            '<p><strong>A diagnosable condition is suspected</strong> — very slow growth, a striking drop across percentiles, other symptoms alongside. A hospital growth centre has the depth to establish it, and coverage follows a diagnosis.</p>' +
            '<p><strong>The child is growing slowly with nothing obviously wrong</strong> — the more common case. What is needed is a plan and someone watching it change, which is what a dedicated growth practice is built for.</p>' +
            '<p><strong>You live outside Korea</strong> — continuity matters more, not less. Ask which steps can happen locally, whether documentation is issued in English for testing at home, and how follow-up works between visits.</p>',
          imagePrompt: IMG + 'A three-way signpost on a plain background, each arm a different simple icon.',
          imageUrl: '',
        },
        {
          heading: 'What Is the Same Everywhere',
          html:
            '<p>Whatever the setting, the first appointment should produce the same two things: a <strong>bone age</strong> from a wrist X-ray, and a <strong>growth history</strong> showing how much the child grew over the last year.</p>' +
            '<p>Without those, any recommendation is being made without the two numbers that decide everything. With them, the conversation becomes specific to one child.</p>' +
            '<p>And the honest outcome is sometimes that there is time and nothing to start yet. A clinic that never reaches that conclusion with anyone is worth a second look.</p>' +
            '<p>Growth depends on the individual child, and this article is general information rather than a diagnosis.</p>',
          imagePrompt: IMG + 'Two items side by side on a plain surface: a hand X-ray and a simple growth chart.',
          imageUrl: '',
        },
      ],
      faq: [
        {
          q: 'Is there any treatment for height growth?',
          a: 'Yes, though what is appropriate depends on what is limiting a particular child. Hormone treatment is one option where results support it; puberty timing, sleep, inflammation and absorption account for many children who have no diagnosable deficiency.',
        },
        {
          q: 'University hospital or private clinic?',
          a: 'A hospital growth centre has the diagnostic depth for a suspected medical condition, and covered treatment follows a diagnosis. A dedicated growth practice offers continuity — the same doctor across years, with visits frequent enough to catch a plan that is not working.',
        },
        {
          q: 'What should the first appointment produce?',
          a: 'A bone age from a wrist X-ray and a growth history covering the last twelve months. Any recommendation made without those two is being made without the numbers that decide it.',
        },
      ],
    },
  },
];

const existing = await (await rest('marketing_articles?kind=eq.regular&select=id,title,sort_order&order=sort_order.desc&limit=1')).json();
let next = (existing[0]?.sort_order ?? 905) + 1;

const all = await (await rest('marketing_articles?kind=eq.regular&select=id,title,blog')).json();
const byTitle = Object.fromEntries(all.map((a) => [a.title, a]));

for (const p of POSTS) {
  const found = byTitle[p.title];
  const words = p.en.sections.reduce((n, s) => n + s.html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length, 0);
  if (DRY) {
    console.log(`${found ? '갱신' : '신규 #' + next} — ${p.en.seoTitle} (${p.en.sections.length}섹션 · ${words}단어)`);
    if (!found) next += 1;
    continue;
  }
  if (found) {
    // 🚨올려 둔 섹션 이미지를 덮어쓰지 않는다(1차 때 18장을 날린 적이 있다).
    const keep = found.blog?.en?.sections ?? [];
    const en = { ...p.en, sections: p.en.sections.map((s, i) => ({ ...s, imageUrl: s.imageUrl || keep[i]?.imageUrl || '' })) };
    await rest(`marketing_articles?id=eq.${found.id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ category: p.category, keywords: p.keywords, blog: { en } }),
    });
    console.log(`갱신 — ${p.en.seoTitle} (이미지 ${en.sections.filter((s) => s.imageUrl).length}/${en.sections.length} 유지)`);
  } else {
    await rest('marketing_articles', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ title: p.title, kind: 'regular', body: '', category: p.category, keywords: p.keywords, sort_order: next, blog: { en: p.en } }),
    });
    console.log(`신규 #${next} — ${p.en.seoTitle} (${words}단어)`);
    next += 1;
  }
}
console.log('\n발행 X — 검수 → 섹션 이미지 18장 → node scripts/publish-en-clinic-posts.mjs 906-908');
