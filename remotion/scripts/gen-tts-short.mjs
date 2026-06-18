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

// 언어별 보이스/모델/세팅 — ko=원장 클론(ELEVEN_VOICE_ID·multilingual_v2·높은 similarity로 음색 추종),
// 비ko=네이티브 보이스(ELEVEN_VOICE_ID_<LANG>·eleven_v3·낮은 similarity로 자연스럽게). 전부 언어별 env 오버라이드 가능.
const LANG = lang.toUpperCase();
const isKo = lang === "ko";
const VOICE = process.env["ELEVEN_VOICE_ID_" + LANG] || VOICE_ID;
const MODEL = process.env["ELEVEN_MODEL_" + LANG] || process.env.ELEVEN_MODEL || (isKo ? "eleven_multilingual_v2" : "eleven_v3");
const STAB = +(process.env["STABILITY_" + LANG] ?? process.env.STABILITY ?? (isKo ? 0.8 : 0.4));
const SIM = +(process.env["SIMILARITY_" + LANG] ?? process.env.SIMILARITY ?? (isKo ? 0.8 : 0.2));
const STYLE_V = +(process.env["STYLE_" + LANG] ?? process.env.STYLE ?? 0);
if (!isKo && VOICE === VOICE_ID) console.warn(`⚠️  ${lang}: ELEVEN_VOICE_ID_${LANG} 미설정 — 원장 클론으로 폴백(외국어는 네이티브 보이스 권장)`);
const SHORT_DIR = join(ROOT, "src", "shorts", slug);
const script = JSON.parse(readFileSync(join(SHORT_DIR, "script.json"), "utf8"));
const OUT_DIR = join(ROOT, "public", "audio", "shorts", slug, lang);

const wavDur = (p) => (readFileSync(p).length - 44) / (44100 * 2);

async function tts(text, outRaw) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text, model_id: MODEL,
      voice_settings: { stability: STAB, similarity_boost: SIM, style: STYLE_V, use_speaker_boost: true },
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
  console.log(`🎙️  ${slug}/${lang}  voice=${VOICE} model=${MODEL} stab=${STAB} sim=${SIM} chunks=${script.chunks.length}`);
  const manifest = [];
  for (const c of script.chunks) {
    const text = c[lang];
    if (!text) { console.log(`  ${c.id} — no ${lang} text, skip`); continue; }
    process.stdout.write(`  ${c.id} … `);
    const raw = join(OUT_DIR, `${c.id}.raw.wav`), out = join(OUT_DIR, `${c.id}.wav`);
    try {
      await tts(text, raw);
      // 앞뒤 무음 트림(0.08s 패딩 유지) — ElevenLabs 가 간혹 긴 선행 정적을 생성해 음성 갭이 생기는 것 방지.
      execFileSync("ffmpeg", ["-y", "-i", raw, "-af",
        "silenceremove=start_periods=1:start_silence=0.08:start_threshold=-40dB:detection=peak,areverse,silenceremove=start_periods=1:start_silence=0.08:start_threshold=-40dB:detection=peak,areverse",
        out], { stdio: "ignore" });
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
