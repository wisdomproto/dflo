// 보라 리스타일 후 한글(ko) 재배포 릴스를 IG/FB 발행 큐에 새로 예약.
// - 태국어(th) 큐는 손대지 않음.
// - 기존 ko reels 큐의 미발행분(scheduled/draft/failed)은 삭제 후, 전 ko 릴스(40+신규 v4)를 fresh 예약.
//   (published 행은 이력이라 보존 — 사용자가 IG 기존 게시물은 수동 삭제)
// 영상당 2건: ko/IG(187growupkorea)·ko/FB. 하루 PER_DAY 영상, 점심/저녁 슬롯.
// 사용: node scripts/reschedule-ko-purple.mjs [--dry]
import { rest, assertEnv } from "./lib/reelDb.mjs";

const DRY = process.argv.includes("--dry");
const PER_DAY = 2;
const koSlots = ["03:00", "10:00"]; // UTC → KST 12:00 / 19:00
const cleanTitle = (t) => (t || "").replace(/^▶️?\s*\[#?187성장클리닉\]\s*/, "").trim();

assertEnv();

const ch = await (await rest(`marketing_channels?select=id,platform,locale&is_active=eq.true`)).json();
const chMap = {};
for (const c of ch) chMap[`${c.locale}/${c.platform}`] = c.id;
for (const k of ["ko/instagram", "ko/facebook"]) if (!chMap[k]) { console.error("채널 없음:", k); process.exit(1); }

// 재배포 릴스 + v4 만: sort_order 1002~1041(재배포 40) + 1043(v4). #1042(계산기 광고)·#1001(태국 광고) 제외.
const inScope = (so) => (so >= 1002 && so <= 1041) || so === 1043;
const arts = (await (await rest(`marketing_articles?kind=eq.custom&select=id,title,sort_order,reels&order=sort_order`)).json())
  .filter((a) => a.reels?.ko?.videoUrl && inScope(a.sort_order));
const artIds = new Set(arts.map((a) => a.id));
console.log(`재배포 ko 릴스 ${arts.length}개 (재배포 40 + v4, 계산기/태국 광고 제외)`);

// 기존 ko reels 미발행 큐 — 이 대상 article 들만
const koQueue = await (await rest(`marketing_publish_queue?content_kind=eq.reels&language=eq.ko&select=id,status,article_id`)).json();
const scoped = koQueue.filter((q) => artIds.has(q.article_id));
const toDelete = scoped.filter((q) => ["scheduled", "draft", "failed"].includes(q.status));
const published = scoped.filter((q) => q.status === "published");
console.log(`대상 ko reels 큐: ${scoped.length}건 (미발행 ${toDelete.length} 삭제 예정, published ${published.length} 보존)`);

const nowIso = new Date().toISOString();
const start = new Date(); start.setUTCDate(start.getUTCDate() + 1); start.setUTCHours(0, 0, 0, 0);
const rows = [];
arts.forEach((a, i) => {
  const day = Math.floor(i / PER_DAY), slot = i % PER_DAY;
  const base = new Date(start); base.setUTCDate(base.getUTCDate() + day);
  const [h, m] = koSlots[slot].split(":"); base.setUTCHours(+h, +m, 0, 0);
  const at = base.toISOString();
  for (const channel of ["instagram", "facebook"])
    rows.push({ article_id: a.id, channel, channel_id: chMap[`ko/${channel}`], language: "ko", content_kind: "reels", status: "scheduled", scheduled_at: at, updated_at: nowIso });
});

const days = Math.ceil(arts.length / PER_DAY);
const endDay = new Date(start.getTime() + (days - 1) * 86400000).toISOString().slice(0, 10);
console.log(`\n신규 예약 ${rows.length} rows = 영상 ${arts.length} × 2채널(ko IG+FB)`);
console.log(`기간: ${start.toISOString().slice(0, 10)} ~ ${endDay} (${days}일, 하루 ${PER_DAY}영상, KST 12/19시)`);

if (DRY) {
  arts.slice(0, 6).forEach((a, i) => {
    const day = Math.floor(i / PER_DAY), slot = i % PER_DAY;
    const base = new Date(start); base.setUTCDate(base.getUTCDate() + day);
    console.log(`  #${a.sort_order} ${cleanTitle(a.title).slice(0, 30)} → ${base.toISOString().slice(0, 10)} KST${slot ? "19" : "12"}시`);
  });
  console.log("\n--dry: 삭제/insert 안 함.");
  process.exit(0);
}

// 1) 미발행 ko 큐 삭제
if (toDelete.length) {
  const ids = toDelete.map((q) => q.id);
  for (let i = 0; i < ids.length; i += 100)
    await rest(`marketing_publish_queue?id=in.(${ids.slice(i, i + 100).join(",")})`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  console.log(`삭제 ${ids.length}건 (미발행 ko)`);
}
// 2) 신규 예약 insert
for (let i = 0; i < rows.length; i += 50)
  await rest(`marketing_publish_queue`, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows.slice(i, i + 50)) });
console.log(`\nDONE: ${rows.length} 예약(scheduled) insert 완료`);
