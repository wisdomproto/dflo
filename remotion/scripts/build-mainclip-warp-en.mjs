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
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
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
  // Q1(차별점)·Q2(운동·물리치료)를 해외판에서 제외(사용자 결정 2026-07-25).
  //  - Q1 은 앞의 5단계 검사와 메시지가 겹친다("여러 요인을 함께 본다"를 검사항목/관리영역으로 두 번 말함).
  //  - Q2 는 병원 핵심 차별점이 아니라 곁가지로 읽힌다.
  //  - 끝을 102 로 잡은 건 척추 Before/After X-ray 가 원본 101s 까지 이어지기 때문.
  { type: "skip", s: 49.7, e: 102 },               // 홍보카드 + Q1 + Q2 통째 컷
  { type: "keep", s: 102, e: 104 },                // Q3
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

// ---- 0) 줄 단위 세그먼트 계획 ----------------------------------------------
// ★그룹을 통째로 늘리면 그룹 "안쪽" 큐가 어긋난다. 실제로 인트로 버블(원본 15.35s 소멸)이
//   n02("…posture and sleep", 6.5s)가 끝나기 2.2s 전에 사라져 화면만 먼저 넘어갔다(2026-07-25).
//   그래서 warp 그룹을 **나레이션 줄 경계로 다시 쪼개** 각 줄이 말하는 동안 그 구간 영상이
//   유지되게 한다(그 줄의 원본 구간을 음성 길이에 맞춰 늘림 = 배속<1).
//   줄이 없는 자투리 구간은 원속도(keep)로 통과시킨다.
const GAP = 0.12;               // 줄 사이 최소 숨
const linePlacements = [];      // {id, file, dur, newStart}
const SEGPLAN = [];             // 최종 세그먼트(줄 단위로 쪼갠 PLAN)

for (const p of PLAN) {
  if (p.type !== "warp") { SEGPLAN.push({ ...p }); continue; }
  const lines = narration.lines.filter((l) => l.from >= p.s - 0.01 && l.from < p.e);
  if (!lines.length) { SEGPLAN.push({ type: "keep", s: p.s, e: p.e }); continue; }

  let cut = p.s;                // 원본 타임라인 커서
  lines.forEach((l, i) => {
    const f = join(RAW, `${l.id}.wav`);
    const d = probe(f);
    // 이 줄이 차지할 원본 구간 = [l.from, 다음 줄 from) (마지막은 그룹 끝까지)
    const segS = Math.max(cut, l.from);
    const segE = i + 1 < lines.length ? Math.min(lines[i + 1].from, p.e) : p.e;
    if (segS > cut + 0.001) SEGPLAN.push({ type: "keep", s: cut, e: segS });  // 줄 앞 자투리
    const origDur = +(segE - segS).toFixed(3);
    const need = +(d + GAP).toFixed(3);          // 음성 + 숨
    SEGPLAN.push({ type: "warp", line: l.id, s: segS, e: segE, forceDur: Math.max(origDur, need), audioFile: f, audioDur: d });
    cut = segE;
  });
  if (cut < p.e - 0.001) SEGPLAN.push({ type: "keep", s: cut, e: p.e });
}
// ---- 1) 새 타임라인 계산 (상한 없음) --------------------------------------
let cur = 0;
const segs = [];
for (const p of SEGPLAN) {
  const origDur = +(p.e - p.s).toFixed(3);
  if (p.type === "skip") { segs.push({ ...p, origDur, newDur: 0, speed: 0 }); continue; }
  let newDur = origDur, speed = 1;
  if (p.type === "warp") {
    newDur = +p.forceDur.toFixed(3);            // 그 줄 음성이 끝날 때까지 화면을 붙든다
    speed = +(origDur / newDur).toFixed(4);
    linePlacements.push({ id: p.line, file: p.audioFile, dur: p.audioDur, newStart: +cur.toFixed(3) });
  }
  segs.push({
    ...p, origDur, newDur, speed,
    newStart: +cur.toFixed(3), newEnd: +(cur + newDur).toFixed(3),
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

// ---- 3) 새 타임라인 연속 음성 (줄 단위 배치) ------------------------------
const inputs = [`-f lavfi -t ${NEWTOTAL} -i anullsrc=r=44100:cl=stereo`];
linePlacements.forEach((l) => inputs.push(`-i "${l.file}"`));
const filt = linePlacements.map((l, i) => {
  const ms = Math.round(l.newStart * 1000);
  return `[${i + 1}]aresample=44100,adelay=${ms}|${ms}[a${i + 1}]`;
});
filt.push(`${["[0]", ...linePlacements.map((_, i) => `[a${i + 1}]`)].join("")}amix=inputs=${linePlacements.length + 1}:normalize=0:duration=first[out]`);
const filtFile = join(TMP, "afilter.txt");
  writeFileSync(filtFile, filt.join(";" + String.fromCharCode(10)));

mkdirSync(join(ROOT, "public/audio/mainclip"), { recursive: true });
const warpedAud = join(ROOT, "public/audio/mainclip/en-narration-warped.wav");
sh(`ffmpeg -hide_banner -loglevel error -y ${inputs.join(" ")} -filter_complex_script "${filtFile}" -map "[out]" -ar 44100 -ac 2 "${warpedAud}"`);
console.log(`🔊 en-narration-warped.wav  ${probe(warpedAud).toFixed(2)}s  (${linePlacements.length}줄)`);

// ---- 3b) 배경음악: 원본 music stem 을 영상과 같은 계획으로 워프 --------------
// 원본에서 demucs(htdemucs 2-stem)로 원장 목소리를 뺀 music-orig.wav 를 쓴다(태국어판과 동일 방식).
// 영상과 같은 구간·속도로 잘라 붙여야 음악이 화면과 어긋나지 않는다.
const MUSIC = join(ROOT, "public/audio/mainclip/music-orig.wav");
if (existsSync(MUSIC)) {
  const mparts = [];
  let mi = 0;
  for (const s of segs) {
    if (s.type === "skip") continue;
    const out = join(TMP, `m${String(mi).padStart(2, "0")}.wav`);
    // atempo 는 0.5~2.0 만 지원 — 우리 배속(0.95~1.7)은 범위 안.
    sh(`ffmpeg -hide_banner -loglevel error -y -ss ${s.s} -t ${s.origDur} -i "${MUSIC}" -filter:a "atempo=${s.speed}" -ar 44100 -ac 2 "${out}"`);
    mparts.push(out);
    mi++;
  }
  const mlist = join(TMP, "mlist.txt");
  writeFileSync(mlist, mparts.map((f) => `file '${f.split(String.fromCharCode(92)).join("/")}'`).join(String.fromCharCode(10)));
  const musicWarped = join(TMP, "music-warped.wav");
  sh(`ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "${mlist}" -ar 44100 -ac 2 "${musicWarped}"`);

  // 최종 믹스: 나레이션(원음) + 음악(-16dB, 나레이션 있을 때 더 눌리도록 사이드체인 덕킹)
  const mixOut = join(ROOT, "public/audio/mainclip/en-mix-warped.wav");
  sh(`ffmpeg -hide_banner -loglevel error -y -i "${warpedAud}" -i "${musicWarped}" ` +
     `-filter_complex "[1:a]volume=0.16[m];[m][0:a]sidechaincompress=threshold=0.03:ratio=6:attack=25:release=450[mc];[0:a][mc]amix=inputs=2:normalize=0:duration=first[out]" ` +
     `-map "[out]" -ar 44100 -ac 2 "${mixOut}"`);
  console.log(`🎵 en-mix-warped.wav  ${probe(mixOut).toFixed(2)}s  (나레이션 + BGM 덕킹)`);
} else {
  console.warn("⚠ music-orig.wav 없음 — BGM 생략(나레이션만). demucs 분리 필요.");
}

// ---- 4) warp-plan.en.json (큐 재타이밍용) ---------------------------------
writeFileSync(
  join(ROOT, "src/mainclip/warp-plan.en.json"),
  JSON.stringify({ fps: FPS, newTotal: NEWTOTAL, segments: segs }, null, 2),
);
console.log("📄 src/mainclip/warp-plan.en.json 출력");
