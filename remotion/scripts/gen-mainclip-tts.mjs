// MainClipTH 태국어 더빙 생성 → 타이밍 정렬 → 245s 트랙 조립.
//   node scripts/gen-mainclip-tts.mjs [--force] [lang]
// ★ 연속 생성 + 줄별 분배:
//   1) 자막 줄을 갭(>GROUP_GAP초)으로 묶어 각 "연속 발화 그룹"을 한 번의 TTS로 생성(톤 일정·틈 없음).
//   2) 그룹 음성을 loudnorm(−16) 통일 후, 문장 사이 무음에서 줄 단위로 분할(무음 우선, 없으면 글자수 비례).
//   3) 각 줄 조각을 제자리(line.from)에 배치 → 타이밍/립싱크 유지하면서도 클립 간 불일치 제거.
// - 원장 클론 음성(ELEVEN_VOICE_ID), stability 기본 0.6(사용자 선호).
// - 출력: th/raw/<gN>.mp3(그룹 캐시), th/norm/<gN>.wav, th/fit/<lineId>.wav, th-narration.wav
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
try { process.loadEnvFile(join(ROOT, ".env")); } catch {}

const FORCE = process.argv.includes("--force");
const lang = process.argv.find((a) => /^(th|en|ko)$/.test(a)) || "th";
const API_KEY = process.env.ELEVEN_API_KEY;
const VOICE_ID = process.env.ELEVEN_VOICE_ID;
if (!API_KEY || !VOICE_ID) { console.error("❌ ELEVEN_API_KEY + ELEVEN_VOICE_ID 필요 (.env)"); process.exit(1); }
const MODEL = process.env.ELEVEN_MODEL || (lang === "th" ? "eleven_turbo_v2_5" : "eleven_multilingual_v2");

const sh = (cmd) => execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const shErr = (cmd) => { try { return execSync(cmd + " 2>&1", { stdio: ["ignore", "pipe", "pipe"] }).toString(); } catch (e) { return (e.stdout || "").toString() + (e.stderr || "").toString(); } };
const probeDur = (f) => parseFloat(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`));

const data = JSON.parse(readFileSync(join(ROOT, "src/mainclip/narration.json"), "utf8"));
const lines = data.lines;
const TOTAL = data.total;

const BASE = join(ROOT, "public/audio/mainclip");
const RAW = join(BASE, lang, "raw");
const NORM = join(BASE, lang, "norm");
const FIT = join(BASE, lang, "fit");
[RAW, NORM, FIT].forEach((d) => mkdirSync(d, { recursive: true }));

// ---- 0) 연속 발화 구간 그룹핑 (갭 > GROUP_GAP초면 새 그룹) -------------------
const GAP = +(process.env.GROUP_GAP ?? 1.0);
const MAXCHARS = +(process.env.MAX_GROUP_CHARS ?? 400); // 긴 생성의 톤 드리프트 방지: 이 글자수 넘으면 줄 경계서 새 그룹
const groups = [];
for (const L of lines) {
  const g = groups[groups.length - 1];
  if (g && L.from - g.end <= GAP && g.text.length + 1 + L.text.trim().length <= MAXCHARS) {
    g.end = L.to; g.lines.push(L); g.text += " " + L.text.trim();
  } else {
    groups.push({ id: `g${String(groups.length + 1).padStart(2, "0")}`, start: L.from, end: L.to, lines: [L], text: L.text.trim() });
  }
}
console.log(`연속 발화 그룹 ${groups.length}개:`);
groups.forEach((g) => console.log(`  ${g.id}  ${g.start}-${g.end}s  [${g.lines.map((l) => l.id).join(",")}]`));

// ---- 1) 그룹별 연속 TTS (스티칭) ------------------------------------------
const prevIds = [];
for (let i = 0; i < groups.length; i++) {
  const G = groups[i];
  const out = join(RAW, `${G.id}.mp3`);
  if (existsSync(out) && !FORCE) { console.log(`· ${G.id} 캐시`); continue; }
  // 문장 사이에 명시적 쉼 → 분할 경계를 확실하게(단어 중간 절단 방지). turbo_v2_5 <break> 지원 확인됨.
  const ttsText = G.lines.map((l) => l.text.trim()).join(' <break time="0.4s" /> ');
  const body = {
    text: ttsText, model_id: MODEL,
    voice_settings: { stability: +(process.env.STABILITY ?? 0.6), similarity_boost: +(process.env.SIMILARITY ?? 0.9), style: +(process.env.STYLE ?? 0.0), use_speaker_boost: true },
    previous_request_ids: prevIds.slice(-3),
  };
  if (i > 0) body.previous_text = groups[i - 1].text.slice(-320);
  if (i < groups.length - 1) body.next_text = groups[i + 1].text.slice(0, 320);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: "POST", headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) { console.error(`${G.id} TTS ${res.status}:`, (await res.text()).slice(0, 300)); process.exit(1); }
  const rid = res.headers.get("request-id");
  if (rid) prevIds.push(rid);
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(`✅ ${G.id} TTS rid=${rid ? rid.slice(0, 8) : "none"} (${G.text.length}자)`);
}

// ---- 2) 그룹 loudnorm + 문장 무음 기준 줄 분할 -----------------------------
function detectSilences(file) {
  const log = shErr(`ffmpeg -hide_banner -i "${file}" -af silencedetect=noise=-30dB:d=0.10 -f null -`);
  const sil = [];
  let start = null;
  for (const line of log.split("\n")) {
    let m = line.match(/silence_start:\s*([\d.]+)/);
    if (m) start = parseFloat(m[1]);
    m = line.match(/silence_end:\s*([\d.]+)/);
    if (m && start != null) { const end = parseFloat(m[1]); sil.push({ start, end, mid: (start + end) / 2, dur: end - start }); start = null; }
  }
  return sil;
}

console.log("\n— 줄 분할 + 정렬 —");
const report = [];
for (const G of groups) {
  const raw = join(RAW, `${G.id}.mp3`);
  const norm = join(NORM, `${G.id}.wav`);
  // dynaudnorm: 긴 생성 내부의 음량 드리프트(후반 작아짐) 평탄화. 그 다음 loudnorm으로 레벨 통일.
  sh(`ffmpeg -hide_banner -loglevel error -y -i "${raw}" -af "dynaudnorm=f=200:g=11:m=20:p=0.6,loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 -ac 2 "${norm}"`);
  const gdur = probeDur(norm);
  const N = G.lines.length;

  // 분할점(N-1개): 명시적 <break>(~0.4s) 무음에서만 자름 → 문장 경계 보장(단어 절단 방지)
  let splits = [];
  if (N > 1) {
    const breaks = detectSilences(norm).filter((s) => s.dur >= 0.25); // 0.4s break만, 단어내 micro-pause(<0.2s) 제외
    if (breaks.length === N - 1) {
      splits = breaks.sort((a, b) => a.mid - b.mid).map((s) => s.mid);
    } else {
      // 개수 불일치(드묾) → 글자수 비례 기대점에 가장 가까운 break, 없으면 비례점
      const totalChars = G.lines.reduce((s, l) => s + l.text.length, 0);
      let cum = 0;
      for (let i = 0; i < N - 1; i++) {
        cum += G.lines[i].text.length;
        const exp = (cum / totalChars) * gdur;
        const near = breaks.filter((s) => Math.abs(s.mid - exp) < 2.0).sort((a, b) => Math.abs(a.mid - exp) - Math.abs(b.mid - exp))[0];
        splits.push(near ? near.mid : exp);
      }
      console.log(`  ⚠️ ${G.id}: break ${breaks.length}개(필요 ${N - 1}) → 비례 보정`);
    }
    for (let i = 1; i < splits.length; i++) if (splits[i] <= splits[i - 1]) splits[i] = splits[i - 1] + 0.05;
  }
  const bounds = [0, ...splits, gdur];

  // 각 줄 조각 추출 → 윈도우보다 길면 atempo 압축
  for (let i = 0; i < N; i++) {
    const L = G.lines[i];
    const a = bounds[i], b = bounds[i + 1];
    const pieceDur = b - a;
    const win = +(L.to - L.from).toFixed(3);
    const atempo = pieceDur > win ? Math.min(pieceDur / win, 1.4) : 1.0;
    const fit = join(FIT, `${L.id}.wav`);
    // 조각 추출(살짝 페이드로 경계 클릭 방지) + 압축
    const fade = "afade=t=in:st=0:d=0.02," + `afade=t=out:st=${Math.max(0, pieceDur - 0.02).toFixed(3)}:d=0.02`;
    sh(`ffmpeg -hide_banner -loglevel error -y -ss ${a.toFixed(3)} -t ${pieceDur.toFixed(3)} -i "${norm}" -af "${fade},atempo=${atempo.toFixed(4)}" -ar 44100 -ac 2 "${fit}"`);
    report.push({ id: L.id, grp: G.id, win, piece: +pieceDur.toFixed(2), atempo: +atempo.toFixed(3), at: L.from });
  }
}

// ---- 3) 245s 트랙 조립 (줄 조각을 line.from에 배치) -------------------------
console.log("— 조립 —");
const inputs = [`-f lavfi -t ${TOTAL} -i anullsrc=r=44100:cl=stereo`];
lines.forEach((L) => inputs.push(`-i "${join(FIT, `${L.id}.wav`)}"`));
const filt = [];
lines.forEach((L, i) => { const ms = Math.round(L.from * 1000); filt.push(`[${i + 1}]adelay=${ms}|${ms}[a${i + 1}]`); });
filt.push(`${["[0]", ...lines.map((_, i) => `[a${i + 1}]`)].join("")}amix=inputs=${lines.length + 1}:normalize=0:duration=first[out]`);
const filtFile = join(BASE, `_filter_${lang}.txt`);
writeFileSync(filtFile, filt.join(";\n"));
const outWav = join(BASE, `th-narration${lang === "th" ? "" : "-" + lang}.wav`);
sh(`ffmpeg -hide_banner -loglevel error -y ${inputs.join(" ")} -filter_complex_script "${filtFile}" -map "[out]" -ar 44100 -ac 2 "${outWav}"`);

// 워프 설계용: 그룹별 원본 구간 + 연속음성(norm) 길이
const groupsInfo = groups.map((G) => ({ id: G.id, lineIds: G.lines.map((l) => l.id), origStart: G.start, origEnd: G.end, origDur: +(G.end - G.start).toFixed(3), audioDur: +probeDur(join(NORM, `${G.id}.wav`)).toFixed(3) }));
writeFileSync(join(BASE, `groups${lang === "th" ? "" : "-" + lang}.json`), JSON.stringify(groupsInfo, null, 2));
console.log("📄 groups.json 출력");

console.log("\nline  grp  win    piece  atempo @from");
report.forEach((r) => console.log(`${r.id}  ${r.grp}  ${String(r.win).padEnd(6)} ${String(r.piece).padEnd(6)} ${String(r.atempo).padEnd(6)} ${r.at}`));
console.log(`\n✅ ${outWav}  (총 ${probeDur(outWav).toFixed(2)}s)`);
