// 영어(en) 커스텀 릴스를 IG/FB 발행 큐에 예약. ko/th 용 schedule-repurpose-publish.mjs 의 en 판.
// ko/th 와 다른 점:
//   - 하루 1영상(PER_DAY=1) · 슬롯 1개(동남아 저녁 19시 = UTC 12:00). ko/th 는 하루 2영상.
//   - 계정이 신규(팔로워 0·게시물 0)라 첫 SEED_NOW 개는 "지금" 발행해 그리드를 채운다.
//     ★ scheduler 의 selectDue 는 due 된 걸 한 틱에 전부 집어가므로, 동시에 due 로 두면
//       10영상×2채널=20건이 한꺼번에 나가 Meta 레이트리밋에 걸린다 → SEED_GAP_MIN 간격으로 흩는다.
// 영상당 2건: en→en/IG·en/FB (영어 계정 1쌍).
// 멱등: (article_id, channel, language) 이미 큐에 있으면 skip.
// 사용: node scripts/schedule-repurpose-publish-en.mjs [--dry]
import { rest, assertEnv } from "./lib/reelDb.mjs";

const DRY = process.argv.includes("--dry");
const SEED_NOW = 10;        // 지금 바로 올릴 개수(신규 계정 그리드 시딩)
const SEED_GAP_MIN = 4;     // 시드 발행 간격(분) — 레이트리밋·스팸 인상 회피
const PER_DAY = 1;          // 시드 이후 하루 발행 영상 수
const DAILY_SLOT_UTC = "12:00";  // ICT 19:00(방콕 저녁) = UTC 12:00
const cleanTitle = (t) => (t || "").replace(/^▶️?\s*\[#?187성장클리닉\]\s*/, "").trim();

assertEnv();

const ch = await (await rest(`marketing_channels?select=id,platform,locale&is_active=eq.true`)).json();
const chMap = {};
for (const c of ch) chMap[`${c.locale}/${c.platform}`] = c.id;
for (const k of ["en/instagram", "en/facebook"])
  if (!chMap[k]) { console.error("채널 없음:", k); process.exit(1); }

// 한국 연예인·K-pop 의존 클립(캡션에 인물/그룹이 등장) — 화교 부모는 그 인물을 몰라 후킹이 안 되고,
// 새 계정의 첫인상이 "한국 국내 계정"으로 굳는다(CLAUDE.md 글로벌 선별 필터). 버리진 않고 뒤로 민다.
// ★캡션만 보면 놓친다 — 영상엔 한국 인물이 나오는데 영어 캡션엔 이름이 없는 경우가 있어(예: #1014 고경표
//   "Straighten bowlegs…") 한국어 원제목도 함께 본다. 히틀러(#1012)는 의학 내용이라도 소아 건강 브랜드
//   첫인상으로 부적절해 같은 그룹(뒤로)에 넣는다.
const CELEB_RE = /girl group|boy idols|male stars|male singers|male actors|actresses|Haaland|Sinyu|Kim Yeon-koung|Kim Tae-ri|Lee Byung-hun|Jung Si-a|Wonyoung|Yujin|egen-man|1cm of height is worth/i;
const CELEB_KO_RE = /방가네|고경표|신유|김연경|김태리|이병헌|정시아|원영|유진|히틀러|홀란드|여돌|아이돌|걸그룹|연예인|배우|가수|kpop/i;
const isCeleb = (a) => CELEB_RE.test(a.reels?.en?.caption || "") || CELEB_KO_RE.test(a.title || "");

const all = (await (await rest(`marketing_articles?kind=eq.custom&select=id,title,sort_order,reels&order=sort_order`)).json())
  .filter((a) => a.reels?.en?.videoUrl);
// 의학·교육 먼저 → 연예인 뒤 (각 그룹 안에서는 기존 sort_order 유지)
const arts = [...all.filter((a) => !isCeleb(a)), ...all.filter(isCeleb)];
console.log(`대상 영상 ${arts.length}개 (en reels 보유) = 의학·교육 ${all.filter((a) => !isCeleb(a)).length} + 연예인 ${all.filter(isCeleb).length}`);

const existing = await (await rest(`marketing_publish_queue?content_kind=eq.reels&language=eq.en&select=article_id,channel,language`)).json();
const has = new Set(existing.map((q) => `${q.article_id}/${q.channel}/${q.language}`));
console.log(`기존 en reels 큐 ${existing.length}건 (중복 skip)`);

const nowIso = new Date().toISOString();
const now = Date.now();
// 시드 이후 일일 발행 시작 = 내일 DAILY_SLOT_UTC
const [dh, dm] = DAILY_SLOT_UTC.split(":").map(Number);
const dailyStart = new Date(); dailyStart.setUTCDate(dailyStart.getUTCDate() + 1); dailyStart.setUTCHours(dh, dm, 0, 0);

const rows = [];
const plan = [];
arts.forEach((a, i) => {
  let at;
  if (i < SEED_NOW) {
    at = new Date(now + i * SEED_GAP_MIN * 60000).toISOString();   // 지금부터 4분 간격
  } else {
    const day = Math.floor((i - SEED_NOW) / PER_DAY);
    const d = new Date(dailyStart); d.setUTCDate(d.getUTCDate() + day);
    at = d.toISOString();
  }
  const add = (channel) => {
    if (has.has(`${a.id}/${channel}/en`)) return;
    rows.push({ article_id: a.id, channel, channel_id: chMap[`en/${channel}`], language: "en",
                content_kind: "reels", status: "scheduled", scheduled_at: at, updated_at: nowIso });
  };
  add("instagram");
  add("facebook");
  plan.push({ no: a.sort_order, title: cleanTitle(a.title).slice(0, 30), at, seed: i < SEED_NOW });
});

const seeded = plan.filter((p) => p.seed).length;
const lastDaily = plan.filter((p) => !p.seed).slice(-1)[0];
console.log(`\n예약 ${rows.length} rows = 영상 ${arts.length} × 2채널(IG·FB), 중복 제외 후`);
console.log(`  시드(지금): ${seeded}영상 · ${SEED_GAP_MIN}분 간격`);
console.log(`  일일: ${plan.length - seeded}영상 · 하루 ${PER_DAY}개 · 매일 ${DAILY_SLOT_UTC} UTC(ICT 19시)`);
if (lastDaily) console.log(`  종료일: ${lastDaily.at.slice(0, 10)}`);

if (DRY) {
  console.log("\n--- 앞 14개 ---");
  for (const p of plan.slice(0, 14))
    console.log(`  #${p.no} ${p.title.padEnd(32)} ${p.seed ? "[시드]" : "[일일]"} ${p.at.slice(0, 16).replace("T", " ")} UTC`);
  console.log("\n--dry: insert 안 함.");
  process.exit(0);
}

for (let i = 0; i < rows.length; i += 50)
  await rest(`marketing_publish_queue`, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows.slice(i, i + 50)) });
console.log(`\nDONE: ${rows.length} 예약(scheduled) insert 완료`);
