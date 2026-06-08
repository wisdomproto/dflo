// 연속 대사 TTS — 한 컷의 여러 줄을 "한 사람 목소리"로 일관되게 생성.
// ElevenLabs previous_request_ids(스티칭) + previous/next_text(운율 연결) 사용.
//   node scripts/gen-tts-seq.mjs <linesFile> <outPrefix> [lang]
//   linesFile: 한 줄 = 한 출력 클립. 빈 줄 무시.
//   출력: <outPrefix>01.mp3, 02.mp3, ...  (목소리 일관)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
try { process.loadEnvFile(join(ROOT, '.env')); } catch {}

const API_KEY = process.env.ELEVEN_API_KEY;
const VOICE_ID = process.env.ELEVEN_VOICE_ID;
const [linesFile, outPrefix, lang = 'th'] = process.argv.slice(2);
if (!API_KEY || !VOICE_ID) { console.error('❌ ELEVEN_API_KEY + ELEVEN_VOICE_ID 필요'); process.exit(1); }
if (!linesFile || !outPrefix) { console.error('usage: node scripts/gen-tts-seq.mjs <linesFile> <outPrefix> [lang]'); process.exit(1); }

const MODEL = process.env.ELEVEN_MODEL || (lang === 'th' ? 'eleven_turbo_v2_5' : 'eleven_multilingual_v2');
const lines = readFileSync(linesFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);

const prevIds = [];
for (let i = 0; i < lines.length; i++) {
  const body = {
    text: lines[i],
    model_id: MODEL,
    voice_settings: {
      stability: +(process.env.STABILITY ?? 0.7),
      similarity_boost: +(process.env.SIMILARITY ?? 0.85),
      style: +(process.env.STYLE ?? 0.0),
      use_speaker_boost: true,
    },
    previous_request_ids: prevIds.slice(-3),
  };
  if (i > 0) body.previous_text = lines[i - 1];
  if (i < lines.length - 1) body.next_text = lines[i + 1];

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) { console.error(`line ${i + 1} TTS ${res.status}:`, (await res.text()).slice(0, 300)); process.exit(1); }
  const rid = res.headers.get('request-id');
  if (rid) prevIds.push(rid);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = `${outPrefix}${String(i + 1).padStart(2, '0')}.mp3`;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  console.log(`✅ ${out} rid=${rid ? rid.slice(0, 8) : 'none'} ~${(buf.length * 8 / 128000).toFixed(1)}s`);
}
