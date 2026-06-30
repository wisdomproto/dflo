// 태국(th) 카드뉴스 전체를 IG+FB 발행 큐에 예약. 하루 PER_DAY개, 오전 10시 ICT(릴스 점심/저녁과 미충돌).
// th 발행가능 = 전 슬라이드 canvas.images.th + captions.th 보유. 기사 sort_order 순.
// 멱등: (article_id, channel, language=th, cardnews) 이미 큐에 있으면 skip.
//   node scripts/schedule-cardnews-th.mjs [--dry]
import { rest, assertEnv } from "./lib/reelDb.mjs";

const DRY = process.argv.includes("--dry");
const PER_DAY = 1;
const slots = ["03:00"]; // UTC → ICT 10:00
assertEnv();

const ch = await (await rest(`marketing_channels?select=id,platform,locale&is_active=eq.true`)).json();
const chMap = {}; for (const c of ch) chMap[`${c.locale}/${c.platform}`] = c.id;
for (const k of ["th/instagram", "th/facebook"]) if (!chMap[k]) { console.error("채널 없음:", k); process.exit(1); }

const cns = await (await rest(`marketing_cardnews?select=id,content_id,captions`)).json();
const slides = await (await rest(`marketing_cardnews_slides?select=cardnews_id,canvas`)).json();
const arts = await (await rest(`marketing_articles?select=id,title,sort_order`)).json();
const artOf = (id) => arts.find((a) => a.id === id) || {};
const byCn = {}; for (const s of slides) (byCn[s.cardnews_id] = byCn[s.cardnews_id] || []).push(s);

const ready = cns.map((cn) => {
  const sl = byCn[cn.id] || [];
  const thImgs = sl.filter((s) => s.canvas?.images?.th).length;
  const ok = sl.length > 0 && thImgs === sl.length && !!cn.captions?.th;
  return { cn, art: artOf(cn.content_id), ok };
}).filter((x) => x.ok && x.art.id)
  .sort((a, b) => (a.art.sort_order || 9999) - (b.art.sort_order || 9999));
console.log(`태국 발행가능 카드뉴스 ${ready.length}개`);

const existing = await (await rest(`marketing_publish_queue?content_kind=eq.cardnews&select=article_id,channel,language`)).json();
const has = new Set(existing.map((q) => `${q.article_id}/${q.channel}/${q.language}`));
console.log(`기존 cardnews 큐 ${existing.length}건 (중복 skip)`);

const nowIso = new Date().toISOString();
const start = new Date(); start.setUTCDate(start.getUTCDate() + 1); start.setUTCHours(0, 0, 0, 0); // 내일 00:00 UTC

// 이미 IG·FB 둘 다 큐에 있는 카드뉴스는 day 소비 없이 제외 → 나머지만 내일부터 연속 채움
const toSchedule = ready.filter((x) => !(has.has(`${x.art.id}/instagram/th`) && has.has(`${x.art.id}/facebook/th`)));
console.log(`이미 IG+FB 예약됨 ${ready.length - toSchedule.length}개 제외 → 신규 ${toSchedule.length}개 예약`);

const rows = [];
toSchedule.forEach((x, i) => {
  const day = Math.floor(i / PER_DAY), slot = i % PER_DAY;
  const base = new Date(start); base.setUTCDate(base.getUTCDate() + day);
  const [h, m] = slots[slot].split(":"); base.setUTCHours(+h, +m, 0, 0);
  const at = base.toISOString();
  const add = (channel) => {
    if (has.has(`${x.art.id}/${channel}/th`)) return;
    rows.push({ article_id: x.art.id, channel, channel_id: chMap[`th/${channel}`], language: "th", content_kind: "cardnews", status: "scheduled", scheduled_at: at, updated_at: nowIso });
  };
  add("instagram"); add("facebook");
});

const days = Math.ceil(toSchedule.length / PER_DAY);
const endDay = new Date(start.getTime() + (days - 1) * 86400000).toISOString().slice(0, 10);
console.log(`예약 ${rows.length} rows = 카드뉴스 ${ready.length} × IG·FB (중복 제외 후)`);
console.log(`기간: ${start.toISOString().slice(0, 10)} ~ ${endDay} (${days}일, 하루 ${PER_DAY}개, 10:00 ICT)`);

if (DRY) {
  toSchedule.slice(0, 8).forEach((x) => console.log(`  #${x.art.sort_order} ${(x.art.title || "").slice(0, 34)}`));
  if (toSchedule.length > 8) console.log(`  … 외 ${toSchedule.length - 8}개`);
  console.log("\n--dry: insert 안 함.");
  process.exit(0);
}

for (let i = 0; i < rows.length; i += 50)
  await rest(`marketing_publish_queue`, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows.slice(i, i + 50)) });
console.log(`\nDONE: ${rows.length} 예약(scheduled) insert 완료`);
