// 영어판 재배포 릴스를 기존 marketing_articles(custom)에 reels.en 로 추가 (draft, 발행 예약 없음).
// - reels.ko/th 는 보존(비파괴 병합). 매칭: sort_order = 1002 + (구 repurpose-ko manifest index).
// ⚠️ R2 업로드는 ai-server(:4000) 경유 — `cd ai-server && npm run dev` 선행.
// 사용:
//   node scripts/register-purple-en.mjs --dry
//   node scripts/register-purple-en.mjs
import { rest, uploadR2, assertEnv, AI_BASE } from "./lib/reelDb.mjs";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const enDir = join(root, "out", "shorts", "repurpose-en-purple");
const coverDir = join(root, "out", "_work", "covers-en");
mkdirSync(coverDir, { recursive: true });

const DRY = process.argv.includes("--dry");
const HASHTAGS = "#HeightGrowth #KidsHeight #GrowthClinic #187growup #TallerKids";
assertEnv();

const prevManifest = JSON.parse(readFileSync(join(root, "out", "shorts", "repurpose-ko", "_manifest.json"), "utf8"));
const sortOrderById = new Map(prevManifest.map((r, i) => [r.id, 1002 + i]));
const rendered = JSON.parse(readFileSync(join(enDir, "_manifest.json"), "utf8"));

const existing = await (await rest(`marketing_articles?kind=eq.custom&select=id,title,sort_order,reels`)).json();
const bySort = new Map(existing.map((a) => [a.sort_order, a]));

const work = [];
for (const r of rendered) {
  const so = sortOrderById.get(r.id);
  const art = so ? bySort.get(so) : null;
  work.push({ id: r.id, mp4: join(enDir, r.file), sortOrder: so, kicker: r.kicker, title: r.title, art });
}

let bad = 0;
for (const w of work) {
  if (!w.art || !existsSync(w.mp4)) bad++;
  if (DRY) console.log(`  #${w.sortOrder} [${w.id.slice(0, 8)}] "${w.kicker} / ${w.title}"${w.art ? ` ↔ "${(w.art.title || "").slice(0, 24)}"` : " ❌매칭실패"}${existsSync(w.mp4) ? "" : " ❌파일없음"}`);
}
if (DRY) { console.log(`\n--dry: 업로드/등록 안 함. (문제 ${bad}건)`); process.exit(bad ? 1 : 0); }
if (bad) { console.error(`❌ 매칭실패/파일없음 ${bad}건 — 중단.`); process.exit(1); }

try { await fetch(`${AI_BASE}/api/r2/upload`, { method: "POST" }); }
catch { console.error(`❌ ai-server 미응답(${AI_BASE}) — cd ai-server && npm run dev`); process.exit(1); }

let done = 0, fail = 0;
for (const w of work) {
  const t0 = Date.now();
  try {
    const jpg = join(coverDir, `${w.sortOrder}.jpg`);
    if (!existsSync(jpg)) execFileSync("ffmpeg", ["-v", "error", "-ss", "0.5", "-i", w.mp4, "-frames:v", "1", "-y", jpg]);
    const videoUrl = await uploadR2(w.mp4, "marketing/reels");
    const coverUrl = await uploadR2(jpg, "marketing/reels/covers");
    const enReel = { videoUrl, coverUrl, coverAuto: true, caption: `${w.kicker} ${w.title}`, hashtags: HASHTAGS };
    const reels = { ...(w.art.reels || {}), en: { ...((w.art.reels || {}).en || {}), ...enReel } }; // ko/th 보존
    await rest(`marketing_articles?id=eq.${w.art.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ reels }) });
    done++;
    console.log(`✅ [${done + fail}/${work.length}] #${w.sortOrder} ${w.title}  (${Math.round((Date.now() - t0) / 1000)}s)`);
  } catch (e) {
    fail++;
    console.log(`❌ [${done + fail}/${work.length}] ${w.title}: ${e.message}`);
  }
}
console.log(`\nDONE: ${done} 등록(reels.en), ${fail} 실패`);
