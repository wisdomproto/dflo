// Gemini TTS generator for the KR marketing reel narration.
// Generates one WAV per scene into public/audio/narration/.
//
// Usage (PowerShell):
//   $env:GEMINI_API_KEY="..."; node scripts/gen-tts.mjs
// Optional:
//   $env:TTS_VOICE="Aoede"   # prebuilt Gemini voice (default: Kore)
//   $env:TTS_MODEL="gemini-2.5-flash-preview-tts"
//
// Voices to try (Korean works on all): Kore(firm) Aoede(breezy) Leda(youthful)
//   Zephyr(bright) Puck Charon Fenrir Orus Autonoe Callirrhoe Despina ...
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "audio", "narration");

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const VOICE = process.env.TTS_VOICE || "Kore";
const MODEL = process.env.TTS_MODEL || "gemini-2.5-flash-preview-tts";

// Tone direction prepended to every line (Gemini TTS honours natural-language style).
const STYLE = "따뜻하고 신뢰감 있는 목소리로, 차분하고 또박또박 읽어줘";

// Scene narration. Keep each line ~ scene length. Order matches HeightReelsKRMarketing.
const SCENES = [
  {
    id: "s1",
    text: "우리 아이 키, 걱정되시나요? 제대로 관리하면 아직 충분히 클 수 있습니다.",
  },
  {
    id: "s2",
    text: "한국 강남의 일팔칠 성장클리닉은, 지난 십 년간 전 세계 수많은 아이들의 키를 성공적으로 관리해왔습니다.",
  },
  {
    id: "s3",
    text: "일팔칠 성장클리닉은 아이에 맞춰, 다양한 방면으로 키 성장을 관리합니다.",
  },
  {
    id: "s4",
    text: "수많은 배우와 가수, 운동선수를 꿈꾸는 아이들이 다녀갔습니다.",
  },
  {
    id: "s5",
    text: "우리 아이의 키 성장, 지금 시작하세요. 예측키 무료 측정은 홈페이지에서 가능합니다.",
  },
];

if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY (or GOOGLE_API_KEY) 환경변수가 필요합니다.");
  process.exit(1);
}

// Build a 16-bit PCM mono WAV file from raw little-endian PCM samples.
function pcmToWav(pcm, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// Parse "audio/L16;codec=pcm;rate=24000" → sampleRate
function rateFromMime(mime) {
  const m = /rate=(\d+)/.exec(mime || "");
  return m ? parseInt(m[1], 10) : 24000;
}

async function synth(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: `${STYLE}: ${text}` }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
      },
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}\n${await res.text()}`);
  }
  const json = await res.json();
  const part = json?.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data
  );
  if (!part) {
    throw new Error("응답에 오디오 데이터가 없습니다:\n" + JSON.stringify(json).slice(0, 500));
  }
  const pcm = Buffer.from(part.inlineData.data, "base64");
  const rate = rateFromMime(part.inlineData.mimeType);
  return pcmToWav(pcm, rate);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  // Optional CLI args limit which scenes to (re)generate, e.g. `node gen-tts.mjs s1 s2`.
  const only = process.argv.slice(2).filter((a) => /^s\d+$/.test(a));
  const list = only.length ? SCENES.filter((s) => only.includes(s.id)) : SCENES;
  console.log(
    `🎙️  model=${MODEL}  voice=${VOICE}  scenes=${list.map((s) => s.id).join(",")}`
  );
  for (const sc of list) {
    process.stdout.write(`  ${sc.id} … `);
    try {
      const wav = await synth(sc.text);
      const out = join(OUT_DIR, `${sc.id}.wav`);
      writeFileSync(out, wav);
      const sec = ((wav.length - 44) / (24000 * 2)).toFixed(1);
      console.log(`ok (${sec}s, ${(wav.length / 1024).toFixed(0)}KB)`);
    } catch (e) {
      console.log("FAIL");
      console.error(e.message);
      process.exitCode = 1;
    }
    await new Promise((r) => setTimeout(r, 400)); // gentle rate limit
  }
  console.log(`\n📁 ${OUT_DIR}`);
}

main();
