// out/shorts/repurpose-ko 의 재배포 영상(한국어)을 마케팅 콘텐츠 스튜디오 "커스텀 릴스"로 일괄 등록.
// 각: 첫프레임 커버 추출(ffmpeg) → R2 업로드(영상 + 커버) → marketing_articles(kind=custom) insert(reels.ko).
// 멱등: 같은 title 의 custom row 가 이미 있으면 skip (재실행 안전).
// 사용:
//   node scripts/register-custom-reels.mjs --dry   # 연결·계획만 (업로드 X)
//   node scripts/register-custom-reels.mjs         # 실제 업로드 + 등록
import { rest, uploadR2, assertEnv, AI_BASE } from "./lib/reelDb.mjs";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = join(root, "out", "shorts", "repurpose-ko");
const coverDir = join(root, "out", "_work", "covers");
mkdirSync(coverDir, { recursive: true });

const DRY = process.argv.includes("--dry");
const HASHTAGS = "#키성장 #아이키 #성장클리닉 #187growup #키크는법";
const cleanTitle = (t) => (t || "").replace(/^▶️?\s*\[#?187성장클리닉\]\s*/, "").trim();

assertEnv();

const manifest = JSON.parse(readFileSync(join(outDir, "_manifest.json"), "utf8"));
console.log(`매니페스트 ${manifest.length}개`);

// ai-server 응답 확인 (R2 업로드는 ai-server /api/r2/upload 경유)
let aiUp = false;
try {
  const r = await fetch(`${AI_BASE}/api/r2/upload`, { method: "POST" });
  aiUp = true;
  console.log(`ai-server OK (${AI_BASE}, status ${r.status})`);
} catch {
  console.log(`⚠️ ai-server 미응답 (${AI_BASE}) — R2 업로드 불가. ai-server 실행 필요.`);
}

// 기존 custom 조회 → 멱등 skip + sort_order base
const existing = await (await rest(`marketing_articles?kind=eq.custom&select=id,title,sort_order`)).json();
const existingTitles = new Set(existing.map((a) => a.title));
let base = existing.reduce((m, a) => Math.max(m, a.sort_order || 0), 1000);
console.log(`기존 custom ${existing.length}개, sort_order base ${base}`);

const plan = [];
for (const item of manifest) {
  const title = cleanTitle(item.title);
  const mp4 = join(outDir, item.file);
  if (!existsSync(mp4)) { console.log(`  SKIP ${item.idx}: 영상 없음 ${item.file}`); continue; }
  if (existingTitles.has(title)) { console.log(`  SKIP ${item.idx}: 이미 등록됨 "${title}"`); continue; }
  plan.push({ ...item, title, mp4 });
}
console.log(`\n등록 대상 ${plan.length}개 (이미 등록/누락 ${manifest.length - plan.length}개 제외)`);

if (DRY) {
  plan.slice(0, 5).forEach((p) => console.log(`  [${p.idx}] ${p.title}`));
  if (plan.length > 5) console.log(`  … 외 ${plan.length - 5}개`);
  console.log("\n--dry: 업로드/등록 안 함.");
  process.exit(0);
}

if (!aiUp) { console.error("ai-server 미응답이라 중단."); process.exit(1); }

let done = 0, fail = 0;
for (const p of plan) {
  const t0 = Date.now();
  try {
    const jpg = join(coverDir, `${String(p.idx).padStart(2, "0")}.jpg`);
    if (!existsSync(jpg)) execFileSync("ffmpeg", ["-v", "error", "-ss", "0.5", "-i", p.mp4, "-frames:v", "1", "-y", jpg]);
    const videoUrl = await uploadR2(p.mp4, "marketing/reels");
    const coverUrl = await uploadR2(jpg, "marketing/reels/covers");
    base += 1;
    const row = {
      title: p.title, kind: "custom", language: "ko", status: "draft",
      body: "", category: "", keywords: [], sort_order: base,
      reels: { ko: { videoUrl, coverUrl, coverAuto: true, caption: p.title, hashtags: HASHTAGS } },
    };
    await rest("marketing_articles", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) });
    done++;
    console.log(`✅ [${done + fail}/${plan.length}] ${p.title}  (${Math.round((Date.now() - t0) / 1000)}s)`);
  } catch (e) {
    fail++;
    console.log(`❌ [${done + fail}/${plan.length}] ${p.title}: ${e.message}`);
  }
}
console.log(`\nDONE: ${done} 등록, ${fail} 실패`);
