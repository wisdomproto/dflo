// 재배포 커스텀 릴스(ko+th)를 IG/FB 발행 큐에 분산 예약.
// 영상당 4건: ko→ko/IG·ko/FB(한국 계정), th→th/IG·th/FB(태국 계정). 하루 PER_DAY 영상, 점심/저녁 슬롯.
// 멱등: (article_id, channel, language) 이미 큐에 있으면 skip.
// 사용: node scripts/schedule-repurpose-publish.mjs [--dry]
import { rest, assertEnv } from "./lib/reelDb.mjs";

const DRY = process.argv.includes("--dry");
const PER_DAY = 2;
const koSlots = ["03:00", "10:00"]; // UTC → KST 12:00, 19:00 (점심/저녁)
const thSlots = ["05:00", "12:00"]; // UTC → ICT 12:00, 19:00 (점심/저녁)
const cleanTitle = (t) => (t || "").replace(/^▶️?\s*\[#?187성장클리닉\]\s*/, "").trim();

assertEnv();

const ch = await (await rest(`marketing_channels?select=id,platform,locale&is_active=eq.true`)).json();
const chMap = {};
for (const c of ch) chMap[`${c.locale}/${c.platform}`] = c.id;
for (const k of ["ko/instagram", "ko/facebook", "th/instagram", "th/facebook"])
  if (!chMap[k]) { console.error("채널 없음:", k); process.exit(1); }

const arts = (await (await rest(`marketing_articles?kind=eq.custom&select=id,title,sort_order,reels&order=sort_order`)).json())
  .filter((a) => a.reels?.ko?.videoUrl && a.reels?.th?.videoUrl);
console.log(`대상 영상 ${arts.length}개 (ko+th reels 보유)`);

const existing = await (await rest(`marketing_publish_queue?content_kind=eq.reels&select=article_id,channel,language`)).json();
const has = new Set(existing.map((q) => `${q.article_id}/${q.channel}/${q.language}`));
console.log(`기존 reels 큐 ${existing.length}건 (중복 skip)`);

const nowIso = new Date().toISOString();
const start = new Date(); start.setUTCDate(start.getUTCDate() + 1); start.setUTCHours(0, 0, 0, 0); // 내일 00:00 UTC

const rows = [];
arts.forEach((a, i) => {
  const day = Math.floor(i / PER_DAY), slot = i % PER_DAY;
  const base = new Date(start); base.setUTCDate(base.getUTCDate() + day);
  const at = (hhmm) => { const [h, m] = hhmm.split(":"); const d = new Date(base); d.setUTCHours(+h, +m, 0, 0); return d.toISOString(); };
  const koAt = at(koSlots[slot]), thAt = at(thSlots[slot]);
  const add = (channel, locale, language, scheduled_at) => {
    if (has.has(`${a.id}/${channel}/${language}`)) return;
    rows.push({ article_id: a.id, channel, channel_id: chMap[`${locale}/${channel}`], language, content_kind: "reels", status: "scheduled", scheduled_at, updated_at: nowIso });
  };
  add("instagram", "ko", "ko", koAt);
  add("facebook", "ko", "ko", koAt);
  add("instagram", "th", "th", thAt);
  add("facebook", "th", "th", thAt);
});

const days = Math.ceil(arts.length / PER_DAY);
const endDay = new Date(start.getTime() + (days - 1) * 86400000).toISOString().slice(0, 10);
console.log(`예약 ${rows.length} rows = 영상 ${arts.length} × 4채널 (중복 제외 후)`);
console.log(`기간: ${start.toISOString().slice(0, 10)} ~ ${endDay} (${days}일, 하루 ${PER_DAY}영상)`);

if (DRY) {
  arts.slice(0, 6).forEach((a, i) => {
    const day = Math.floor(i / PER_DAY), slot = i % PER_DAY;
    const base = new Date(start); base.setUTCDate(base.getUTCDate() + day);
    console.log(`  #${a.sort_order} ${cleanTitle(a.title).slice(0, 28)} → ${base.toISOString().slice(0, 10)} | ko ${koSlots[slot]}UTC(KST${slot ? "19" : "12"}시) th ${thSlots[slot]}UTC(ICT${slot ? "19" : "12"}시)`);
  });
  console.log("\n--dry: insert 안 함.");
  process.exit(0);
}

for (let i = 0; i < rows.length; i += 50)
  await rest(`marketing_publish_queue`, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows.slice(i, i + 50)) });
console.log(`\nDONE: ${rows.length} 예약(scheduled) insert 완료`);
