// 치료사례 스토리 릴스 나레이션 TTS — 원장 클론(ko, multilingual_v2)
//   node scripts/gen-tts-casestory.mjs <slug>     (기본 siyun)
// 키: remotion/.env (ELEVEN_API_KEY, ELEVEN_VOICE_ID). 출력: public/audio/casestory/<slug>/{n1..}.wav + timing.json
import { writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
try { process.loadEnvFile(join(ROOT, ".env")); } catch {}
const API_KEY = process.env.ELEVEN_API_KEY, VOICE = process.env.ELEVEN_VOICE_ID;
if (!API_KEY || !VOICE) { console.error("❌ ELEVEN_API_KEY + ELEVEN_VOICE_ID 필요 (.env)"); process.exit(1); }
const MODEL = "eleven_multilingual_v2", STAB = 0.8, SIM = 0.8, STYLE_V = 0, SPEED = 1, FPS = 30;

const SCRIPTS = {
  // 숫자는 TTS 오발음 방지 위해 한글로 풀어 적음(화면 자막은 컴포넌트에서 173.5cm 등 그대로).
  siyun: [
    { id: "b1", text: "열한 살 반 시윤이는, 뼈나이가 실제 나이보다 두 해 가까이 앞서 있었습니다. 성장판이 닫히기 전에, 시간을 벌어야 했습니다." },
    { id: "b2", text: "검사할 때마다 신호가 번갈아 올라왔습니다. 철분이 부족했고, 사춘기 호르몬이 고개를 들었고, 갑상선도 흔들렸지요. 저는 사춘기 속도를 지키면서, 식단과 수면을 다시 조였습니다." },
    { id: "b3", text: "신호가 제자리를 찾자, 반년 만에 칠 센티미터 가까이 자랐습니다." },
    { id: "b4", text: "가장 큰 변화는 뼈나이였습니다. 실제 나이보다 두 해 가까이 앞서 달리던 뼈나이가, 지금은 오히려 두 살 어립니다. 자랄 시간을 그만큼 돌려받은 겁니다." },
    { id: "b5", text: "열네 살 반, 지금 키는 백칠십삼 점 오 센티미터. 갱신된 예상 성인키는 백팔십팔 점 오 센티미터, 처음보다 이십 센티미터 넘게 올라왔습니다. 시윤이는, 지금도 자라고 있습니다." },
    { id: "b6", text: "이런 아이들의 이야기, 더 보고 싶으시다면, 지금 홈페이지에서 확인해 보세요." },
  ],
};

const slug = process.argv[2] || "siyun";
const chunks = SCRIPTS[slug];
if (!chunks) { console.error("no script for", slug); process.exit(1); }
const OUT = join(ROOT, "public", "audio", "casestory", slug);
mkdirSync(OUT, { recursive: true });

const cleanForTTS = (s) => String(s).replace(/[“”‘’"]/g, "").replace(/\s*[—–]\s*/g, " ").replace(/\s{2,}/g, " ").trim();
const wavDur = (p) => (readFileSync(p).length - 44) / (44100 * 2);

async function tts(text, outRaw) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`;
  const res = await fetch(url, { method: "POST", headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: STAB, similarity_boost: SIM, style: STYLE_V, use_speaker_boost: true, speed: SPEED } }) });
  if (!res.ok) throw new Error(`tts ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const tmp = outRaw + ".mp3";
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  execFileSync("ffmpeg", ["-y", "-i", tmp, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1", outRaw], { stdio: "ignore" });
  rmSync(tmp, { force: true });
}

console.log(`🎙️  casestory/${slug}  voice=${VOICE}`);
const timing = [];
for (const c of chunks) {
  process.stdout.write(`  ${c.id} … `);
  const raw = join(OUT, `${c.id}.raw.wav`), out = join(OUT, `${c.id}.wav`);
  await tts(cleanForTTS(c.text), raw);
  execFileSync("ffmpeg", ["-y", "-i", raw, "-af",
    "silenceremove=start_periods=1:start_silence=0.08:start_threshold=-40dB:detection=peak,areverse,silenceremove=start_periods=1:start_silence=0.08:start_threshold=-40dB:detection=peak,areverse",
    out], { stdio: "ignore" });
  rmSync(raw, { force: true });
  const dur = wavDur(out);
  timing.push({ id: c.id, sec: +dur.toFixed(2), frames: Math.round(dur * FPS) });
  console.log(`ok ${dur.toFixed(2)}s`);
  await new Promise((r) => setTimeout(r, 300));
}
writeFileSync(join(OUT, "timing.json"), JSON.stringify(timing, null, 2));
console.log(`📁 ${OUT}\n📄 timing:`, timing.map((t) => `${t.id}=${t.sec}s`).join("  "), `(total ${timing.reduce((n, t) => n + t.sec, 0).toFixed(1)}s)`);
