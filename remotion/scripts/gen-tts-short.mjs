// 쇼츠 다국어 TTS (범용) — src/shorts/<slug>/script.json 읽어 청크별 원장 클론음성 생성
// + 타이밍 JSON(src/shorts/<slug>/timing-<lang>.json) 출력. 음성은 자연속도(narration-driven).
//   node scripts/gen-tts-short.mjs <slug> <lang>      예: menarche th
// 키는 remotion/.env 자동 로드. (ELEVEN_API_KEY, ELEVEN_VOICE_ID)
import { writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
try { process.loadEnvFile(join(ROOT, ".env")); } catch {} // remotion/.env 자동 로드
const API_KEY = process.env.ELEVEN_API_KEY;
const VOICE_ID = process.env.ELEVEN_VOICE_ID;
const FPS = 30;

const slug = process.argv[2];
const lang = process.argv[3];
if (!slug || !lang) { console.error("usage: node scripts/gen-tts-short.mjs <slug> <lang>"); process.exit(1); }
if (!API_KEY || !VOICE_ID) { console.error("❌ ELEVEN_API_KEY + ELEVEN_VOICE_ID 필요 (.env)"); process.exit(1); }

// th 는 turbo_v2_5(태국어 지원), 그 외(ko/en/vi/zh)는 multilingual_v2
const MODEL = process.env.ELEVEN_MODEL || (lang === "th" ? "eleven_turbo_v2_5" : "eleven_multilingual_v2");
const SHORT_DIR = join(ROOT, "src", "shorts", slug);
const script = JSON.parse(readFileSync(join(SHORT_DIR, "script.json"), "utf8"));
const OUT_DIR = join(ROOT, "public", "audio", "shorts", slug, lang);

const wavDur = (p) => (readFileSync(p).length - 44) / (44100 * 2);

async function tts(text, outRaw) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text, model_id: MODEL,
      voice_settings: { stability: +(process.env.STABILITY ?? 0.8), similarity_boost: +(process.env.SIMILARITY ?? 0.8), style: +(process.env.STYLE ?? 0), use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`tts ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const tmp = outRaw + ".mp3";
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  // loudnorm: 클립 간 음량 일정 (마지막 청크 작아짐 방지)
  execFileSync("ffmpeg", ["-y", "-i", tmp, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1", outRaw], { stdio: "ignore" });
  rmSync(tmp, { force: true });
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`🎙️  ${slug}/${lang}  voice=${VOICE_ID} model=${MODEL} chunks=${script.chunks.length}`);
  const manifest = [];
  for (const c of script.chunks) {
    const text = c[lang];
    if (!text) { console.log(`  ${c.id} — no ${lang} text, skip`); continue; }
    process.stdout.write(`  ${c.id} … `);
    const raw = join(OUT_DIR, `${c.id}.raw.wav`), out = join(OUT_DIR, `${c.id}.wav`);
    try {
      await tts(text, raw);
      execFileSync("ffmpeg", ["-y", "-i", raw, out], { stdio: "ignore" }); // 자연속도 그대로
      rmSync(raw, { force: true });
      const dur = wavDur(out);
      const slot = c.end - c.start;
      manifest.push({ id: c.id, durFrames: Math.round(dur * FPS), origStartF: Math.round(c.start * FPS), rate: +(slot / dur).toFixed(3), natSec: +dur.toFixed(2) });
      console.log(`ok (${dur.toFixed(1)}s, footage rate ${(slot / dur).toFixed(2)})`);
    } catch (e) { console.log("FAIL"); console.error(e.message); process.exitCode = 1; }
    await new Promise((r) => setTimeout(r, 300));
  }
  writeFileSync(join(SHORT_DIR, `timing-${lang}.json`), JSON.stringify(manifest, null, 2));
  const totalF = manifest.reduce((n, m) => n + m.durFrames, 0);
  console.log(`\n📁 ${OUT_DIR}`);
  console.log(`📄 timing-${lang}.json — ${manifest.length} chunks, total ${totalF}f (${(totalF / FPS).toFixed(1)}s)`);
}
main();
