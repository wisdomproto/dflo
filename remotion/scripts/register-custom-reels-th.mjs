// 태국어 재배포 영상을 기존 한국어 커스텀 릴스(같은 콘텐츠)의 reels.th 에 병합 등록.
// 기준 = ko manifest(40개, 안정적). 각 영상의 태국어 mp4(out/shorts/repurpose-th/{NN}_{safe}.mp4) 존재 확인 후,
// title eq 로 custom row 조회 → R2 업로드(영상+커버) → row.reels.th 병합 PATCH.
// caption = stt-th/{id}.th.json 의 headerTitle(태국어 제목). 멱등: reels.th.videoUrl 있으면 skip.
// 사용: node scripts/register-custom-reels-th.mjs [--dry]
import { rest, uploadR2, assertEnv, AI_BASE } from "./lib/reelDb.mjs";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const koManifest = join(root, "out", "shorts", "repurpose-ko", "_manifest.json");
const thDir = join(root, "out", "shorts", "repurpose-th");
const sttThDir = join(root, "out", "_work", "stt-th");
const coverDir = join(root, "out", "_work", "covers-th");
mkdirSync(coverDir, { recursive: true });

const DRY = process.argv.includes("--dry");
const HASHTAGS = "#เพิ่มความสูง #ความสูงของลูก #ส่วนสูงเด็ก #หมอเด็ก #187growup";
const cleanTitle = (t) => (t || "").replace(/^▶️?\s*\[#?187성장클리닉\]\s*/, "").trim();
const safe = (t) => cleanTitle(t).replace(/#\S+/g, "").replace(/[^가-힣㄰-㆏0-9A-Za-z ()._-]/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "untitled";

assertEnv();
const manifest = JSON.parse(readFileSync(koManifest, "utf8"));
console.log(`ko manifest ${manifest.length}개 기준`);

let aiUp = false;
try { const r = await fetch(`${AI_BASE}/api/r2/upload`, { method: "POST" }); aiUp = true; console.log(`ai-server OK (${r.status})`); }
catch { console.log("⚠️ ai-server 미응답"); }
if (!DRY && !aiUp) { console.error("ai-server 미응답이라 중단."); process.exit(1); }

let done = 0, fail = 0, skip = 0;
for (const m of manifest) {
  try {
    const nn = String(m.idx).padStart(2, "0");
    const mp4 = join(thDir, `${nn}_${safe(m.title)}.mp4`);
    if (!existsSync(mp4)) { console.log(`  SKIP ${m.idx}: th 영상 없음 (${nn}_${safe(m.title)}.mp4)`); skip++; continue; }
    const title = cleanTitle(m.title);
    const rows = await (await rest(`marketing_articles?kind=eq.custom&title=eq.${encodeURIComponent(title)}&select=id,reels`)).json();
    if (!rows.length) { console.log(`  SKIP ${m.idx}: custom row 없음 "${title}"`); skip++; continue; }
    const row = rows[0];
    if (row.reels?.th?.videoUrl) { console.log(`  SKIP ${m.idx}: reels.th 이미 있음`); skip++; continue; }
    let caption = title;
    const sttTh = join(sttThDir, `${m.id}.th.json`);
    if (existsSync(sttTh)) { try { caption = JSON.parse(readFileSync(sttTh, "utf8")).headerTitle || title; } catch { /* keep */ } }
    if (DRY) { console.log(`  [dry] ${m.idx} → row ${row.id} reels.th  cap="${caption.slice(0, 32)}"`); done++; continue; }
    const jpg = join(coverDir, `${nn}.jpg`);
    if (!existsSync(jpg)) execFileSync("ffmpeg", ["-v", "error", "-ss", "0.5", "-i", mp4, "-frames:v", "1", "-y", jpg]);
    const videoUrl = await uploadR2(mp4, "marketing/reels");
    const coverUrl = await uploadR2(jpg, "marketing/reels/covers");
    const reels = { ...(row.reels || {}), th: { videoUrl, coverUrl, coverAuto: true, caption, hashtags: HASHTAGS } };
    await rest(`marketing_articles?id=eq.${row.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ reels }) });
    done++;
    console.log(`✅ [${done + fail + skip}/${manifest.length}] th: ${title}`);
  } catch (e) { fail++; console.log(`❌ ${m.idx}: ${e && e.message ? e.message : e}`); }
}
console.log(`\nDONE: ${done} th 등록, ${skip} skip, ${fail} 실패`);
