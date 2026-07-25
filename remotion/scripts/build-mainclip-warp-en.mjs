// MainClipEN — 영어 나레이션 기준 영상 워프 빌드.
//   node scripts/build-mainclip-warp-en.mjs
//
// build-mainclip-warp.mjs(태국어)의 영어판. 태국어 스크립트는 그대로 두고 분리했다
// (태국어 오디오 자산은 이미 정리돼 재실행 불가 — 코드만 보존).
//
// 입력: public/audio/mainclip/en/raw/{id}.wav  (gen-mainclip-tts-en.mjs 산출)
//       src/mainclip/narration.en.json
//       public/mainclip/clean.mp4              (텍스트 없는 원본 245.3s)
// 출력: public/mainclip/warped-clean-en.mp4          — 워프된 영상(무음)
//       public/audio/mainclip/en-narration-warped.wav — 새 타임라인 연속 음성
//       src/mainclip/warp-plan.en.json                — 큐 재타이밍용(orig↔new 매핑)
//
// ★MAXSPEED 상한 없음(사용자 지시 2026-07-25). 영어 음성이 한국어 영상보다 짧아
//   구간에 따라 1.6~1.8x 까지 빨라진다 — 렌더 후 육안 확인 대상.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sh = (c) => execSync(c, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const probe = (f) => parseFloat(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`));

const FPS = 30;
const CLEAN = join(ROOT, "public/mainclip/clean.mp4");
const RAW = join(ROOT, "public/audio/mainclip/en/raw");
const narration = JSON.parse(readFileSync(join(ROOT, "src/mainclip/narration.en.json"), "utf8"));

// 원본 타임라인 구간 계획 — 태국어판과 동일(영상 구조는 같으므로).
const PLAN = [
  { type: "keep", s: 0, e: 8.2 },                  // 인트로/타이틀
  { type: "warp", g: "g01", s: 8.2, e: 37 },       // 인트로+검사 1~3 (n01~06)
  { type: "warp", g: "g02", s: 37, e: 49.7 },      // 검사 4~5 (n07~08)
  { type: "skip", s: 49.7, e: 51.5 },              // 한국어 홍보카드 제거
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
  // 238~ 한국어 검색 아웃트로는 ClosingCTAEn 오버레이로 대체 → 영상에서 드롭
];

const TMP = join(ROOT, "out/_work/warpsegs-en");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

// ---- 0) 그룹별 연속 음성 만들기 ------------------------------------------
// 각 줄 wav 를 그룹 안에서 "원본 간격을 비례 축소"해 이어붙인다. 줄 사이 최소 0.25s 숨.
const GAP = 0.25;
const groupAudio = {};
for (const p of PLAN.filter((x) => x.type === "warp")) {
  const lines = narration.lines.filter((l) => l.from >= p.s - 0.01 && l.from < p.e);
  const files = lines.map((l) => ({ id: l.id, f: join(RAW, `${l.id}.wav`), d: probe(join(RAW, `${l.id}.wav`)) }));
  const out = join(TMP, `${p.g}.wav`);
  // 줄 사이에 GAP 무음을 끼워 하나로 concat (같은 무음 입력을 반복 참조).
  const inputs = files.map((x) => `-i "${x.f}"`).join(" ");
  const silIn = files.length > 1 ? ` -f lavfi -t ${GAP} -i anullsrc=r=24000:cl=mono` : "";
  const silIdx = files.length;
  const seq = files.map((_, i) => (i === 0 ? `[0:a]` : `[${silIdx}:a][${i}:a]`)).join("");
  const n = files.length + (files.length - 1);
  sh(`ffmpeg -hide_banner -loglevel error -y ${inputs}${silIn} -filter_complex "${seq}concat=n=${n}:v=0:a=1[out]" -map "[out]" -ar 24000 -ac 1 "${out}"`);
  groupAudio[p.g] = { file: out, dur: probe(out), lines: files.map((x) => x.id) };
  console.log(`  ${p.g}: ${files.length}줄 → ${groupAudio[p.g].dur.toFixed(2)}s (영상 ${(p.e - p.s).toFixed(1)}s)`);
}

// ---- 1) 새 타임라인 계산 (상한 없음) --------------------------------------
let cur = 0;
const segs = [];
for (const p of PLAN) {
  const origDur = +(p.e - p.s).toFixed(3);
  if (p.type === "skip") { segs.push({ ...p, origDur, newDur: 0, speed: 0 }); continue; }
  let newDur = origDur, speed = 1;
  if (p.type === "warp") {
    newDur = +groupAudio[p.g].dur.toFixed(3);   // ★상한 없이 음성 길이에 그대로 맞춘다
    speed = +(origDur / newDur).toFixed(4);
  }
  segs.push({
    ...p, origDur, newDur, speed,
    newStart: +cur.toFixed(3), newEnd: +(cur + newDur).toFixed(3),
    audioDur: p.type === "warp" ? groupAudio[p.g].dur : null,
  });
  cur += newDur;
}
const NEWTOTAL = +cur.toFixed(3);
console.log(`\n새 총 길이 ${NEWTOTAL}s (원본 245.3s)`);
segs.forEach((s) => console.log(`  ${s.type.padEnd(4)} ${(s.g || "").padEnd(4)} orig ${s.s}-${s.e} (${s.origDur}s)  ${s.type !== "skip" ? `→ ${s.newDur}s @ ${s.speed}x` : "[컷]"}`));

// ---- 2) 워프 영상 빌드 -----------------------------------------------------
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
const warpedVid = join(ROOT, "public/mainclip/warped-clean-en.mp4");
sh(`ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "${listFile}" -c:v libx264 -crf 17 -pix_fmt yuv420p "${warpedVid}"`);
console.log(`\n🎬 warped-clean-en.mp4  ${probe(warpedVid).toFixed(2)}s`);

// ---- 3) 새 타임라인 연속 음성 ---------------------------------------------
const warpSegs = segs.filter((s) => s.type === "warp");
const inputs = [`-f lavfi -t ${NEWTOTAL} -i anullsrc=r=44100:cl=stereo`];
warpSegs.forEach((s) => inputs.push(`-i "${groupAudio[s.g].file}"`));
const filt = warpSegs.map((s, i) => {
  const ms = Math.round(s.newStart * 1000);
  return `[${i + 1}]aresample=44100,adelay=${ms}|${ms}[a${i + 1}]`;
});
filt.push(`${["[0]", ...warpSegs.map((_, i) => `[a${i + 1}]`)].join("")}amix=inputs=${warpSegs.length + 1}:normalize=0:duration=first[out]`);
const filtFile = join(TMP, "afilter.txt");
writeFileSync(filtFile, filt.join(";\n"));
mkdirSync(join(ROOT, "public/audio/mainclip"), { recursive: true });
const warpedAud = join(ROOT, "public/audio/mainclip/en-narration-warped.wav");
sh(`ffmpeg -hide_banner -loglevel error -y ${inputs.join(" ")} -filter_complex_script "${filtFile}" -map "[out]" -ar 44100 -ac 2 "${warpedAud}"`);
console.log(`🔊 en-narration-warped.wav  ${probe(warpedAud).toFixed(2)}s`);

// ---- 4) warp-plan.en.json (큐 재타이밍용) ---------------------------------
writeFileSync(
  join(ROOT, "src/mainclip/warp-plan.en.json"),
  JSON.stringify({ fps: FPS, newTotal: NEWTOTAL, segments: segs }, null, 2),
);
console.log("📄 src/mainclip/warp-plan.en.json 출력");
