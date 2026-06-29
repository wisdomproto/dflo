// prod 발행 파이프라인 테스트: 큐 1건(#1002 ko/IG)을 즉시 발행 시각으로 당기고 status 폴링.
// 로컬 ai-server 꺼진 상태에서 published 되면 = prod Railway 스케줄러+토큰복호화+Graph 정상.
import { rest } from "./lib/reelDb.mjs";

const SORT = Number(process.argv[2] || 1002);
const art = (await (await rest(`marketing_articles?kind=eq.custom&sort_order=eq.${SORT}&select=id,title`)).json())[0];
if (!art) { console.error(`sort_order ${SORT} custom 없음`); process.exit(1); }
const rows = await (await rest(`marketing_publish_queue?article_id=eq.${art.id}&channel=eq.instagram&language=eq.ko&content_kind=eq.reels&select=id,status`)).json();
if (!rows.length) { console.error("queue row(ko/IG) 없음"); process.exit(1); }
const id = rows[0].id;
const at = new Date(Date.now() + 45000).toISOString();
await rest(`marketing_publish_queue?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ scheduled_at: at, status: "scheduled", updated_at: new Date().toISOString() }) });
console.log(`테스트 발행 당김: "${art.title}" ko/IG → ${at}`);
console.log(`row ${id} — prod 스케줄러 대기 중 (매분 cron)…`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 1; i <= 18; i++) {
  await sleep(20000);
  const r = (await (await rest(`marketing_publish_queue?id=eq.${id}&select=status,published_url,error_message`)).json())[0];
  console.log(`[${i * 20}s] status=${r.status}${r.published_url ? " url=" + r.published_url : ""}${r.error_message ? " err=" + r.error_message : ""}`);
  if (r.status === "published" || r.status === "failed") { console.log(r.status === "published" ? "\n✅ PROD 발행 성공" : "\n❌ PROD 발행 실패"); break; }
}
