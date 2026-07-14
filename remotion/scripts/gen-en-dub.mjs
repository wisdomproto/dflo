// 재배포 릴스 영어판 TTS 더빙 + EN/中 자막 타이밍 생성.
// 입력: out/_work/stt-intl/{id}.json (세그먼트 [{start,end,en,zh}])
// 출력: public/audio/en-dub/{id}.wav (영어 연속 TTS, 영상 길이에 맞춤)
//       public/audio/en-dub/{id}.subs.json ([{start,end,en,zh}] 초 — 오디오에 비례 분배)
// 보이스: ELEVEN_VOICE_ID_EN (남성 전문 내레이션). 원본 음성은 컴포넌트에서 음소거.
// 사용:
//   node scripts/gen-en-dub.mjs            # stt-intl 전체
//   node scripts/gen-en-dub.mjs 9zW9kxeXZ9I MeTgH1QF-pw   # id 지정
//   node scripts/gen-en-dub.mjs --force    # 기존 wav 있어도 재생성
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
try { process.loadEnvFile(join(ROOT, ".env")); } catch {}

// Gemini TTS (남성 전문 보이스). ElevenLabs 결제 이슈로 전환.
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const VOICE = process.env.GEMINI_TTS_VOICE || "Charon"; // 남성 informative
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
if (!GEMINI_KEY) { console.error("GEMINI_API_KEY 필요 (remotion/.env)"); process.exit(1); }

// PCM16(mono) → WAV 컨테이너
function pcmToWav(pcm, rate) {
  const bytes = pcm.length, byteRate = rate * 2;
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + bytes, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(byteRate, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(bytes, 40);
  return Buffer.concat([h, pcm]);
}

const intlDir = join(ROOT, "out", "_work", "stt-intl");
const srcDir = join(ROOT, "sources", "originals");
const outDir = join(ROOT, "public", "audio", "en-dub");
mkdirSync(outDir, { recursive: true });

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
let ids = args.filter((a) => !a.startsWith("--"));
if (!ids.length) ids = readdirSync(intlDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));

const cleanForTTS = (t) => (t || "").replace(/["'“”‘’—–]/g, " ").replace(/\s+/g, " ").trim();
const wavDur = (p) => {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nokey=1:noprint_wrappers=1", p], { encoding: "utf8" });
  return parseFloat(out.trim());
};
const probeVideo = (id) => wavDur(join(srcDir, `${id}.mp4`));

async function tts(text, outWav) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
  });
  let inline;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    if (res.ok) {
      const j = await res.json();
      inline = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
      if (inline?.data) break;
      throw new Error("응답에 오디오 없음");
    }
    if ((res.status === 429 || res.status === 503) && attempt < 4) { await new Promise((r) => setTimeout(r, 1500 * attempt)); continue; }
    throw new Error(`tts ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }
  const rate = +(/rate=(\d+)/.exec(inline.mimeType || "")?.[1] || 24000);
  const rawWav = outWav + ".raw.wav";
  writeFileSync(rawWav, pcmToWav(Buffer.from(inline.data, "base64"), rate));
  execFileSync("ffmpeg", ["-y", "-i", rawWav, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1", outWav], { stdio: "ignore" });
  rmSync(rawWav, { force: true });
}

// 세그먼트를 [0, dur] 구간에 en 글자수 비례로 분배
function distribute(segs, dur) {
  const weights = segs.map((s) => Math.max(1, (s.en || "").length));
  const total = weights.reduce((a, b) => a + b, 0);
  let t = 0;
  return segs.map((s, i) => {
    const w = (weights[i] / total) * dur;
    const start = t; t += w;
    return { start: +start.toFixed(2), end: +t.toFixed(2), en: s.en, zh: s.zh };
  });
}

let done = 0, fail = 0;
for (const id of ids) {
  const wav = join(outDir, `${id}.wav`);
  const subsPath = join(outDir, `${id}.subs.json`);
  if (!FORCE && existsSync(wav) && existsSync(subsPath)) { console.log(`skip ${id} (있음)`); done++; continue; }
  try {
    const segs = JSON.parse(readFileSync(join(intlDir, `${id}.json`), "utf8"));
    const videoSec = probeVideo(id);
    const text = cleanForTTS(segs.map((s) => s.en).join(" "));
    process.stdout.write(`${id} … TTS`);
    const raw = join(outDir, `${id}.raw.wav`);
    await tts(text, raw);
    // 앞뒤 무음 트림
    execFileSync("ffmpeg", ["-y", "-i", raw, "-af",
      "silenceremove=start_periods=1:start_silence=0.08:start_threshold=-40dB:detection=peak,areverse,silenceremove=start_periods=1:start_silence=0.08:start_threshold=-40dB:detection=peak,areverse",
      raw + ".t.wav"], { stdio: "ignore" });
    const D = wavDur(raw + ".t.wav");
    // 영상보다 길면 빠르게(≤1.35), 짧으면 그대로(뒤 무음)
    const tempo = Math.max(1, Math.min(1.35, D / videoSec));
    if (tempo > 1.001) execFileSync("ffmpeg", ["-y", "-i", raw + ".t.wav", "-filter:a", `atempo=${tempo.toFixed(3)}`, wav], { stdio: "ignore" });
    else execFileSync("ffmpeg", ["-y", "-i", raw + ".t.wav", wav], { stdio: "ignore" });
    rmSync(raw, { force: true }); rmSync(raw + ".t.wav", { force: true });
    const finalDur = Math.min(wavDur(wav), videoSec);
    const subs = distribute(segs, finalDur);
    writeFileSync(subsPath, JSON.stringify(subs, null, 2));
    done++;
    console.log(` ok (video ${videoSec.toFixed(0)}s, tts ${D.toFixed(0)}s→${(D / tempo).toFixed(0)}s, ${segs.length} subs)`);
  } catch (e) {
    fail++;
    console.log(` FAIL ${id}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 300));
}
console.log(`\nDONE: ${done} 완료, ${fail} 실패 → ${outDir}`);
