// 태국 광고영상 영어판을 마케팅 커스텀 콘텐츠로 등록(R2 업로드 + marketing_articles kind=custom).
// 릴스용 세로본(1080x1920)을 올린다 — IG/FB 릴스가 목적이라 가로 레터박스본은 쓰지 않는다.
// ⚠️ R2 업로드는 ai-server(:4000) 경유. 사용: node scripts/register-thad-en.mjs [--dry]
import { rest, uploadR2, assertEnv, AI_BASE } from "./lib/reelDb.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");           // dflo_0.1
const mp4 = join(repo, "out", "ads", "thad-en-vertical.mp4");
const coverDir = join(here, "..", "out", "_work", "covers");
mkdirSync(coverDir, { recursive: true });
const cover = join(coverDir, "thad-en.jpg");

const DRY = process.argv.includes("--dry");
const TITLE = "187 통합 성장 관리 — 영어 광고";

const CAPTION = `Worried about your child's height?

187growup is a growth clinic in Gangnam, Seoul. We don't look at one thing — medical care, sleep, nutrition, posture and exercise are managed together.

Bone age, blood work and growth tracked over time, with the director's 15 years in child growth and hormone care.

👉 dr187growup.com/en`;

const HASHTAGS = "#childheight #growthclinic #kidsgrowth #boneage #187growup #heightgrowth #parentingtips #koreaclinic";

assertEnv();
if (!existsSync(mp4)) { console.error("영상 없음:", mp4); process.exit(1); }

// 멱등: 같은 제목이 이미 있으면 영상만 교체한다(중복 항목을 만들지 않는다).
const existing = await (await rest(`marketing_articles?kind=eq.custom&select=id,title,sort_order,reels`)).json();
const found = existing.find((a) => a.title === TITLE);
const base = existing.reduce((m, a) => Math.max(m, a.sort_order || 0), 1000) + 1;
console.log(found ? `기존 항목 갱신: #${found.sort_order} "${TITLE}"` : `신규 등록: sort_order ${base}`);

if (DRY) { console.log("--dry: 업로드/등록 안 함."); process.exit(0); }

try { await fetch(`${AI_BASE}/api/r2/upload`, { method: "POST" }); }
catch { console.error(`⚠️ ai-server 미응답(${AI_BASE}) — cd ai-server && npm run dev`); process.exit(1); }

// 커버: 아이콘 5개가 다 떠 있는 22.8초 프레임(광고 핵심 메시지가 한 장에 담긴다)
if (!existsSync(cover)) execFileSync("ffmpeg", ["-v", "error", "-ss", "22.8", "-i", mp4, "-frames:v", "1", "-y", cover]);

console.log("R2 업로드 중…");
const videoUrl = await uploadR2(mp4, "marketing/reels");
const coverUrl = await uploadR2(cover, "marketing/reels/covers");

const reelsEn = { videoUrl, coverUrl, coverAuto: true, caption: CAPTION, hashtags: HASHTAGS };

if (found) {
  const merged = { ...(found.reels ?? {}), en: { ...(found.reels?.en ?? {}), ...reelsEn } };
  await rest(`marketing_articles?id=eq.${found.id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ reels: merged }),
  });
  console.log(`✅ reels.en 갱신 (id ${found.id})`);
} else {
  await rest("marketing_articles", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      title: TITLE, kind: "custom", body: "", category: "", keywords: [], sort_order: base,
      reels: { en: reelsEn },
    }),
  });
  console.log("✅ 신규 커스텀 콘텐츠 등록");
}
console.log("video:", videoUrl);
console.log("cover:", coverUrl);
