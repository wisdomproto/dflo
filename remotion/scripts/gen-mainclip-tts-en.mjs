// MainClipEN 영어 나레이션 TTS — narration.en.json 의 각 줄을 개별 wav 로 생성.
//   node scripts/gen-mainclip-tts-en.mjs            # 없는 것만 생성
//   node scripts/gen-mainclip-tts-en.mjs --force    # 전부 재생성
//   node scripts/gen-mainclip-tts-en.mjs n01 n05    # 특정 줄만
//
// 엔진 = Gemini TTS (남성 informative 보이스). ★ElevenLabs 는 크레딧 부족으로 미사용
// (2026-07-25 확인: 잔여 1061자 < 필요 2297자 → 절반만 되면 영상 중간에 목소리가 바뀜).
//
// 출력: public/audio/mainclip/en/raw/{id}.wav   — TTS 원본
//       public/audio/mainclip/en/lines.json     — {id, text, from, to, dur} (warp 계획 입력)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
try { process.loadEnvFile(join(ROOT, ".env")); } catch { /* optional */ }

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
const VOICE = process.env.GEMINI_TTS_VOICE || "Charon"; // 남성 informative
if (!KEY) { console.error("GEMINI_API_KEY 필요 (remotion/.env)"); process.exit(1); }

const OUT = join(ROOT, "public/audio/mainclip/en/raw");
mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));

const narration = JSON.parse(readFileSync(join(ROOT, "src/mainclip/narration.en.json"), "utf8"));
const lines = narration.lines.filter((l) => (only.length ? only.includes(l.id) : true));

// PCM16(mono, 24kHz) → WAV 컨테이너
function pcmToWav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// 화자 지시 — 남성 한국인 의사, 차분한 전문가 톤. 문장만 읽고 지시문은 읽지 않게 프롬프트를 분리.
const STYLE = "Read in a calm, warm, professional tone, like a doctor explaining to a parent:";

async function tts(text) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${STYLE} ${text}` }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        },
      }),
    },
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const b64 = j.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error("오디오 없음");
  return pcmToWav(Buffer.from(b64, "base64"));
}

const probe = (f) =>
  parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString().trim());

const out = [];
for (const l of lines) {
  const f = join(OUT, `${l.id}.wav`);
  if (!FORCE && existsSync(f)) {
    console.log(`  skip ${l.id} (있음)`);
  } else {
    for (let attempt = 1; ; attempt++) {
      try {
        writeFileSync(f, await tts(l.text));
        break;
      } catch (e) {
        if (attempt >= 3) throw e;
        console.warn(`  ${l.id} 재시도 ${attempt}: ${e.message}`);
        await new Promise((r) => setTimeout(r, 2500 * attempt));
      }
    }
  }
  const dur = probe(f);
  const win = l.to - l.from;
  const flag = dur > win ? ` ⚠ 윈도우 초과 (+${(dur - win).toFixed(2)}s)` : "";
  console.log(`  ${l.id}  ${dur.toFixed(2)}s / 윈도우 ${win.toFixed(2)}s${flag}`);
  out.push({ id: l.id, text: l.text, from: l.from, to: l.to, dur });
}

if (!only.length) {
  writeFileSync(join(ROOT, "public/audio/mainclip/en/lines.json"), JSON.stringify(out, null, 2));
  const over = out.filter((o) => o.dur > o.to - o.from);
  console.log(`\n총 ${out.length}줄 · 윈도우 초과 ${over.length}줄`);
  if (over.length) console.log("  초과:", over.map((o) => `${o.id}(+${(o.dur - (o.to - o.from)).toFixed(2)}s)`).join(", "));
}
