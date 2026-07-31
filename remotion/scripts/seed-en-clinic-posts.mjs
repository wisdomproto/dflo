// 영어 블로그 3편을 마케팅 정규 콘텐츠로 넣는다(발행 X — 검수·이미지 작업 후 사용자가 발행).
//   node scripts/seed-en-clinic-posts.mjs [--dry]
//
// 왜 이 3편인가 — 구글 AI 개요가 「height growth clinic in korea」에 답할 때 인용하는 건
// 「그 주제를 실제로 설명하는 문서」다. 우리 블로그 567편은 정보성 질문(뼈나이란 무엇인가)에
// 답하고 있어서 노출은 만들지만 그 질의에는 답하지 않는다. 지금 그 자리를 2012년 리뷰 블로그가
// 채우고 있다(Kiness·Hamsoa·Seojung 를 아직 AI 에게 먹여 준다).
// → 비어 있는 주제 = 「한국에서 성장 치료를 받는다는 것」 자체. 원고는 리플렛 v2 05·07~09·11 장에
//    이미 있다(직원이 매번 채팅으로 설명하던 내용). 새로 조사할 것 없이 옮겨 쓴다.
//
// 의료광고 안전: 효과 보장·단정 금지, 비용 미기재(사용자 방침), 「전문의」 표기 금지,
// 타 병원 비교 금지(의료법 56조). 3편 모두 「무엇을 확인하라」 톤으로 쓴다.
import { rest } from './lib/reelDb.mjs';

const DRY = process.argv.includes('--dry');
const IMG = 'Flat 2D vector illustration, 16:9, pastel tones with mint accent, no text in image. ';

const POSTS = [
  {
    title: '[EN] 해외에서 한국 성장클리닉 시작하기 — 전 과정',
    category: '성장과학',
    keywords: ['growth clinic korea', 'korean growth clinic', 'height growth clinic', 'child growth treatment korea', 'growth clinic seoul'],
    en: {
      seoTitle: 'Growth Clinic in Korea: How Treatment Works From Abroad',
      slug: 'growth-clinic-korea-from-abroad',
      h1: 'Starting at a Korean Growth Clinic When You Live Abroad',
      metaDescription:
        'What actually happens when a family outside Korea starts growth treatment at a Seoul clinic — the English medical letter, a local X-ray, a video consultation, and a single in-person day.',
      primaryKeyword: 'growth clinic korea',
      secondaryKeywords: ['korean growth clinic', 'height growth clinic korea', 'child growth treatment in korea', 'bone age test korea'],
      sections: [
        {
          heading: 'The Question Behind “Is There a Growth Clinic in Korea?”',
          html:
            '<p>Parents who search for a <strong>growth clinic in Korea</strong> are rarely asking whether one exists. They are asking something more practical: can we actually do this from where we live, and how much of it requires being in Seoul?</p>' +
            '<p>Families have written to us from Australia, Singapore, Malaysia, the United Kingdom and Indonesia. The questions arrive in almost the same order every time — can we start without flying over, how many days does the visit take, and can tests done at our local hospital be used.</p>' +
            '<p>This article answers those in sequence, because the sequence is the answer. Most of the first stage happens where you already live.</p>' +
            '<p>One thing worth saying at the start: a growth clinic is not something you commit to before you know anything. The first stage exists to produce two pieces of information — your child’s bone age and their growth velocity — and those two decide whether there is anything to act on at all. Some families finish that stage and learn there is plenty of time. That is a useful answer, and it costs a local X-ray to get.</p>',
          imagePrompt: IMG + 'A world map with soft dotted lines converging from Southeast Asia, Australia and Europe toward a single point on the Korean peninsula. Simple, calm, no labels.',
          imageUrl: '',
        },
        {
          heading: 'Stage One — What Happens Before Anyone Books a Flight',
          html:
            '<p>Four things happen before travel, and none of them require it.</p>' +
            '<p><strong>1. You tell us three numbers.</strong> Your child’s age, current height, and how much they grew over the last twelve months. Growth velocity — that third number — often says more than the first two.</p>' +
            '<p><strong>2. We send an English medical letter.</strong> It lists exactly which tests to request, written for a doctor at your local hospital to read and act on.</p>' +
            '<p><strong>3. You have a wrist X-ray taken locally.</strong> A hand-and-wrist radiograph is a routine study almost anywhere. You send us the image. Nobody flies for this step.</p>' +
            '<p><strong>4. A video consultation.</strong> The director reads the bone age against your child’s growth curve and explains what the two together mean. Whether an in-person visit is worth making is decided here, not before.</p>' +
            '<p>The reason the letter matters more than it sounds: a parent asking a local hospital for “a growth test” often gets something other than what is needed. A document written doctor-to-doctor, naming the study and the conditions, removes that translation problem. It is also the step families most often tell us they did not know was possible.</p>' +
            '<p>Nothing in this stage is irreversible. You end it with information and a conversation, not a treatment.</p>',
          imagePrompt: IMG + 'Four numbered circles in a horizontal row connected by a thin line: a chat bubble, a document, a hand X-ray, and a laptop with a video call. Minimal line icons.',
          imageUrl: '',
        },
        {
          heading: 'Why Bone Age Comes First, Not Calendar Age',
          html:
            '<p>Two children who are eleven and exactly the same height can finish years apart. Calendar age says how long they have been alive; <strong>bone age</strong> says how much growth plate is left.</p>' +
            '<p>A wrist X-ray shows the growth plates directly. If they are closing earlier than the birthday suggests, the window for doing anything is shorter than the family assumes — and that is worth knowing before deciding whether to travel at all.</p>' +
            '<p>It also decides who does <em>not</em> need to come. Some children turn out to have plenty of time and no signal worth acting on. Finding that out from home is a reasonable outcome.</p>' +
            '<p>There is a second reason bone age leads. When puberty arrives early the growth plates begin closing early, and the predicted adult height falls accordingly. Slowing that progression is one of the few things that changes the arithmetic rather than adding to it — but only while the plates remain open. The X-ray is what tells you where in that window a child actually is.</p>' +
            '<p>Growth velocity does the other half of the work. A child at the fortieth percentile who is growing steadily is in a different situation from one at the same percentile who grew two centimetres last year, even though the two look identical on a single measurement.</p>',
          imagePrompt: IMG + 'Two identical child silhouettes standing at the same height, with two different growth-plate gauges above them — one nearly full, one nearly closed. No numbers.',
          imageUrl: '',
        },
        {
          heading: 'Stage Two — The In-Person Day',
          html:
            '<p>When a visit is warranted, it is built to fit in one day rather than spread across a week. Everything happens in the same building, in order.</p>' +
            '<ul>' +
            '<li>Wrist X-ray and bone age</li>' +
            '<li>Blood work, including hormone levels</li>' +
            '<li>Body measurement and composition</li>' +
            '<li>Consultation with the director and the treatment plan</li>' +
            '<li>Prescription, medication, and instruction on how to give it</li>' +
            '</ul>' +
            '<p>If you sent a local X-ray beforehand, the consultation is shorter, because the discussion starts from results rather than from taking them.</p>' +
            '<p>Families visiting Seoul are usually doing several things on the same trip. One day is a deliberate constraint, not a coincidence.</p>' +
            '<p>Blood work covers more than growth hormone. Liver and kidney function, thyroid and blood glucose are checked before anything is prescribed, because those results decide whether a given approach suits this child — and they give a baseline to compare against later.</p>' +
            '<p>The consultation is where the plan gets narrowed. By that point there is a bone age, a set of hormone levels, a body composition reading and a growth history, and the question stops being “what do you do for short children” and becomes “which axis is limiting this one”.</p>',
          imagePrompt: IMG + 'A vertical building cutaway with five floors, each showing a simple icon in sequence: X-ray, blood vial, measuring ruler, consultation desk, medicine box.',
          imageUrl: '',
        },
        {
          heading: 'Stage Three — After You Fly Home',
          html:
            '<p>Treatment does not end at the airport, and it does not require living in Korea.</p>' +
            '<p><strong>You leave with six months of medication.</strong> What is needed after that is posted to your address.</p>' +
            '<p><strong>Monthly video consultations</strong> track height and general condition, and adjust the plan when something changes.</p>' +
            '<p><strong>Every six to twelve months</strong> there is a review. That can be another visit to Seoul, or a local X-ray and blood test sent to us — whichever is practical that year.</p>' +
            '<p>In practice many families come once per school holiday and stay connected by video in between.</p>' +
            '<p>The monthly rhythm matters more than it appears. Growth is measured in centimetres per year, which means a plan that is not working takes months to show up in the numbers. Checking monthly is how a stalled axis gets found in the same season rather than the following one.</p>' +
            '<p>What gets reviewed at six to twelve months is whether the bone age gap has moved. That is the number telling you whether the window is being preserved, and it is why a repeat X-ray is worth taking even when the child is clearly growing.</p>',
          imagePrompt: IMG + 'A twelve-month circular timeline with four markers around it: a medicine box, a mailed parcel, a video call, and a small X-ray. Calm and even.',
          imageUrl: '',
        },
        {
          heading: 'When It Is Worth Asking at All',
          html:
            '<p>Three signals are worth a check rather than a wait.</p>' +
            '<p><strong>Under 4cm in a year.</strong> Growth velocity below roughly four centimetres over twelve months.</p>' +
            '<p><strong>Around 10cm below peers.</strong> Noticeably shorter than the average for the same age.</p>' +
            '<p><strong>Early puberty.</strong> Secondary sexual characteristics appearing earlier than classmates, which can mean bone age is running ahead.</p>' +
            '<p>What all three share is that the adjustable period lasts only until the growth plates close. Whether any of them applies to your child is decided by testing, not by looking.</p>' +
            '<p>Growth depends on the individual child, and this article is general information rather than a diagnosis.</p>',
          imagePrompt: IMG + 'Three simple cards side by side: a downward growth arrow, two children of different heights compared, and a clock with an early alarm. Clean and non-alarming.',
          imageUrl: '',
        },
      ],
      faq: [
        {
          q: 'Can we really start without traveling to Korea?',
          a: 'Yes — the enquiry, the English medical letter, the local wrist X-ray and the video consultation all happen where you live. Whether an in-person visit is worthwhile is decided during that consultation, using your child’s actual bone age and growth curve.',
        },
        {
          q: 'Can we use an X-ray taken at our local hospital?',
          a: 'Yes. The English medical letter we send specifies which study to request and under what conditions, so a local hospital can take it and you can send us the image.',
        },
        {
          q: 'How many days does the visit to Korea take?',
          a: 'It is planned as a single day. The X-ray, blood work, measurements, consultation and prescription happen in the same building in sequence. Sending a local X-ray beforehand shortens the consultation further.',
        },
      ],
    },
  },

  {
    title: '[EN] 성장호르몬이 유일한 방법인가 — 키를 정하는 다섯 가지',
    category: '성장과학',
    keywords: ['is growth hormone the only option', 'does growth hormone work for short children', 'growth hormone for height', 'what affects child height', 'why is my child not growing'],
    en: {
      seoTitle: 'Is Growth Hormone the Only Way to Help a Child Grow Taller?',
      slug: 'is-growth-hormone-the-only-option-child-height',
      h1: 'Is Growth Hormone the Only Option? What Else Affects a Child’s Height',
      metaDescription:
        'Growth hormone is what most parents ask about first. It is one of five things that decide how a child grows — alongside puberty timing, sleep, inflammation and absorption. What to check before deciding.',
      primaryKeyword: 'is growth hormone the only option',
      secondaryKeywords: ['does growth hormone work for short children', 'growth hormone for height', 'what affects child height', 'sleep and growth hormone', 'why is my child not growing'],
      sections: [
        {
          heading: 'The Question Most Parents Start With',
          html:
            '<p>Most parents who look into their child’s height arrive at the same question first: <strong>is growth hormone the only option</strong>, and does it work?</p>' +
            '<p>It is a fair question, and the short answer is that growth hormone is one of the things that decides how a child grows, not the only one. Whether it is right for a particular child depends on what is actually limiting that child — and that is knowable before deciding.</p>' +
            '<p>Children stop growing for different reasons. One child sleeps four hours because of a blocked nose. Another eats well and absorbs badly. A third is entering puberty early, and every month of delay costs more than any single treatment would add.</p>' +
            '<p>Prescribing the same thing to all three treats the one factor they may not share.</p>' +
            '<p>This is not an argument against hormone treatment — for some children it is exactly right. It is an argument for finding out first. The same prescription can be the answer for one child and beside the point for another, and the difference shows up in test results rather than in height.</p>' +
            '<p>The rest of this article covers the five things worth checking, starting with the hormones themselves.</p>',
          imagePrompt: IMG + 'A single lever on the left versus five smaller dials arranged in a circle on the right, with a thin divider between them.',
          imageUrl: '',
        },
        {
          heading: 'Axis One — Hormones, Plural',
          html:
            '<p>Growth hormone is the one people know. It is not the only one that matters.</p>' +
            '<p><strong>Sex hormones</strong> determine when the growth plates begin to close. If puberty runs early, the remaining window shrinks regardless of anything else.</p>' +
            '<p><strong>Thyroid hormone</strong> sets the pace of growth generally. A quiet thyroid problem can look exactly like “just a small child”.</p>' +
            '<p>Which of these is actually out of range is a blood test question, and it is worth asking before deciding what to treat.</p>' +
            '<p>Sex hormones deserve particular attention because they set the deadline. Everything else adjusts how fast a child grows; this one adjusts how long they have left to do it. A child growing normally but entering puberty two years early can end up shorter than a slower-growing child with the full window intact.</p>',
          imagePrompt: IMG + 'Three labeled hormone symbols as simple abstract shapes orbiting a child silhouette, each a different pastel tone.',
          imageUrl: '',
        },
        {
          heading: 'Axis Two — Inflammation That Never Announces Itself',
          html:
            '<p>Chronic allergy and gut inflammation rarely present as illness. They present as a child who is tired, eats unevenly, and does not grow as expected.</p>' +
            '<p>The mechanism is indirect and that is why it gets missed. A blocked nose fragments sleep; fragmented sleep means less of the deep sleep during which growth hormone is released; less release means slower growth. The allergy is never the visible problem.</p>' +
            '<p>Which is why we check it rather than assume it away.</p>' +
            '<p>The same indirect pattern shows up with gut inflammation. Food that is eaten but poorly absorbed produces a child who appears well fed and grows slowly, and no amount of adding more food fixes an absorption problem.</p>',
          imagePrompt: IMG + 'A chain of three linked circles: a nose with soft airflow lines, a crescent moon, and a small upward growth arrow — showing indirect cause and effect.',
          imageUrl: '',
        },
        {
          heading: 'Axis Three — Sleep, Where the Hormone Actually Arrives',
          html:
            '<p>Growth hormone is released mostly during deep sleep. The often-repeated “be asleep by ten” is a proxy for something more specific — that the deep stages of sleep are reached and not interrupted.</p>' +
            '<p>A child in bed at nine who wakes four times has less usable sleep than one asleep at half past ten and undisturbed. Bedtime is easier to measure than sleep quality, which is why it gets quoted instead.</p>' +
            '<p>Screens, late study, a blocked nose and an overfull stomach all interfere in different ways, and they are worth separating rather than treating as one habit.</p>' +
            '<p>Which of them applies is usually answerable by asking the child rather than testing them. It is also the axis families can move fastest, which is why it is worth examining before anything more invasive is considered.</p>',
          imagePrompt: IMG + 'A sleep-stage curve dipping into a shaded deep-sleep band, with small hormone dots rising from the deepest part of the curve.',
          imageUrl: '',
        },
        {
          heading: 'Axes Four and Five — Absorption, and What the Body Does With It',
          html:
            '<p><strong>Nutrition and appetite.</strong> The question is not only what a child eats but what actually gets absorbed. A child with poor appetite and a child with poor absorption need different help, and they look the same from across the dinner table.</p>' +
            '<p><strong>Movement and posture.</strong> Weight-bearing activity stimulates the growth plates. Separately, posture affects standing height directly — a rounded upper back and forward head cost centimetres that were already grown.</p>' +
            '<p>Neither replaces medical treatment. Both are adjustable, which is the point: the family can act on them, every day, in a way they cannot act on genetics.</p>',
          imagePrompt: IMG + 'Left: a plate with a small absorption arrow going into a body outline. Right: two side-view postures, one slouched and one upright, with a subtle height difference line.',
          imageUrl: '',
        },
        {
          heading: 'What Cannot Be Changed, and What Can',
          html:
            '<p>The framing we use comes from the director’s own book: genetics is the blueprint you cannot change, while nutrition, sleep, movement and stress are the materials you build with — and each one of those is adjustable.</p>' +
            '<p>In practice that means the first visit is spent finding which axis is actually blocked for this child, and then adjusting only that. Bone age and blood work come before any plan.</p>' +
            '<p>Treatment and its method are decided from test results and examination. The same approach is not applied to every child, and results differ between children.</p>',
          imagePrompt: IMG + 'A simple two-column layout: one column labeled with a locked padlock icon, the other with four small adjustable slider icons.',
          imageUrl: '',
        },
      ],
      faq: [
        {
          q: 'Is growth hormone always part of the plan?',
          a: 'No. Whether it is appropriate depends on bone age, hormone levels and examination. For some children the blocked axis is sleep, inflammation or absorption, and that is what gets addressed.',
        },
        {
          q: 'What is checked before treatment starts?',
          a: 'Blood work covering liver and kidney function, thyroid and blood glucose is done first, and repeated at intervals during treatment so that changes are visible rather than assumed.',
        },
        {
          q: 'Are there known side effects?',
          a: 'Reactions at the injection site and temporary headache or swelling have been reported. Most are mild. If something is found, the plan is adjusted or stopped — which is why regular re-testing is part of it.',
        },
      ],
    },
  },

  {
    title: '[EN] 한국 성장클리닉 고르기 — 무엇을 물어야 하나',
    category: '성장과학',
    keywords: ['choosing a growth clinic', 'growth clinic questions', 'what to ask growth clinic', 'growth clinic korea', 'bone age test'],
    en: {
      seoTitle: 'Choosing a Growth Clinic in Korea: 7 Questions Worth Asking',
      slug: 'choosing-growth-clinic-korea-questions',
      h1: 'Seven Questions Worth Asking Any Growth Clinic',
      metaDescription:
        'Before starting child growth treatment in Korea or anywhere else, these seven questions separate a plan built around your child from a plan applied to everyone.',
      primaryKeyword: 'choosing a growth clinic',
      secondaryKeywords: ['what to ask a growth clinic', 'growth clinic korea', 'bone age test', 'child growth consultation'],
      sections: [
        {
          heading: 'Why the Questions Matter More Than the Answers',
          html:
            '<p>Growth treatment runs for years, costs real money and happens during a window that does not reopen. It deserves the same scrutiny as any other long commitment.</p>' +
            '<p>These seven questions are not a test with right answers. They are the questions that reveal whether a clinic is building a plan around your child or fitting your child into a plan it already had.</p>' +
            '<p>They apply anywhere — in Seoul, and equally at home.</p>',
          imagePrompt: IMG + 'A simple clipboard with seven blank checklist lines and a pen resting on it.',
          imageUrl: '',
        },
        {
          heading: '1. What Will You Test Before Recommending Anything?',
          html:
            '<p>The answer should include a wrist X-ray for bone age and blood work. If a treatment is proposed before either exists, the plan was not built from your child.</p>' +
            '<p>Bone age is not a formality. Two children the same age and height can have years of difference in remaining growth, and that difference decides everything that follows.</p>' +
            '<p>Ask also what the blood work covers. Thyroid function and sex hormone levels change what a bone age means; liver and kidney function decide what can safely be prescribed. A clinic measuring only height and weight is not measuring the things that make the decision.</p>',
          imagePrompt: IMG + 'A hand X-ray beside a blood vial and a growth chart, arranged as three equal items before an arrow pointing right.',
          imageUrl: '',
        },
        {
          heading: '2. What Are You Treating, Specifically?',
          html:
            '<p>“Short stature” is a description, not a cause. Ask which factor is thought to be limiting growth in this child — hormones, early puberty, sleep, inflammation, absorption — and what in the results points there.</p>' +
            '<p>A clinic that can name the axis can also tell you what would change if it were addressed, and what would not.</p>' +
            '<p>This question also surfaces the opposite case. If nothing in the results is limiting growth, the honest answer is that there is time and nothing to start yet. A clinic that never gives that answer to anyone is worth a second look.</p>',
          imagePrompt: IMG + 'Five small labeled dials, with one highlighted in mint and the rest muted.',
          imageUrl: '',
        },
        {
          heading: '3. How Often Will You Re-Test, and What Would Make You Stop?',
          html:
            '<p>Any long treatment needs scheduled re-checks and a defined stopping point. Ask what is measured, how often, and what result would cause the plan to change or end.</p>' +
            '<p>“We would adjust if something appeared” is only meaningful if something is being looked at on a schedule.</p>' +
            '<p>For a treatment measured in years, the re-check interval is effectively how quickly a wrong plan can be caught. Ask what the numbers would have to do — bone age advancing faster than expected, velocity not improving, a blood value moving — for the plan to change.</p>',
          imagePrompt: IMG + 'A timeline with repeating checkpoint markers and a clear stop marker at one point.',
          imageUrl: '',
        },
        {
          heading: '4–5. Who Sees the Child, and Can You Do It From Where You Live?',
          html:
            '<p><strong>Who reads the results and who explains them.</strong> Ask whether the same doctor follows the child across visits, and how many years they have spent on children’s growth specifically.</p>' +
            '<p><strong>What is possible remotely.</strong> If you live outside the country, ask which steps can happen locally. A clinic used to overseas families will have an answer already — an English medical letter for local testing, results reviewed by video, and the in-person portion compressed rather than spread out.</p>' +
            '<p>If the answer is that everything requires being there, that is worth knowing before booking anything.</p>' +
            '<p>Continuity is the quieter half of this question. Growth treatment runs across years, and a child seen by a different doctor each visit loses the one thing that makes the record useful — someone who remembers what last year’s X-ray looked like and can say whether this year’s is a change.</p>',
          imagePrompt: IMG + 'A doctor figure on one side and a family on a video screen on the other, connected by a thin dotted line across a subtle globe.',
          imageUrl: '',
        },
        {
          heading: '6–7. What Are the Side Effects, and What Happens If It Does Not Work?',
          html:
            '<p><strong>Side effects, stated plainly.</strong> Injection-site reactions, temporary headache or swelling are reported with hormone treatment. A clinic willing to say so is easier to trust with the rest.</p>' +
            '<p><strong>And if the numbers do not move.</strong> Ask what happens then. The answer should involve re-examining which axis was blocked, not simply increasing what is already being done.</p>' +
            '<p>Growth depends on the individual child. Any clinic promising a specific number of centimetres is describing an outcome nobody can guarantee.</p>' +
            '<p>None of these seven questions has a trick to it. Together they answer one thing — whether the clinic is reasoning from your child’s results, or from a plan it applies to everyone who walks in. That distinction is visible in the first consultation if you ask.</p>',
          imagePrompt: IMG + 'A balance scale with a small warning triangle on one side and a magnifying glass on the other.',
          imageUrl: '',
        },
      ],
      faq: [
        {
          q: 'At what age should we first have a child’s growth checked?',
          a: 'Any point where growth over twelve months is under roughly 4cm, the child is around 10cm below peers, or puberty appears early is worth a check. The adjustable period lasts until the growth plates close, so earlier gives more room.',
        },
        {
          q: 'Is a bone age X-ray safe to repeat?',
          a: 'A hand-and-wrist radiograph is a low-dose study and is normally repeated at intervals of six to twelve months rather than frequently. Ask any clinic how often they intend to repeat it and why.',
        },
        {
          q: 'Can treatment be followed up from another country?',
          a: 'It can, depending on the clinic. Ask specifically about English documentation for local testing, video review of results, and how medication is supplied between visits.',
        },
      ],
    },
  },
];

const existing = await (await rest('marketing_articles?kind=eq.regular&select=id,title,sort_order&order=sort_order.desc&limit=1')).json();
let next = (existing[0]?.sort_order ?? 900) + 1;

const all = await (await rest('marketing_articles?kind=eq.regular&select=id,title')).json();
const byTitle = Object.fromEntries(all.map((a) => [a.title, a.id]));

for (const p of POSTS) {
  const found = byTitle[p.title];
  const body = {
    title: p.title,
    kind: 'regular',
    body: '',
    category: p.category,
    keywords: p.keywords,
    blog: { en: p.en },
  };
  const words = p.en.sections.reduce((n, s) => n + s.html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length, 0);
  if (DRY) {
    console.log(`${found ? '갱신' : '신규 #' + next} — ${p.en.seoTitle} (${p.en.sections.length}섹션 · 본문 ${words}단어 · FAQ ${p.en.faq.length})`);
    if (!found) next += 1;
    continue;
  }
  if (found) {
    await rest(`marketing_articles?id=eq.${found}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ category: p.category, keywords: p.keywords, blog: { en: p.en } }),
    });
    console.log(`갱신 — ${p.en.seoTitle}`);
  } else {
    await rest('marketing_articles', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...body, sort_order: next }),
    });
    console.log(`신규 #${next} — ${p.en.seoTitle} (본문 ${words}단어)`);
    next += 1;
  }
}
console.log('\n발행은 하지 않았다. /marketing/content 에서 검수 → 섹션 이미지 생성 → 발행 큐.');
