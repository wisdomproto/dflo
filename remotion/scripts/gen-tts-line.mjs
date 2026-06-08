// 단발 대사 TTS — 원장 클론 보이스. ffmpeg 불필요(ElevenLabs mp3 그대로 저장).
//   node scripts/gen-tts-line.mjs <textFile> <outMp3> [lang]
//   키는 remotion/.env 자동 로드 (ELEVEN_API_KEY, ELEVEN_VOICE_ID)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
try { process.loadEnvFile(join(ROOT, '.env')); } catch {}

const API_KEY = process.env.ELEVEN_API_KEY;
const VOICE_ID = process.env.ELEVEN_VOICE_ID;
const [textFile, outMp3, lang = 'th'] = process.argv.slice(2);
if (!API_KEY || !VOICE_ID) { console.error('❌ ELEVEN_API_KEY + ELEVEN_VOICE_ID 필요 (.env)'); process.exit(1); }
if (!textFile || !outMp3) { console.error('usage: node scripts/gen-tts-line.mjs <textFile> <outMp3> [lang]'); process.exit(1); }

const text = readFileSync(textFile, 'utf8').trim();
// th 는 turbo_v2_5(태국어 지원), 그 외는 multilingual_v2
const MODEL = process.env.ELEVEN_MODEL || (lang === 'th' ? 'eleven_turbo_v2_5' : 'eleven_multilingual_v2');

const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
  method: 'POST',
  headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text,
    model_id: MODEL,
    voice_settings: {
      stability: +(process.env.STABILITY ?? 0.5),
      similarity_boost: +(process.env.SIMILARITY ?? 0.85),
      style: +(process.env.STYLE ?? 0.2),
      use_speaker_boost: true,
    },
  }),
});
if (!res.ok) { console.error(`TTS ${res.status}:`, (await res.text()).slice(0, 400)); process.exit(1); }

const buf = Buffer.from(await res.arrayBuffer());
mkdirSync(dirname(outMp3), { recursive: true });
writeFileSync(outMp3, buf);
// mp3 128kbps 기준 대략 길이(초) = bytes*8 / 128000
const approxSec = (buf.length * 8) / 128000;
console.log(`✅ ${outMp3}\n   model=${MODEL} voice=${VOICE_ID} bytes=${buf.length} ~${approxSec.toFixed(1)}s`);
