// 예측키 계산기 데모 광고(out/ads/calc-demo-ko.mp4)를 마케팅 콘텐츠 스튜디오 "커스텀"으로 등록.
// 커버 추출(ffmpeg) → R2 업로드(영상+커버) → marketing_articles(kind=custom, reels.ko).
// 멱등: 같은 title custom row 있으면 영상/커버만 갱신(caption 등 보존).
//   node scripts/register-calc-ad.mjs
import { rest, uploadR2, assertEnv, AI_BASE } from "./lib/reelDb.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const mp4 = join(root, "out", "ads", "calc-demo-ko.mp4");
const coverDir = join(root, "out", "_work", "covers");
mkdirSync(coverDir, { recursive: true });
const cover = join(coverDir, "calc-demo-ko.jpg");

const TITLE = "예측키 계산기 데모 — 한국 광고";
const CAPTION = "우리 아이, 다 크면 키가 몇이나 될까요?\n생년월일과 지금 키만 입력하면, 국가 성장 표준 데이터로 성인 예상 키를 무료로 확인할 수 있어요. 📏\n\n👉 dr187growup.com";
const HASHTAGS = "#키성장 #예상키 #아이키 #성장클리닉 #187growup #키계산기 #예측키";

assertEnv();
if (!existsSync(mp4)) { console.error("영상 없음:", mp4); process.exit(1); }

try { await fetch(`${AI_BASE}/api/r2/upload`, { method: "POST" }); }
catch { console.error(`⚠️ ai-server 미응답 (${AI_BASE}) — 로컬 ai-server 실행 필요`); process.exit(1); }

const existing = await (await rest(`marketing_articles?kind=eq.custom&select=id,title,sort_order,reels`)).json();
const dup = existing.find((a) => a.title === TITLE);
const base = existing.reduce((m, a) => Math.max(m, a.sort_order || 0), 1000) + 1;

if (!existsSync(cover)) execFileSync("ffmpeg", ["-v", "error", "-ss", "2.5", "-i", mp4, "-frames:v", "1", "-y", cover]);

console.log("R2 업로드 중…");
const videoUrl = await uploadR2(mp4, "marketing/reels");
const coverUrl = await uploadR2(cover, "marketing/reels/covers");
console.log("video:", videoUrl);

if (dup) {
  const cur = dup.reels ?? {};
  const merged = { ...cur, ko: { ...(cur.ko ?? {}), videoUrl, coverUrl, coverAuto: true, caption: cur.ko?.caption ?? CAPTION, hashtags: cur.ko?.hashtags ?? HASHTAGS } };
  await rest(`marketing_articles?id=eq.${dup.id}`, { method: "PATCH", body: JSON.stringify({ reels: merged }) });
  console.log(`✅ 갱신: id ${dup.id} "${TITLE}" (영상/커버 교체)`);
} else {
  const row = { title: TITLE, kind: "custom", language: "ko", status: "draft", body: "", category: "", keywords: [], sort_order: base, reels: { ko: { videoUrl, coverUrl, coverAuto: true, caption: CAPTION, hashtags: HASHTAGS } } };
  await rest("marketing_articles", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) });
  console.log(`✅ 등록: "${TITLE}" (kind=custom, ko, sort_order ${base})`);
}
