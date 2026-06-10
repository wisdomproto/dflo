// clean.mp4(원장 진료과정 4분 영상)에서 **원장 정면(흰 가운·중립 배경) 구간만** 잘라
// 정사각(1080×1080) 크롭 → concat → public/mainclip/presenter-base.mp4.
//   node scripts/make-presenter-base.mjs
//
// ★ 재사용 베이스: 각 릴스는 이 베이스에서 **랜덤 구간**을 잘라 립싱크 → 영상마다 원장 컷이 달라 보임.
//   (prep-lipsync 단계가 sort_order 시드로 오프셋을 골라 cut)
// 정면 구간은 5초 컨택트시트(out/_work/cf5)로 식별(2026-06-10). clean.mp4 가 바뀌면 RANGES 재식별 필요.
// 비정면 제외: 인트로카드·상담측면·환자/무릎 진찰·식단/근육 일러스트·야외 아이들·X-ray·태블릿 엔드카드.
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public", "mainclip", "clean.mp4");
const OUT = join(ROOT, "public", "mainclip", "presenter-base.mp4");

const CROP = "1080:1080:480:0";       // 1920×1080 → 정사각, 원장 중앙(offset 300은 우측 치우침 → 480)
// ★ "카메라 응시하며 설명하는" 구간만 (사용자 지시 2026-06-10). 제외: 진료(책상·아래 응시)·환자·X-ray·식단/근육 일러스트·야외·태블릿·전환카드.
// 장면컷 검출 + 1~4초 샘플로 확정한 클린 설명 구간. 끝은 전환(빈방 140.1·X-ray 184·진료손 209)을 피해 보수적으로.
const RANGES = [                       // [start, end] 초 — 각 구간은 장면컷 사이 "연속 단일 샷"이라 내부 인서트 없음
  [126, 139],     // 125.5–140.1 샷(정면), 140.1+ 빈방 제외
  [144, 163.5],   // 143.4–163.8 샷(정면), 163.8+ doorway 제외 ★
  [168, 179],     // 167.1–189.8 샷 앞부분(정면), 184+ X-ray 제외
  [195, 206],     // 193.1–213.9 샷 앞부분(정면), 209+ 진료손 제외
];

const parts = RANGES.map(([s, e], i) => `[0:v]trim=${s}:${e},setpts=PTS-STARTPTS,crop=${CROP},fps=30[v${i}]`);
const concat = RANGES.map((_, i) => `[v${i}]`).join("") + `concat=n=${RANGES.length}:v=1:a=0[out]`;
const fc = parts.join(";") + ";" + concat;

console.log(`🎬 presenter-base ← clean.mp4 정면 ${RANGES.length}구간 (${RANGES.reduce((n, [s, e]) => n + (e - s), 0).toFixed(0)}s)`);
execFileSync("ffmpeg", ["-y", "-i", SRC, "-filter_complex", fc, "-map", "[out]", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", OUT], { stdio: "inherit" });
console.log(`✓ ${OUT}`);
