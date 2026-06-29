// 예측키 계산기 광고(calc-demo-ko) 나레이션 TTS — 원장 클론(ko, multilingual_v2)
//   node scripts/gen-tts-calc.mjs
// 키: remotion/.env (ELEVEN_API_KEY, ELEVEN_VOICE_ID). 출력: public/audio/ads/calc-ko/{n1..n4}.wav
import { writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
try { process.loadEnvFile(join(ROOT, ".env")); } catch {}
const API_KEY = process.env.ELEVEN_API_KEY;
const VOICE = process.env.ELEVEN_VOICE_ID;
if (!API_KEY || !VOICE) { console.error("❌ ELEVEN_API_KEY + ELEVEN_VOICE_ID 필요 (.env)"); process.exit(1); }
const MODEL = "eleven_multilingual_v2", STAB = 0.8, SIM = 0.8, STYLE_V = 0, SPEED = 1;

// 화면 싱크 기준 desired start(초). 실제 배치는 무음 트림 길이 측정 후 mix 단계에서 결정.
const chunks = [
  { id: "n1", text: "우리 아이, 다 크면 키가 몇이나 될까요?" },
  { id: "n2", text: "성별과 생년월일, 지금 키만 입력하면" },
  { id: "n3", text: "국가 성장 표준 데이터를 바탕으로, 성인 예상 키를 알려드립니다." },
  { id: "n4", text: "지금, 무료로 확인해 보세요." },
];
const OUT = join(ROOT, "public", "audio", "ads", "calc-ko");
mkdirSync(OUT, { recursive: true });

function cleanForTTS(s) {
  return String(s).replace(/[“”‘’"]/g, "").replace(/\s*[—–]\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}
const wavDur = (p) => (readFileSync(p).length - 44) / (44100 * 2);

async function tts(text, outRaw) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST", headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: STAB, similarity_boost: SIM, style: STYLE_V, use_speaker_boost: true, speed: SPEED } }),
  });
  if (!res.ok) throw new Error(`tts ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const tmp = outRaw + ".mp3";
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  execFileSync("ffmpeg", ["-y", "-i", tmp, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1", outRaw], { stdio: "ignore" });
  rmSync(tmp, { force: true });
}

console.log(`🎙️  calc-demo-ko narration  voice=${VOICE} model=${MODEL}`);
for (const c of chunks) {
  const text = cleanForTTS(c.text);
  process.stdout.write(`  ${c.id} … `);
  const raw = join(OUT, `${c.id}.raw.wav`), out = join(OUT, `${c.id}.wav`);
  await tts(text, raw);
  execFileSync("ffmpeg", ["-y", "-i", raw, "-af",
    "silenceremove=start_periods=1:start_silence=0.08:start_threshold=-40dB:detection=peak,areverse,silenceremove=start_periods=1:start_silence=0.08:start_threshold=-40dB:detection=peak,areverse",
    out], { stdio: "ignore" });
  rmSync(raw, { force: true });
  console.log(`ok ${wavDur(out).toFixed(2)}s`);
  await new Promise((r) => setTimeout(r, 300));
}
console.log(`📁 ${OUT}`);
