// 나레이션 기준 영상 워프 빌드.
//   node scripts/build-mainclip-warp.mjs
// 구간 계획(원본 타임라인): keep(전환 b-roll/Q카드) · warp(나레이션 그룹, 음성 길이에 맞춰 속도↑, 1.5x 캡) · skip(홍보카드)
// 출력:
//   public/mainclip/warped-clean.mp4        — 워프된 영상(무음)
//   public/audio/mainclip/th-narration-warped.wav — 새 타임라인 연속 음성
//   public/mainclip/warp-plan.json          — 큐 재타이밍용 (orig↔new 매핑)
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const sh = (c) => execSync(c, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const probe = (f) => parseFloat(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`));

const FPS = 30;
const MAXSPEED = 1.5;
const CLEAN = join(ROOT, "public/mainclip/clean.mp4");
const NORM = join(ROOT, "public/audio/mainclip/th/norm");
const groups = Object.fromEntries(JSON.parse(readFileSync(join(ROOT, "public/audio/mainclip/groups.json"), "utf8")).map((g) => [g.id, g]));

// 원본 타임라인 구간 계획
const PLAN = [
  { type: "keep", s: 0, e: 8.2 },                  // 인트로/타이틀
  { type: "warp", g: "g01", s: 8.2, e: 37 },       // 인트로+검사 1~3 (n01~06)
  { type: "warp", g: "g02", s: 37, e: 49.7 },      // 검사 4~5 (n07~08), 49.7서 홍보카드 컷
  { type: "skip", s: 49.7, e: 51.5 },              // 홍보카드 제거
  { type: "keep", s: 51.5, e: 54 },                // Q1 카드
  { type: "warp", g: "g03", s: 54, e: 69 },        // CUT3
  { type: "keep", s: 69, e: 72 },                  // Q2
  { type: "warp", g: "g04", s: 72, e: 101 },       // CUT4
  { type: "keep", s: 101, e: 104 },                // Q3
  { type: "warp", g: "g05", s: 104, e: 140 },      // CUT5
  { type: "keep", s: 140, e: 143 },                // Q4
  { type: "warp", g: "g06", s: 143, e: 164 },      // CUT6
  { type: "keep", s: 164, e: 167 },                // Q5
  { type: "warp", g: "g07", s: 167, e: 216 },      // CUT7 + 클로징 전반 (n30~36)
  { type: "warp", g: "g08", s: 216, e: 238 },      // 클로징 후반 (n37~39)
  // 238~ 한국어 CTA 카드는 ClosingCTA 오버레이로 대체 → 영상에서 드롭
];

// 새 타임라인 계산
let cur = 0;
const segs = [];
for (const p of PLAN) {
  const origDur = +(p.e - p.s).toFixed(3);
  if (p.type === "skip") { segs.push({ ...p, origDur, newDur: 0, speed: 0 }); continue; }
  let newDur = origDur, speed = 1;
  if (p.type === "warp") {
    const aud = groups[p.g].audioDur;
    newDur = +Math.max(aud, origDur / MAXSPEED).toFixed(3);
    speed = +(origDur / newDur).toFixed(4);
  }
  segs.push({ ...p, origDur, newDur, speed, newStart: +cur.toFixed(3), newEnd: +(cur + newDur).toFixed(3), audioDur: p.type === "warp" ? groups[p.g].audioDur : null });
  cur += newDur;
}
const NEWTOTAL = +cur.toFixed(3);
console.log(`새 총 길이 ${NEWTOTAL}s (원본 243.6s)`);
segs.forEach((s) => console.log(`  ${s.type.padEnd(4)} ${s.g || ""}  orig ${s.s}-${s.e} (${s.origDur}s)  ${s.type !== "skip" ? `→ new ${s.newStart}-${s.newEnd} (${s.newDur}s, ${s.speed}x)` : "[컷]"}`));

// ---- 1) 워프 영상 빌드 (구간별 추출+setpts, concat) -----------------------
const TMP = join(ROOT, "out/_work/warpsegs");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const segFiles = [];
let idx = 0;
for (const s of segs) {
  if (s.type === "skip") continue;
  const sf = Math.round(s.s * FPS), ef = Math.round(s.e * FPS);
  const out = join(TMP, `seg${String(idx).padStart(2, "0")}.mp4`);
  const vf = `trim=start_frame=${sf}:end_frame=${ef},setpts=(PTS-STARTPTS)/${s.speed},fps=${FPS}`;
  sh(`ffmpeg -hide_banner -loglevel error -y -i "${CLEAN}" -vf "${vf}" -an -c:v libx264 -crf 17 -pix_fmt yuv420p "${out}"`);
  segFiles.push(out);
  idx++;
}
const listFile = join(TMP, "list.txt");
writeFileSync(listFile, segFiles.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
const warpedVid = join(ROOT, "public/mainclip/warped-clean.mp4");
sh(`ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "${listFile}" -c:v libx264 -crf 17 -pix_fmt yuv420p "${warpedVid}"`);
console.log(`🎬 warped-clean.mp4  ${probe(warpedVid).toFixed(2)}s / ${sh(`ffprobe -v error -select_streams v -show_entries stream=nb_frames -of csv=p=0 "${warpedVid}"`)}f`);

// ---- 2) 새 타임라인 음성 (그룹 연속음성을 newStart에 배치) ----------------
const inputs = [`-f lavfi -t ${NEWTOTAL} -i anullsrc=r=44100:cl=stereo`];
const warpSegs = segs.filter((s) => s.type === "warp");
warpSegs.forEach((s) => inputs.push(`-i "${join(NORM, `${s.g}.wav`)}"`));
const filt = warpSegs.map((s, i) => { const ms = Math.round(s.newStart * 1000); return `[${i + 1}]adelay=${ms}|${ms}[a${i + 1}]`; });
filt.push(`${["[0]", ...warpSegs.map((_, i) => `[a${i + 1}]`)].join("")}amix=inputs=${warpSegs.length + 1}:normalize=0:duration=first[out]`);
const filtFile = join(TMP, "afilter.txt");
writeFileSync(filtFile, filt.join(";\n"));
const warpedAud = join(ROOT, "public/audio/mainclip/th-narration-warped.wav");
sh(`ffmpeg -hide_banner -loglevel error -y ${inputs.join(" ")} -filter_complex_script "${filtFile}" -map "[out]" -ar 44100 -ac 2 "${warpedAud}"`);
console.log(`🔊 th-narration-warped.wav  ${probe(warpedAud).toFixed(2)}s`);

// ---- 3) warp-plan.json (큐 재타이밍용) ------------------------------------
writeFileSync(join(ROOT, "public/mainclip/warp-plan.json"), JSON.stringify({ fps: FPS, newTotal: NEWTOTAL, segments: segs }, null, 2));
console.log("📄 warp-plan.json 출력");
