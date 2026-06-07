// 원본 대본 싱크용 — 원장님 클론으로 6청크 생성, 원본 슬롯 길이에 맞춰 정렬(길면 가속).
// 출력: public/audio/supp-sync/ko/cN.wav (각 청크는 해당 슬롯 시작프레임에 배치 → footage와 립싱크)
//   $env:ELEVEN_API_KEY="..."; $env:ELEVEN_VOICE_ID="W2h6uMT837yzrawb0X2r"; node scripts/gen-tts-sync-ko.mjs
import { writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
try { process.loadEnvFile(join(ROOT, ".env")); } catch {} // remotion/.env 자동 로드(없으면 셸 env 사용)
const API_KEY = process.env.ELEVEN_API_KEY;
const VOICE_ID = process.env.ELEVEN_VOICE_ID;
const MODEL = process.env.ELEVEN_MODEL || "eleven_multilingual_v2";
const FPS = 30;
const OUT_DIR = join(ROOT, "public", "audio", "supp-sync", "ko");

// 원본 전사 기반 6청크 (start/end 초). 텍스트는 원장님 실제 대본.
const CHUNKS = [
  { id: "c1", start: 0.0, end: 8.0, text: "성장 영양제 검색하면 나오는 내용은 칼슘 뿐인데요. 칼슘만 먹으면 우리 아이도 백칠십, 백팔십삼? 아닙니다." },
  { id: "c2", start: 8.0, end: 14.0, text: "키가 잘 자라기 위해서는 호르몬, 수면, 영양 이 세 가지 균형이 중요합니다." },
  { id: "c3", start: 14.0, end: 20.0, text: "첫째, 아르기닌. 성장 호르몬의 분비를 도와 키 성장에 도움을 줍니다." },
  { id: "c4", start: 20.0, end: 32.0, text: "둘째, 마그네슘. 잘 자야 키가 크겠죠? 수면을 도와주는 마그네슘은 근육의 이완을 돕고 마음을 편안하게 하여 우리 아이의 수면을 도와줍니다." },
  { id: "c5", start: 32.0, end: 49.0, text: "셋째, 아연. 이렇게 많은 영양제 안에 공통적으로 들어 있는 성분은 바로 아연입니다. 성장 그리고 면역을 유지하는 데 아주 중요한 성분인데요. 부족하게 되면 성장이 늘어질 수가 있습니다. 세포들을 잘 자라게 하고 면역력을 높여 줍니다." },
  { id: "c6", start: 49.0, end: 56.6, text: "칼슘과 함께 영양제 속 아르기닌, 마그네슘, 아연 이 세 가지 성분이 있는지 꼭 확인해 주세요." },
];

if (!API_KEY || !VOICE_ID) { console.error("❌ ELEVEN_API_KEY + ELEVEN_VOICE_ID 필요"); process.exit(1); }

function wavDur(path) { return (readFileSync(path).length - 44) / (44100 * 2); }

async function tts(text, outRaw) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST", headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0, use_speaker_boost: true } }),
  });
  if (!res.ok) throw new Error(`tts ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const tmp = outRaw + ".mp3";
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  execFileSync("ffmpeg", ["-y", "-i", tmp, "-ar", "44100", "-ac", "1", outRaw], { stdio: "ignore" });
  rmSync(tmp, { force: true });
}

function fitToSlot(rawWav, outWav, targetSec) {
  const nat = wavDur(rawWav);
  const factor = Math.max(1, nat / targetSec); // 길면 가속, 짧으면 그대로(앞쪽 정렬, 뒤 무음)
  if (factor <= 1.001) { execFileSync("ffmpeg", ["-y", "-i", rawWav, outWav], { stdio: "ignore" }); return { nat, factor: 1 }; }
  // atempo 0.5~2.0; factor>2 면 체인
  const tempos = [];
  let f = factor; while (f > 2.0) { tempos.push(2.0); f /= 2.0; } tempos.push(f);
  const filt = tempos.map((t) => `atempo=${t.toFixed(4)}`).join(",");
  execFileSync("ffmpeg", ["-y", "-i", rawWav, "-filter:a", filt, outWav], { stdio: "ignore" });
  return { nat, factor };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`🎙️  sync-ko voice=${VOICE_ID} model=${MODEL}`);
  const manifest = [];
  for (const c of CHUNKS) {
    process.stdout.write(`  ${c.id} (slot ${(c.end - c.start).toFixed(1)}s) … `);
    const raw = join(OUT_DIR, `${c.id}.raw.wav`);
    const out = join(OUT_DIR, `${c.id}.wav`);
    try {
      await tts(c.text, raw);
      const { nat, factor } = fitToSlot(raw, out, c.end - c.start);
      rmSync(raw, { force: true });
      const dur = wavDur(out);
      manifest.push({ id: c.id, startFrame: Math.round(c.start * FPS), durFrames: Math.round(dur * FPS), natSec: +nat.toFixed(2), factor: +factor.toFixed(3) });
      console.log(`ok (nat ${nat.toFixed(1)}s → ${dur.toFixed(1)}s, x${factor.toFixed(2)})`);
    } catch (e) { console.log("FAIL"); console.error(e.message); process.exitCode = 1; }
    await new Promise((r) => setTimeout(r, 300));
  }
  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify({ fps: FPS, totalFrames: Math.round(56.6 * FPS), chunks: manifest }, null, 2));
  console.log(`\n📁 ${OUT_DIR}\n📄`, JSON.stringify(manifest));
}
main();
